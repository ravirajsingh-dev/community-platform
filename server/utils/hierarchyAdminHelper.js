const mongoose = require("mongoose");
const response = require("../config/response");
const {
  applyHierarchyDropdownFilters,
  finalizeDropdownQuery,
} = require("./dropdownListHelper");
const { cleanupUserDetailsRefs } = require("./hierarchyUserDetailsCleanup");
const {
  approveWithParents,
  bulkApproveWithParents,
  buildApproveSuccessMessage,
  buildBulkApproveSuccessMessage,
} = require("./hierarchyApproveService");

const VALID_ADMIN_STATUSES = ["active", "inactive", "pending", "rejected"];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeName(name) {
  return name.trim().toUpperCase();
}

function parseIsActive(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  return value === "true" || value === true;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function invalidIdMessage(label) {
  return `Invalid ${label.toLowerCase()} ID`;
}

function notFoundMessage(label) {
  return `${label} not found`;
}

function buildDuplicateQuery(config, nameUpper, scopeValues = {}, excludeId) {
  const query = {
    name: { $regex: new RegExp(`^${escapeRegex(nameUpper)}$`, "i") },
    isDeleted: false,
  };

  for (const field of config.duplicateScopeFields) {
    if (scopeValues[field] !== undefined) {
      query[field] = scopeValues[field];
    }
  }

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return query;
}

function resolveCreateStatus(statusInput, isActiveInput) {
  const statusValue =
    statusInput !== undefined && statusInput !== null
      ? String(statusInput).trim()
      : null;

  if (statusValue === "inactive") {
    return { status: "active", isActive: false };
  }

  if (statusValue && ["pending", "rejected"].includes(statusValue)) {
    return { status: statusValue, isActive: false };
  }

  if (statusValue === "active") {
    return { status: "active", isActive: true };
  }

  return {
    status: "active",
    isActive: parseIsActive(isActiveInput, true),
  };
}

/**
 * Apply Village-style status updates to hierarchy entities.
 * inactive maps to isActive=false; active sets status=active and isActive=true.
 * @returns {{ error?: object, cascadeInactive?: boolean, cascadeActive?: boolean }}
 */
function applyHierarchyStatusUpdate(entity, statusInput) {
  const nextStatus = String(statusInput).trim();

  if (!VALID_ADMIN_STATUSES.includes(nextStatus)) {
    return {
      error: {
        errors: [{ path: "status", msg: "Invalid status" }],
        message: "Validation Error",
        statusCode: 400,
      },
    };
  }

  const previousIsActive = entity.isActive;

  if (nextStatus === "inactive") {
    entity.isActive = false;
    return {
      cascadeInactive:
        entity.isActive !== previousIsActive && previousIsActive === true,
    };
  }

  if (nextStatus === "active") {
    entity.status = "active";
    entity.isActive = true;
    return {
      cascadeActive:
        entity.isActive !== previousIsActive || entity.status !== "active",
    };
  }

  entity.status = nextStatus;
  entity.isActive = nextStatus === "active";

  return { cascadeInactive: false, cascadeActive: false };
}

async function validateAdminParentFields(body, parentFields) {
  const scopeValues = {};

  for (const parentField of parentFields) {
    const value = body[parentField.field];

    if (!value || !isValidObjectId(value)) {
      return {
        ok: false,
        response: {
          errors: [
            {
              path: parentField.field,
              msg: `Valid ${parentField.label.toLowerCase()} is required`,
            },
          ],
          message: "Validation Error",
          statusCode: 400,
        },
      };
    }

    const matchQuery = {
      _id: value,
      isDeleted: false,
    };

    if (parentField.mustMatch) {
      for (const [parentKey, bodyKey] of Object.entries(parentField.mustMatch)) {
        const matchValue = body[bodyKey];
        if (!matchValue || !isValidObjectId(matchValue)) {
          return {
            ok: false,
            response: {
              errors: [
                {
                  path: bodyKey,
                  msg: `Valid ${bodyKey} is required`,
                },
              ],
              message: "Validation Error",
              statusCode: 400,
            },
          };
        }
        matchQuery[parentKey] = matchValue;
      }
    }

    const parentDoc = await parentField.model.findOne(matchQuery);

    if (!parentDoc) {
      return {
        ok: false,
        response: {
          errors: [
            {
              path: parentField.field,
              msg: parentField.notFoundMessage,
            },
          ],
          message: "Validation Error",
          statusCode: 400,
        },
      };
    }

    scopeValues[parentField.field] = value;
  }

  return { ok: true, scopeValues };
}

async function applyParentUpdates(entity, body, config) {
  const parentFields = config.adminParentFields || [];
  if (!parentFields.length) return null;

  for (const parentField of parentFields) {
    const field = parentField.field;
    if (body[field] === undefined) continue;

    if (!isValidObjectId(body[field])) {
      return {
        errors: [
          {
            path: field,
            msg: `Valid ${parentField.label.toLowerCase()} is required`,
          },
        ],
        message: "Validation Error",
        statusCode: 400,
      };
    }

    const matchQuery = {
      _id: body[field],
      isDeleted: false,
    };

    if (parentField.mustMatch) {
      for (const [parentKey, bodyOrEntityKey] of Object.entries(
        parentField.mustMatch,
      )) {
        const matchValue =
          body[bodyOrEntityKey] !== undefined
            ? body[bodyOrEntityKey]
            : entity[bodyOrEntityKey];
        if (!matchValue || !isValidObjectId(matchValue)) {
          return {
            errors: [
              {
                path: bodyOrEntityKey,
                msg: `Valid ${bodyOrEntityKey} is required`,
              },
            ],
            message: "Validation Error",
            statusCode: 400,
          };
        }
        matchQuery[parentKey] = matchValue;
      }
    }

    const parentDoc = await parentField.model.findOne(matchQuery);
    if (!parentDoc) {
      return {
        errors: [
          {
            path: field,
            msg: parentField.notFoundMessage,
          },
        ],
        message: "Validation Error",
        statusCode: 400,
      };
    }

    entity[field] = body[field];
  }

  return null;
}

function getDuplicateScopeFromEntity(config, entity, body = {}) {
  const scope = {};
  for (const field of config.duplicateScopeFields) {
    scope[field] =
      body[field] !== undefined && body[field] !== null
        ? body[field]
        : entity[field];
  }
  return scope;
}

async function runActiveCascade(config, entityId, cascadeType) {
  if (!config.cascadeOnActiveChange || !config.cascade) return;

  if (cascadeType === "inactive" && config.cascade.inactive) {
    await config.cascade.inactive(entityId);
  } else if (cascadeType === "active" && config.cascade.active) {
    await config.cascade.active(entityId);
  }
}

/**
 * Factory for admin hierarchy CRUD controllers (Village pattern).
 * @param {object} config - Entry from HIERARCHY_ENTITIES
 * @returns {Record<string, Function>} Named handlers matching route exports
 */
function createHierarchyController(config) {
  const { model, label, exports: exportNames } = config;
  const labelLower = label.toLowerCase();

  const create = async (req, res) => {
    try {
      const { name, description, isActive, status: statusInput } = req.body;

      const parentValidation = await validateAdminParentFields(
        req.body,
        config.adminParentFields || [],
      );
      if (!parentValidation.ok) {
        const { errors, message, statusCode } = parentValidation.response;
        return response.errorResponse(res, errors, message, statusCode);
      }

      if (!name || !name.trim()) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Name is required" }],
          "Validation Error",
          400,
        );
      }

      const nameUpper = normalizeName(name);
      const duplicateQuery = buildDuplicateQuery(
        config,
        nameUpper,
        parentValidation.scopeValues || {},
      );
      const existing = await model.findOne(duplicateQuery);

      if (existing) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: config.duplicateMessage }],
          "Validation Error",
          400,
        );
      }

      const { status, isActive: resolvedIsActive } = resolveCreateStatus(
        statusInput,
        isActive,
      );
      const adminId = req.admin?.id;
      const entity = new model({
        name: nameUpper,
        description: description ? description.trim() : "",
        status,
        createdBy: adminId,
        isActive: resolvedIsActive,
        ...(parentValidation.scopeValues || {}),
      });

      await entity.save();

      return response.successResponse(
        res,
        entity,
        config.createSuccessMessage,
      );
    } catch (error) {
      console.error(`Error creating ${labelLower}:`, error);
      if (error.code === 11000) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: config.duplicateMessage }],
          "Validation Error",
          400,
        );
      }
      return response.errorResponse(
        res,
        {},
        error.message || `Failed to create ${labelLower}`,
        500,
      );
    }
  };

  const list = async (req, res) => {
    try {
      const {
        limit = 10,
        page = 1,
        orderBy = "createdAt",
        ascending = "desc",
        search = "",
      } = req.query;

      const pageSize = Math.min(parseInt(limit, 10), 100);
      const skip = pageSize * (page - 1);
      const sortOrder = ascending === "desc" ? -1 : 1;
      const query = { isDeleted: false };

      for (const param of config.listFilterParams) {
        const value = req.query[param];
        if (value && isValidObjectId(value)) {
          query[param] = value;
        }
      }

      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search.trim(), $options: "i" } },
          { description: { $regex: search.trim(), $options: "i" } },
        ];
      }

      const statusFilter = req.query.status;
      if (statusFilter && String(statusFilter).trim()) {
        const normalizedStatus = String(statusFilter).trim();
        if (normalizedStatus === "inactive") {
          query.status = "active";
          query.isActive = false;
        } else if (normalizedStatus === "active") {
          query.status = "active";
          query.isActive = true;
        } else if (["pending", "rejected"].includes(normalizedStatus)) {
          query.status = normalizedStatus;
        }
      }

      const activeOnly = applyHierarchyDropdownFilters(query, req.query);

      let listQuery = model
        .find(query)
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      if (!activeOnly && config.listPopulate?.length) {
        for (const populateField of config.listPopulate) {
          listQuery = listQuery.populate(populateField.path, populateField.select);
        }
      }

      const [data, totalRecord] = await Promise.all([
        finalizeDropdownQuery(listQuery, activeOnly).lean(),
        model.countDocuments(query),
      ]);

      return response.successResponse(
        res,
        [
          {
            metadata: [
              {
                totalRecord,
                current_page: parseInt(page, 10),
                per_page: pageSize,
              },
            ],
            data,
          },
        ],
        config.listSuccessMessage,
      );
    } catch (error) {
      console.error(`Error fetching ${labelLower} list:`, error);
      return response.errorResponse(
        res,
        {},
        config.listFetchErrorMessage || `Failed to fetch ${labelLower} list`,
        500,
      );
    }
  };

  const getById = async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.errorResponse(res, {}, invalidIdMessage(label), 400);
      }

      let findQuery = model.findById(id);

      if (config.getByIdPopulate?.length) {
        for (const populateField of config.getByIdPopulate) {
          findQuery = findQuery.populate(
            populateField.path,
            populateField.select,
          );
        }
      }

      const entity = await findQuery.lean();

      if (!entity || entity.isDeleted) {
        return response.errorResponse(res, {}, notFoundMessage(label), 404);
      }

      return response.successResponse(
        res,
        entity,
        config.getByIdSuccessMessage,
      );
    } catch (error) {
      console.error(`Error fetching ${labelLower}:`, error);
      return response.errorResponse(
        res,
        {},
        `Failed to fetch ${labelLower}`,
        500,
      );
    }
  };

  const update = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, status } = req.body;

      if (!isValidObjectId(id)) {
        return response.errorResponse(res, {}, invalidIdMessage(label), 400);
      }

      const entity = await model.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!entity) {
        return response.errorResponse(res, {}, notFoundMessage(label), 404);
      }

      const parentError = await applyParentUpdates(entity, req.body, config);
      if (parentError) {
        return response.errorResponse(
          res,
          parentError.errors,
          parentError.message,
          parentError.statusCode,
        );
      }

      if (name !== undefined) {
        if (!name.trim()) {
          return response.errorResponse(
            res,
            [{ path: "name", msg: "Name cannot be empty" }],
            "Validation Error",
            400,
          );
        }

        const nameUpper = normalizeName(name);
        const scope = getDuplicateScopeFromEntity(config, entity, req.body);
        const duplicateQuery = buildDuplicateQuery(
          config,
          nameUpper,
          scope,
          id,
        );
        const existing = await model.findOne(duplicateQuery);

        if (existing) {
          return response.errorResponse(
            res,
            [{ path: "name", msg: config.duplicateMessage }],
            "Validation Error",
            400,
          );
        }

        entity.name = nameUpper;
      }

      if (description !== undefined) {
        entity.description = description ? description.trim() : "";
      }

      if (status !== undefined) {
        const statusResult = applyHierarchyStatusUpdate(entity, status);
        if (statusResult.error) {
          return response.errorResponse(
            res,
            statusResult.error.errors,
            statusResult.error.message,
            statusResult.error.statusCode,
          );
        }

        if (statusResult.cascadeInactive) {
          await runActiveCascade(config, id, "inactive");
        } else if (statusResult.cascadeActive) {
          await runActiveCascade(config, id, "active");
        }
      } else if (isActive !== undefined) {
        const newActiveStatus = parseIsActive(isActive, entity.isActive);
        const oldActiveStatus = entity.isActive;
        entity.isActive = newActiveStatus;

        if (
          config.cascadeOnActiveChange &&
          newActiveStatus !== oldActiveStatus
        ) {
          await runActiveCascade(
            config,
            id,
            newActiveStatus ? "active" : "inactive",
          );
        }
      }

      await entity.save();

      return response.successResponse(
        res,
        entity,
        config.updateSuccessMessage,
      );
    } catch (error) {
      console.error(`Error updating ${labelLower}:`, error);
      if (error.code === 11000) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: config.duplicateMessage }],
          "Validation Error",
          400,
        );
      }
      return response.errorResponse(
        res,
        {},
        error.message || `Failed to update ${labelLower}`,
        500,
      );
    }
  };

  const hardDelete = async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.errorResponse(res, {}, invalidIdMessage(label), 400);
      }

      const entity = await model.findById(id);

      if (!entity || entity.isDeleted) {
        return response.errorResponse(res, {}, notFoundMessage(label), 404);
      }

      if (config.cascadeOnDelete && config.cascade?.hardDelete) {
        await config.cascade.hardDelete(id);
      }

      await model.deleteOne({ _id: id });
      await cleanupUserDetailsRefs(config, id);

      return response.successResponse(res, {}, config.hardDeleteSuccessMessage);
    } catch (error) {
      console.error(`Error hard deleting ${labelLower}:`, error);
      return response.errorResponse(
        res,
        {},
        `Failed to permanently delete ${labelLower}`,
        500,
      );
    }
  };

  const approve = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await approveWithParents(config, id);

      if (!result.ok) {
        return response.errorResponse(
          res,
          {},
          result.message,
          result.statusCode,
        );
      }

      return response.successResponse(
        res,
        {
          entity: result.entity,
          autoApprovedParents: result.autoApprovedParents,
          warnings: result.warnings,
        },
        buildApproveSuccessMessage(config, result.autoApprovedParents),
      );
    } catch (error) {
      console.error(`Error approving ${labelLower}:`, error);
      return response.errorResponse(
        res,
        {},
        `Failed to approve ${labelLower}`,
        500,
      );
    }
  };

  const bulkApprove = async (req, res) => {
    try {
      const { ids } = req.body;
      const result = await bulkApproveWithParents(config, ids);

      if (!result.ok) {
        return response.errorResponse(
          res,
          [{ path: "ids", msg: result.message }],
          "Validation Error",
          result.statusCode,
        );
      }

      return response.successResponse(
        res,
        {
          approved: result.approved,
          failed: result.failed,
          summary: result.summary,
        },
        buildBulkApproveSuccessMessage(
          config,
          result.summary.approved,
          result.summary.failed,
        ),
      );
    } catch (error) {
      console.error(`Error bulk approving ${labelLower}:`, error);
      return response.errorResponse(
        res,
        {},
        `Failed to bulk approve ${labelLower}`,
        500,
      );
    }
  };

  const reject = async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.errorResponse(res, {}, invalidIdMessage(label), 400);
      }

      const entity = await model.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!entity) {
        return response.errorResponse(res, {}, notFoundMessage(label), 404);
      }

      if (entity.status === "rejected") {
        return response.errorResponse(
          res,
          {},
          config.alreadyRejectedMessage,
          400,
        );
      }

      entity.status = "rejected";
      entity.isActive = false;
      await entity.save();
      await cleanupUserDetailsRefs(config, id);

      return response.successResponse(
        res,
        entity,
        config.rejectSuccessMessage,
      );
    } catch (error) {
      console.error(`Error rejecting ${labelLower}:`, error);
      return response.errorResponse(
        res,
        {},
        `Failed to reject ${labelLower}`,
        500,
      );
    }
  };

  return {
    [exportNames.create]: create,
    [exportNames.list]: list,
    [exportNames.getById]: getById,
    [exportNames.update]: update,
    [exportNames.hardDelete]: hardDelete,
    [exportNames.approve]: approve,
    [exportNames.reject]: reject,
    [exportNames.bulkApprove]: bulkApprove,
  };
}

module.exports = {
  createHierarchyController,
  escapeRegex,
  normalizeName,
  parseIsActive,
  buildDuplicateQuery,
  validateAdminParentFields,
  applyHierarchyStatusUpdate,
  resolveCreateStatus,
  VALID_ADMIN_STATUSES,
};
