const { UserAuth } = require("./auth");
const requireActiveMembership = require("./requireActiveMembership");

// UserAuth already validates the session (including refresh-token expiry).
// Do not stack checkSessionExpiry here — it was deactivating sessions mid-request
// and causing the next API call to 401 → auto-logout on the client.
const userAuth = [UserAuth];
const userProtected = [UserAuth, requireActiveMembership];

module.exports = { userAuth, userProtected };
