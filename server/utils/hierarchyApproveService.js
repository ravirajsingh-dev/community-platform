const mongoose = require("mongoose");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function activateEntity(entity) {
  entity.status = "active";
  entity.isActive = true;
}

function toParentSummary(level, parent) {
  return {
    level,
    _id: parent._id,
    name: parent.name,
  };
}

/**
 * Validate parent chain before approving a hierarchy entity.
 * @returns {{ ok: true } | { ok: false, code: string, message: string, statusCode: number }}
 */
async function validateParentChainForApprove(entity, parentApprovalChain = []) {
  for (const chainItem of parentApprovalChain) {
    const parentId = entity[chainItem.field];

    if (!parentId || !isValidObjectId(parentId)) {
      return {
        ok: false,
        code: "PARENT_INVALID",
        message: `Cannot approve: parent ${chainItem.level} is missing`,
        statusCode: 400,
      };
    }

    const parent = await chainItem.model.findOne({
      _id: parentId,
      isDeleted: false,
    });

    if (!parent) {
      return {
        ok: false,
        code: "PARENT_DELETED",
        message: `Cannot approve: parent ${chainItem.level} is deleted or not found`,
        statusCode: 400,
      };
    }

    if (parent.status === "rejected") {
      return {
        ok: false,
        code: "PARENT_REJECTED",
        message: `Cannot approve: parent ${chainItem.level} is rejected`,
        statusCode: 400,
      };
    }
  }

  return { ok: true };
}

/**
 * Auto-approve pending parents walking from immediate parent to root.
 */
async function autoApprovePendingParents(entity, parentApprovalChain = []) {
  const autoApprovedParents = [];
  const warnings = [];

  for (const chainItem of parentApprovalChain) {
    const parentId = entity[chainItem.field];
    const parent = await chainItem.model.findOne({
      _id: parentId,
      isDeleted: false,
    });

    if (!parent) {
      warnings.push({
        level: chainItem.level,
        _id: parentId,
        message: `Parent ${chainItem.level} was not found during auto-approve`,
      });
      continue;
    }

    if (parent.status === "rejected") {
      warnings.push({
        level: chainItem.level,
        _id: parent._id,
        message: `Parent ${chainItem.level} is rejected and was not auto-approved`,
      });
      continue;
    }

    if (parent.status === "pending") {
      activateEntity(parent);
      await parent.save();
      autoApprovedParents.push(toParentSummary(chainItem.level, parent));
    }
  }

  return { autoApprovedParents, warnings };
}

/**
 * Approve entity and auto-approve pending parents in the chain.
 */
async function approveWithParents(config, entityId) {
  const { model, parentApprovalChain = [] } = config;

  if (!isValidObjectId(entityId)) {
    return {
      ok: false,
      code: "INVALID_ID",
      message: `Invalid ${config.label.toLowerCase()} ID`,
      statusCode: 400,
    };
  }

  const entity = await model.findOne({
    _id: entityId,
    isDeleted: false,
  });

  if (!entity) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `${config.label} not found`,
      statusCode: 404,
    };
  }

  if (entity.status === "active") {
    return {
      ok: false,
      code: "ALREADY_APPROVED",
      message: config.alreadyApprovedMessage,
      statusCode: 400,
    };
  }

  const parentValidation = await validateParentChainForApprove(
    entity,
    parentApprovalChain,
  );
  if (!parentValidation.ok) {
    return { ok: false, ...parentValidation };
  }

  activateEntity(entity);
  await entity.save();

  const { autoApprovedParents, warnings } = await autoApprovePendingParents(
    entity,
    parentApprovalChain,
  );

  return {
    ok: true,
    entity,
    autoApprovedParents,
    warnings,
  };
}

function buildApproveSuccessMessage(config, autoApprovedParents = []) {
  const count = autoApprovedParents.length;
  if (count === 0) {
    return config.approveSuccessMessage;
  }

  const parentLabel = count === 1 ? "parent" : "parents";
  return `${config.label} approved. ${count} ${parentLabel} auto-approved.`;
}

function buildBulkApproveSuccessMessage(config, approvedCount, failedCount) {
  if (failedCount === 0) {
    return `${approvedCount} ${config.label.toLowerCase()}(s) approved successfully`;
  }
  return `${approvedCount} ${config.label.toLowerCase()}(s) approved, ${failedCount} failed`;
}

function normalizeBulkApproveIds(ids) {
  if (!Array.isArray(ids)) {
    return { ok: false, message: "ids must be an array" };
  }

  const uniqueIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { ok: false, message: "At least one id is required" };
  }

  const invalidIds = uniqueIds.filter((id) => !isValidObjectId(id));
  if (invalidIds.length > 0) {
    return {
      ok: false,
      message: "All ids must be valid MongoDB ObjectIds",
      invalidIds,
    };
  }

  return { ok: true, ids: uniqueIds };
}

/**
 * Bulk approve multiple entities; each runs approveWithParents independently.
 */
async function bulkApproveWithParents(config, ids) {
  const normalized = normalizeBulkApproveIds(ids);
  if (!normalized.ok) {
    return { ok: false, ...normalized, statusCode: 400 };
  }

  const approved = [];
  const failed = [];

  for (const id of normalized.ids) {
    const result = await approveWithParents(config, id);
    if (result.ok) {
      approved.push({
        id,
        entity: result.entity,
        autoApprovedParents: result.autoApprovedParents,
        warnings: result.warnings,
      });
    } else {
      failed.push({
        id,
        code: result.code,
        message: result.message,
      });
    }
  }

  return {
    ok: true,
    approved,
    failed,
    summary: {
      requested: normalized.ids.length,
      approved: approved.length,
      failed: failed.length,
    },
  };
}

module.exports = {
  approveWithParents,
  bulkApproveWithParents,
  validateParentChainForApprove,
  autoApprovePendingParents,
  buildApproveSuccessMessage,
  buildBulkApproveSuccessMessage,
  normalizeBulkApproveIds,
  activateEntity,
};
