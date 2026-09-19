const mongoose = require("mongoose");
const response = require("../config/response");
const CommonSettings = require("../models/CommonSettings");
const {
  normalizeUserCreatableLevels,
  isUserCreatableLevel,
} = require("./hierarchyCreatableSettings");
const {
  escapeRegex,
  normalizeName,
} = require("./hierarchyAdminHelper");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function buildUserDropdownQuery(config, userId, parentId) {
  const query = {
    isDeleted: false,
    $or: [
      { status: "active", isActive: true },
      { status: "pending", createdBy: userId },
      { status: { $exists: false }, isActive: true },
      { status: null, isActive: true },
    ],
  };

  if (config.parentQueryParam && parentId) {
    query[config.parentQueryParam] = parentId;
  }

  return query;
}

function toDropdownOptions(records) {
  return records.map((record) => ({
    value: record._id.toString(),
    label:
      record.status === "pending"
        ? `${record.name} (Pending Admin Approval)`
        : record.name,
    status: record.status || "active",
  }));
}

function buildDuplicateQuery(config, nameUpper, scopeValues = {}) {
  const query = {
    name: { $regex: new RegExp(`^${escapeRegex(nameUpper)}$`, "i") },
    isDeleted: false,
  };

  for (const field of config.duplicateScopeFields) {
    if (scopeValues[field] !== undefined) {
      query[field] = scopeValues[field];
    }
  }

  return query;
}

/**
 * Factory for user master-data list handler.
 * @param {object} config - Entry from MASTER_DATA_ENTITIES
 */
function createMasterDataListHandler(config) {
  return async function masterDataList(req, res) {
    try {
      const userId = req.user?.id;

      if (config.parentQueryParam) {
        const parentId = req.query[config.parentQueryParam];
        if (!parentId || !isValidObjectId(parentId)) {
          return response.errorResponse(
            res,
            [
              {
                path: config.parentQueryParam,
                msg: config.parentRequiredMessage,
              },
            ],
            "Validation Error",
            400,
          );
        }

        const records = await config.model
          .find(buildUserDropdownQuery(config, userId, parentId))
          .select("_id name status")
          .lean();

        return response.successResponse(
          res,
          toDropdownOptions(records),
          config.listSuccessMessage,
        );
      }

      const records = await config.model
        .find(buildUserDropdownQuery(config, userId))
        .select("_id name status")
        .lean();

      return response.successResponse(
        res,
        toDropdownOptions(records),
        config.listSuccessMessage,
      );
    } catch (error) {
      console.error(`Error fetching ${config.key} list:`, error);
      return response.errorResponse(
        res,
        {},
        `Failed to fetch ${config.key}s`,
        500,
      );
    }
  };
}

/**
 * Factory for user master-data create handler.
 * @param {object} config - Entry from MASTER_DATA_ENTITIES
 */
function createMasterDataCreateHandler(config) {
  return async function masterDataCreate(req, res) {
    try {
      const settings = await CommonSettings.getOrCreateSettings();
      const creatableLevels = normalizeUserCreatableLevels(
        settings.userCreatableLevels,
      );

      if (!isUserCreatableLevel(config.key, creatableLevels)) {
        return response.errorResponse(
          res,
          [
            {
              path: "name",
              msg: `${config.label} creation is disabled by admin settings`,
            },
          ],
          "Forbidden",
          403,
        );
      }

      const userId = req.user.id;
      const { name } = req.body;

      let scopeValues = {};
      let entityPayload = {
        name: null,
        status: "pending",
        createdBy: userId,
        isActive: false,
      };

      if (config.parentBodyField) {
        const parentId = req.body[config.parentBodyField];
        if (!parentId || !isValidObjectId(parentId)) {
          return response.errorResponse(
            res,
            [
              {
                path: config.parentBodyField,
                msg: config.parentRequiredMessage,
              },
            ],
            "Validation Error",
            400,
          );
        }

        const parent = await config.parentModel.findOne({
          _id: parentId,
          isDeleted: false,
        });

        if (!parent) {
          return response.errorResponse(
            res,
            [
              {
                path: config.parentBodyField,
                msg: config.parentNotFoundMessage,
              },
            ],
            "Validation Error",
            400,
          );
        }

        scopeValues[config.parentBodyField] = parentId;
        entityPayload[config.parentBodyField] = parentId;

        if (config.ancestorFieldsFromParent) {
          for (const [targetField, sourceField] of Object.entries(
            config.ancestorFieldsFromParent,
          )) {
            entityPayload[targetField] = parent[sourceField];
            scopeValues[targetField] = parent[sourceField];
          }
        }
      }

      if (!name || !name.trim()) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: config.nameRequiredMessage }],
          "Validation Error",
          400,
        );
      }

      const nameUpper = normalizeName(name);
      const existing = await config.model.findOne(
        buildDuplicateQuery(config, nameUpper, scopeValues),
      );

      if (existing) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: config.duplicateMessage }],
          "Validation Error",
          400,
        );
      }

      entityPayload.name = nameUpper;
      const entity = new config.model(entityPayload);
      await entity.save();

      return response.successResponse(
        res,
        {
          value: entity._id.toString(),
          label: `${entity.name} (Pending Admin Approval)`,
          status: entity.status,
        },
        config.createSuccessMessage,
      );
    } catch (error) {
      console.error(`Error creating ${config.key}:`, error);
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
        error.message || `Failed to create ${config.key}`,
        500,
      );
    }
  };
}

/**
 * Build all master-data handlers from config map.
 * @param {Record<string, object>} entitiesConfig
 */
function createMasterDataHandlers(entitiesConfig) {
  const handlers = {};

  for (const config of Object.values(entitiesConfig)) {
    handlers[config.exports.list] = createMasterDataListHandler(config);
    handlers[config.exports.create] = createMasterDataCreateHandler(config);
  }

  return handlers;
}

module.exports = {
  createMasterDataListHandler,
  createMasterDataCreateHandler,
  createMasterDataHandlers,
  buildUserDropdownQuery,
  toDropdownOptions,
  buildDuplicateQuery,
};
