const mongoose = require("mongoose");
const { HIERARCHY_ENTITIES } = require("../config/hierarchyEntityConfig");
const { approveWithParents } = require("./hierarchyApproveService");

const HIERARCHY_LEVELS = [
  { key: "community", permissionModule: "communities" },
  { key: "vansh", permissionModule: "vansh" },
  { key: "kul", permissionModule: "kul" },
  { key: "khamp", permissionModule: "khamp" },
  { key: "subKhamp", permissionModule: "subKhamp" },
  { key: "gotra", permissionModule: "gotra" },
];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getAllowedLevels(userObj, action = "edit") {
  if (!userObj) return [];

  return HIERARCHY_LEVELS.filter(({ permissionModule }) => {
    const permissions = userObj.permissions || {};
    const modulePermission = permissions[permissionModule];

    if (modulePermission === true) return true;
    if (
      typeof modulePermission === "object" &&
      modulePermission !== null &&
      modulePermission[action] === true
    ) {
      return true;
    }
    return false;
  }).map((entry) => entry.key);
}

function buildParentFilters(query = {}) {
  const filters = {};
  const parentParams = [
    "communityId",
    "vanshId",
    "kulId",
    "khampId",
    "subKhampId",
  ];

  for (const param of parentParams) {
    const value = query[param];
    if (value && isValidObjectId(value)) {
      filters[param] = value;
    }
  }

  return filters;
}

function buildChainFromEntity(config, entity) {
  const chain = [];

  for (const parentField of config.adminParentFields || []) {
    const ref = entity[parentField.field];
    if (!ref) continue;

    const name =
      typeof ref === "object" && ref !== null && ref.name ? ref.name : "-";

    chain.push({
      level: parentField.field.replace(/Id$/, ""),
      field: parentField.field,
      name,
    });
  }

  return chain;
}

function formatChainLabel(chain, entityName) {
  if (!chain.length) {
    return entityName;
  }
  return `${chain.map((item) => item.name).join(" → ")} → ${entityName}`;
}

function mapPendingRecord(level, config, entity) {
  const chain = buildChainFromEntity(config, entity);
  const createdBy =
    entity.createdBy && typeof entity.createdBy === "object"
      ? {
          _id: entity.createdBy._id,
          name: entity.createdBy.name || "-",
          memberId: entity.createdBy.memberId || null,
        }
      : null;

  return {
    level,
    levelLabel: config.label,
    id: entity._id,
    name: entity.name,
    status: entity.status,
    chain,
    chainLabel: formatChainLabel(chain, entity.name),
    createdBy,
    createdAt: entity.createdAt,
    permissionModule: HIERARCHY_LEVELS.find((entry) => entry.key === level)
      ?.permissionModule,
  };
}

async function fetchPendingForLevel(levelKey, config, query = {}) {
  const mongoQuery = {
    status: "pending",
    isDeleted: false,
    ...buildParentFilters(query),
  };

  if (query.search && String(query.search).trim()) {
    const term = String(query.search).trim();
    mongoQuery.name = { $regex: term, $options: "i" };
  }

  let findQuery = config.model.find(mongoQuery).sort({ createdAt: -1 });

  if (config.listPopulate?.length) {
    for (const populateField of config.listPopulate) {
      findQuery = findQuery.populate(populateField.path, populateField.select);
    }
  }

  findQuery = findQuery.populate({
    path: "createdBy",
    select: "name memberId",
  });

  const records = await findQuery.lean();
  return records.map((entity) => mapPendingRecord(levelKey, config, entity));
}

async function listPendingApprovals(query = {}, userObj = null, options = {}) {
  const allowedLevels = options.isAdmin
    ? HIERARCHY_LEVELS.map((entry) => entry.key)
    : getAllowedLevels(userObj, "edit");
  const levelFilter = query.level ? String(query.level).trim() : "";

  const levelsToQuery = HIERARCHY_LEVELS.filter(({ key }) => {
    if (!allowedLevels.includes(key)) return false;
    if (levelFilter && levelFilter !== key) return false;
    return true;
  });

  const merged = [];

  for (const { key } of levelsToQuery) {
    const config = HIERARCHY_ENTITIES[key];
    const items = await fetchPendingForLevel(key, config, query);
    merged.push(...items);
  }

  const sortOrder = query.ascending === "asc" ? 1 : -1;
  const orderBy = query.orderBy === "name" ? "name" : "createdAt";

  merged.sort((a, b) => {
    const aVal = orderBy === "name" ? a.name : a.createdAt;
    const bVal = orderBy === "name" ? b.name : b.createdAt;

    if (orderBy === "name") {
      return sortOrder * String(aVal).localeCompare(String(bVal));
    }
    return sortOrder * (new Date(aVal) - new Date(bVal));
  });

  const pageSize = Math.min(parseInt(query.limit, 10) || 10, 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const skip = pageSize * (page - 1);
  const data = merged.slice(skip, skip + pageSize);

  return {
    data,
    count: merged.length,
    metadata: {
      current_page: page,
      per_page: pageSize,
      totalRecord: merged.length,
    },
  };
}

async function bulkApprovePendingItems(items = [], userObj = null, options = {}) {
  const allowedLevels = options.isAdmin
    ? HIERARCHY_LEVELS.map((entry) => entry.key)
    : getAllowedLevels(userObj, "edit");
  const approved = [];
  const failed = [];

  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      statusCode: 400,
      message: "At least one pending item is required",
      approved,
      failed,
      summary: { approved: 0, failed: 0 },
    };
  }

  for (const item of items) {
    const level = item?.level;
    const id = item?.id;

    if (!level || !id || !isValidObjectId(id)) {
      failed.push({
        level,
        id,
        message: "Invalid pending item",
      });
      continue;
    }

    if (!allowedLevels.includes(level)) {
      failed.push({
        level,
        id,
        message: `No permission to approve ${level}`,
      });
      continue;
    }

    const config = HIERARCHY_ENTITIES[level];
    if (!config) {
      failed.push({
        level,
        id,
        message: "Unknown hierarchy level",
      });
      continue;
    }

    const result = await approveWithParents(config, id);
    if (!result.ok) {
      failed.push({
        level,
        id,
        message: result.message,
      });
      continue;
    }

    approved.push({
      level,
      id,
      entity: result.entity,
      autoApprovedParents: result.autoApprovedParents,
    });
  }

  return {
    ok: true,
    approved,
    failed,
    summary: {
      approved: approved.length,
      failed: failed.length,
    },
  };
}

module.exports = {
  HIERARCHY_LEVELS,
  getAllowedLevels,
  listPendingApprovals,
  bulkApprovePendingItems,
  buildChainFromEntity,
  formatChainLabel,
};
