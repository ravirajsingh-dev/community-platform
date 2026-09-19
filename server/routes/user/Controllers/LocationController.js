const Village = require("../../../models/Village");
const response = require("../../../config/response");
const { validateVillageLocationKey, buildVillageScopeQuery } = require("../../../utils/locationHelper");

const getVillages = async (req, res) => {
  try {
    const { countryCode, stateCode, cityId } = req.query;
    const userId = req.user?.id;

    const parent = validateVillageLocationKey({
      countryCode,
      stateCode,
      cityId,
    });
    if (parent.errors.length > 0) {
      return response.errorResponse(
        res,
        parent.errors,
        "Validation Error",
        400
      );
    }

    const villages = await Village.find({
      ...buildVillageScopeQuery(parent),
      $or: [
        { status: "active" },
        { status: "pending", createdBy: userId },
      ],
    })
      .select("_id name status")
      .sort({ name: 1 })
      .lean();

    const formattedVillages = villages.map((village) => ({
      value: village._id.toString(),
      label:
        village.status === "pending"
          ? `${village.name} (Pending Admin Approval)`
          : village.name,
      status: village.status || "active",
    }));

    return response.successResponse(
      res,
      formattedVillages,
      "Villages fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching villages:", error);
    return response.errorResponse(res, {}, "Failed to fetch villages", 500);
  }
};

const createVillage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const parent = validateVillageLocationKey(req.body);

    if (parent.errors.length > 0) {
      return response.errorResponse(
        res,
        parent.errors,
        "Validation Error",
        400
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village name is required" }],
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
        [
          {
            path: "name",
            msg: "Village with this name already exists in this city",
          },
        ],
        "Validation Error",
        400
      );
    }

    const newVillage = new Village({
      name: nameUpper,
      countryCode: parent.countryCode,
      stateCode: parent.stateCode,
      cityId: parent.cityId,
      ...(parent.cityName ? { cityName: parent.cityName } : {}),
      status: "pending",
      createdBy: userId,
    });

    await newVillage.save();

    return response.successResponse(
      res,
      {
        value: newVillage._id.toString(),
        label: newVillage.name,
        status: newVillage.status,
      },
      "Village created successfully (pending approval)"
    );
  } catch (error) {
    console.error("Error creating village:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create village",
      500
    );
  }
};

module.exports = {
  getVillages,
  createVillage,
};
