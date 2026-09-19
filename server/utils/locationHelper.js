const Village = require("../models/Village");

const INDIA_ISO2 = "IN";

/**
 * Enrich userDetails with village label/status from Village collection.
 */
async function enrichUserDetailsLocation(userDetails) {
  if (!userDetails) return userDetails;

  if (userDetails.villageId) {
    const village = await Village.findById(userDetails.villageId)
      .select("name status")
      .lean();
    if (village) {
      userDetails.villageLabel = village.name;
      userDetails.villageStatus = village.status;
    }
  }

  return userDetails;
}

function trimLocationString(value) {
  return value != null ? String(value).trim() : "";
}

/**
 * India-only: default to IN, reject any other country code.
 */
function normalizeIndiaCountryCode(raw, { defaultIfEmpty = true } = {}) {
  const code = trimLocationString(raw) || (defaultIfEmpty ? INDIA_ISO2 : "");
  const errors = [];

  if (!code) {
    errors.push({ path: "countryCode", msg: "Country code is required" });
    return { errors, countryCode: null };
  }

  if (code !== INDIA_ISO2) {
    errors.push({
      path: "countryCode",
      msg: "Only India (IN) is supported",
    });
    return { errors, countryCode: code };
  }

  return { errors, countryCode: code };
}

function validateVillageLocationKey(body, { requireCityName = false } = {}) {
  const errors = [];
  const country = normalizeIndiaCountryCode(body.countryCode);
  if (country.errors.length > 0) {
    errors.push(...country.errors);
  }

  const stateCode = trimLocationString(body.stateCode);
  const cityId = trimLocationString(body.cityId);
  const cityName = trimLocationString(body.cityName);

  if (!stateCode) {
    errors.push({ path: "stateCode", msg: "State code is required" });
  }
  if (!cityId) {
    errors.push({ path: "cityId", msg: "City ID is required" });
  }
  if (requireCityName && !cityName) {
    errors.push({ path: "cityName", msg: "City name is required" });
  }

  return {
    errors,
    countryCode: country.countryCode,
    stateCode,
    cityId,
    cityName: cityName || undefined,
  };
}

function buildVillageScopeQuery({ countryCode, stateCode, cityId }) {
  return {
    countryCode,
    stateCode,
    cityId,
  };
}

module.exports = {
  enrichUserDetailsLocation,
  validateVillageLocationKey,
  buildVillageScopeQuery,
  trimLocationString,
  normalizeIndiaCountryCode,
  INDIA_ISO2,
};
