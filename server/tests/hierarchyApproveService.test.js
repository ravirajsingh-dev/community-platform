const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeBulkApproveIds,
  buildApproveSuccessMessage,
  buildBulkApproveSuccessMessage,
  validateParentChainForApprove,
  activateEntity,
  approveWithParents,
  bulkApproveWithParents,
} = require("../utils/hierarchyApproveService");
const { HIERARCHY_ENTITIES } = require("../config/hierarchyEntityConfig");

function createMockModel(store) {
  return {
    findOne: async (query) => {
      const id = String(query._id);
      const entity = store.get(id);
      if (!entity || entity.isDeleted) return null;
      return entity;
    },
  };
}

function createPendingEntity(id, name, extra = {}) {
  return {
    _id: id,
    name,
    status: "pending",
    isActive: false,
    isDeleted: false,
    save: async function save() {
      return this;
    },
    ...extra,
  };
}

describe("hierarchyApproveService", () => {
  it("normalizeBulkApproveIds rejects non-array input", () => {
    const result = normalizeBulkApproveIds("bad");
    assert.equal(result.ok, false);
  });

  it("normalizeBulkApproveIds deduplicates valid ids", () => {
    const id = "507f1f77bcf86cd799439011";
    const result = normalizeBulkApproveIds([id, id, ` ${id} `]);
    assert.equal(result.ok, true);
    assert.deepEqual(result.ids, [id]);
  });

  it("normalizeBulkApproveIds rejects invalid object ids", () => {
    const result = normalizeBulkApproveIds(["not-an-id"]);
    assert.equal(result.ok, false);
    assert.ok(result.invalidIds);
  });

  it("buildApproveSuccessMessage includes auto-approved parent count", () => {
    const config = HIERARCHY_ENTITIES.gotra;
    const message = buildApproveSuccessMessage(config, [
      { level: "khamp", _id: "1", name: "K1" },
      { level: "kul", _id: "2", name: "KUL1" },
    ]);
    assert.match(message, /2 parents auto-approved/);
  });

  it("buildBulkApproveSuccessMessage reports partial failures", () => {
    const config = HIERARCHY_ENTITIES.vansh;
    const message = buildBulkApproveSuccessMessage(config, 2, 1);
    assert.match(message, /2 vansh\(s\) approved, 1 failed/);
  });

  it("activateEntity sets active status flags", () => {
    const entity = { status: "pending", isActive: false };
    activateEntity(entity);
    assert.equal(entity.status, "active");
    assert.equal(entity.isActive, true);
  });

  it("validateParentChainForApprove blocks rejected parent", async () => {
    const rejectedParentId = "507f1f77bcf86cd799439011";
    const entity = { khampId: rejectedParentId };
    const parentApprovalChain = [
      {
        level: "khamp",
        field: "khampId",
        model: {
          findOne: async () => ({
            _id: rejectedParentId,
            status: "rejected",
            isDeleted: false,
          }),
        },
      },
    ];

    const result = await validateParentChainForApprove(
      entity,
      parentApprovalChain,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "PARENT_REJECTED");
  });

  it("validateParentChainForApprove passes active parent", async () => {
    const parentId = "507f1f77bcf86cd799439011";
    const entity = { communityId: parentId };
    const parentApprovalChain = [
      {
        level: "community",
        field: "communityId",
        model: {
          findOne: async () => ({
            _id: parentId,
            status: "active",
            isDeleted: false,
          }),
        },
      },
    ];

    const result = await validateParentChainForApprove(
      entity,
      parentApprovalChain,
    );
    assert.equal(result.ok, true);
  });

  it("gotra parentApprovalChain walks kul to community", () => {
    const chain = HIERARCHY_ENTITIES.gotra.parentApprovalChain;
    assert.deepEqual(
      chain.map((item) => item.level),
      ["kul", "vansh", "community"],
    );
  });

  it("community has empty parent approval chain", () => {
    assert.deepEqual(HIERARCHY_ENTITIES.community.parentApprovalChain, []);
  });

  it("approveWithParents auto-approves pending parents when gotra is approved", async () => {
    const ids = {
      community: "507f1f77bcf86cd799439011",
      vansh: "507f1f77bcf86cd799439012",
      kul: "507f1f77bcf86cd799439013",
      gotra: "507f1f77bcf86cd799439015",
    };

    const store = new Map([
      [ids.community, createPendingEntity(ids.community, "Community A")],
      [
        ids.vansh,
        createPendingEntity(ids.vansh, "Vansh A", {
          communityId: ids.community,
        }),
      ],
      [
        ids.kul,
        createPendingEntity(ids.kul, "Kul A", {
          communityId: ids.community,
          vanshId: ids.vansh,
        }),
      ],
      [
        ids.gotra,
        createPendingEntity(ids.gotra, "Gotra A", {
          communityId: ids.community,
          vanshId: ids.vansh,
          kulId: ids.kul,
        }),
      ],
    ]);

    const gotraConfig = {
      ...HIERARCHY_ENTITIES.gotra,
      model: createMockModel(store),
      parentApprovalChain: HIERARCHY_ENTITIES.gotra.parentApprovalChain.map(
        (item) => ({
          ...item,
          model: createMockModel(store),
        }),
      ),
    };

    const result = await approveWithParents(gotraConfig, ids.gotra);

    assert.equal(result.ok, true);
    assert.equal(result.entity.status, "active");
    assert.equal(result.autoApprovedParents.length, 3);
    assert.equal(store.get(ids.community).status, "active");
    assert.equal(store.get(ids.vansh).status, "active");
    assert.equal(store.get(ids.kul).status, "active");
  });

  it("bulkApproveWithParents approves multiple pending gotras independently", async () => {
    const communityId = "507f1f77bcf86cd799439011";
    const kulId = "507f1f77bcf86cd799439013";
    const gotraA = "507f1f77bcf86cd799439015";
    const gotraB = "507f1f77bcf86cd799439016";

    const store = new Map([
      [communityId, createPendingEntity(communityId, "Community A")],
      [
        kulId,
        createPendingEntity(kulId, "Kul A", {
          communityId,
          status: "active",
          isActive: true,
        }),
      ],
      [
        gotraA,
        createPendingEntity(gotraA, "Gotra A", {
          communityId,
          kulId,
        }),
      ],
      [
        gotraB,
        createPendingEntity(gotraB, "Gotra B", {
          communityId,
          kulId,
        }),
      ],
    ]);

    const gotraConfig = {
      ...HIERARCHY_ENTITIES.gotra,
      model: createMockModel(store),
      parentApprovalChain: [
        {
          level: "kul",
          field: "kulId",
          model: createMockModel(store),
        },
        {
          level: "community",
          field: "communityId",
          model: createMockModel(store),
        },
      ],
    };

    const result = await bulkApproveWithParents(gotraConfig, [gotraA, gotraB]);

    assert.equal(result.ok, true);
    assert.equal(result.summary.approved, 2);
    assert.equal(result.summary.failed, 0);
    assert.equal(store.get(gotraA).status, "active");
    assert.equal(store.get(gotraB).status, "active");
    assert.equal(store.get(communityId).status, "active");
  });
});

