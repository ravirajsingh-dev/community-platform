const response = require("../../../config/response");
const Village = require("../../../models/Village");
const UserDetails = require("../../../models/UserDetails");
const mongoose = require("mongoose");
const {
  validateVillageLocationKey,
  buildVillageScopeQuery,
  trimLocationString,
} = require("../../../utils/locationHelper");
const {
  applyVillageDropdownFilters,
  finalizeDropdownQuery,
} = require("../../../utils/dropdownListHelper");

const createVillage = async (req, res) => {
  try {
    const { name, status: statusInput } = req.body;
    const parent = validateVillageLocationKey(req.body);

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400
      );
    }

    if (parent.errors.length > 0) {
      return response.errorResponse(
        res,
        parent.errors,
        "Validation Error",
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingVillage = await Village.findOne({
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      ...buildVillageScopeQuery(parent),
    });

    if (existingVillage) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village with this name already exists" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.admin?.id;

    const village = new Village({
      name: nameUpper,
      countryCode: parent.countryCode,
      stateCode: parent.stateCode,
      cityId: parent.cityId,
      ...(parent.cityName ? { cityName: parent.cityName } : {}),
      status:
        statusInput && ["active", "inactive"].includes(String(statusInput))
          ? String(statusInput)
          : "active",
      createdBy: adminId,
    });

    await village.save();

    return response.successResponse(
      res,
      village,
      "Village created successfully"
    );
  } catch (error) {
    console.error("Error creating village:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create village",
      500
    );
  }
};

const getVillages = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
      countryCode,
      stateCode,
      cityId,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    const code = trimLocationString(countryCode);
    const state = trimLocationString(stateCode);
    const city = trimLocationString(cityId);

    if (code) query.countryCode = code;
    if (state) query.stateCode = state;
    if (city) query.cityId = city;

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const activeOnly = applyVillageDropdownFilters(query, req.query);

    const [data, totalRecord] = await Promise.all([
      finalizeDropdownQuery(
        Village.find(query)
          .sort({ [orderBy]: sortOrder, createdAt: -1 })
          .skip(skip)
          .limit(pageSize),
        activeOnly,
      ).lean(),
      Village.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: parseInt(page),
              per_page: pageSize,
            },
          ],
          data,
        },
      ],
      "Villages fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching villages:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch villages",
      500
    );
  }
};

const getVillageById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findById(id).lean();

    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    return response.successResponse(
      res,
      village,
      "Village fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching village:", error);
    return response.errorResponse(res, {}, "Failed to fetch village", 500);
  }
};

const updateVillage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, countryCode, stateCode, cityId, cityName, status } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findById(id);

    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    const nextCountryCode =
      countryCode !== undefined
        ? trimLocationString(countryCode)
        : village.countryCode;
    const nextStateCode =
      stateCode !== undefined
        ? trimLocationString(stateCode)
        : village.stateCode;
    const nextCityId =
      cityId !== undefined ? trimLocationString(cityId) : village.cityId;
    const nextCityName =
      cityName !== undefined ? trimLocationString(cityName) : village.cityName;

    if (name !== undefined) {
      if (!name.trim()) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Name cannot be empty" }],
          "Validation Error",
          400
        );
      }

      const nameUpper = name.trim().toUpperCase();
      const existingVillage = await Village.findOne({
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        countryCode: nextCountryCode,
        stateCode: nextStateCode,
        cityId: nextCityId,
        _id: { $ne: id },
      });

      if (existingVillage) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Village with this name already exists" }],
          "Validation Error",
          400
        );
      }

      village.name = nameUpper;
    }

    if (countryCode !== undefined) village.countryCode = nextCountryCode;
    if (stateCode !== undefined) village.stateCode = nextStateCode;
    if (cityId !== undefined) village.cityId = nextCityId;
    if (cityName !== undefined) village.cityName = nextCityName;

    if (status !== undefined) {
      const nextStatus = trimLocationString(status);
      if (!["active", "inactive", "pending", "rejected"].includes(nextStatus)) {
        return response.errorResponse(
          res,
          [{ path: "status", msg: "Invalid village status" }],
          "Validation Error",
          400
        );
      }
      village.status = nextStatus;
    }

    await village.save();

    return response.successResponse(
      res,
      village,
      "Village updated successfully"
    );
  } catch (error) {
    console.error("Error updating village:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update village",
      500
    );
  }
};

const hardDeleteVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findById(id);

    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    await Village.deleteOne({ _id: id });

    const userDetails = await UserDetails.find({ villageId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { villageId: id },
        { $unset: { villageId: "" } }
      );
    }

    return response.successResponse(
      res,
      {},
      "Village permanently deleted successfully"
    );
  } catch (error) {
    console.error("Error hard deleting village:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete village",
      500
    );
  }
};

const approveVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findById(id);

    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    if (village.status === "active") {
      return response.errorResponse(
        res,
        {},
        "Village is already approved",
        400
      );
    }

    village.status = "active";
    await village.save();

    return response.successResponse(res, village, "Village approved successfully");
  } catch (error) {
    console.error("Error approving village:", error);
    return response.errorResponse(res, {}, "Failed to approve village", 500);
  }
};

const rejectVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findById(id);

    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    if (village.status === "rejected") {
      return response.errorResponse(
        res,
        {},
        "Village is already rejected",
        400
      );
    }

    village.status = "rejected";
    await village.save();

    const userDetails = await UserDetails.find({ villageId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { villageId: id },
        { $unset: { villageId: "" } }
      );
    }

    return response.successResponse(res, village, "Village rejected successfully");
  } catch (error) {
    console.error("Error rejecting village:", error);
    return response.errorResponse(res, {}, "Failed to reject village", 500);
  }
};

module.exports = {
  createVillage,
  getVillages,
  getVillageById,
  updateVillage,
  hardDeleteVillage,
  approveVillage,
  rejectVillage,
};
