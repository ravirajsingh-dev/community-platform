const tokenExpiryTime = "1h";
const refreshTokenExpiryTime = "15m";

const excludedPaths = [
  "/api/auth/refresh-token",
  "/api/auth/users",
  "/api/auth",
  "/api/common/settings",
  "/api/admin/settings",
  "/api/common/slider-banners",
  "/api/common/gallery",
  "/api/common/videos",
  "/api/common/news",
  "/api/common/user",
  "/api/common/donation",
  "/api/common/legal-pages",
  "/api/common/membership-plans",
  "/api/payments",
];

module.exports = { tokenExpiryTime, refreshTokenExpiryTime, excludedPaths };
