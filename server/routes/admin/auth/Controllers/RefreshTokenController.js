const jwt = require("jsonwebtoken");

const Session = require("../../../../models/Session");
const response = require("../../../../config/response");
const { JWT_REFRESH_SECRET } = require("../../../../config/config");
const {
  rotateRefreshToken,
  resolveSession,
} = require("../../../../utils/authUtils");
const { setSessionAuthCookies } = require("../../../../utils/cookieUtils");
const Admin = require("../../../../models/Admin");
const SubAdmin = require("../../../../models/SubAdmin");

const adminRefreshToken = async (req, res) => {
  const receivedRefreshToken =
    req.cookies?.admin_refreshToken ||
    req.cookies?.refreshToken ||
    req.body.refreshToken;
  const sessionID =
    req.cookies?.admin_sessionID || req.cookies?.sessionID;

  if (!receivedRefreshToken) {
    return response.errorResponse(
      res,
      [{ msg: "Refresh token is required." }],
      "Invalid Request.",
      400,
    );
  }

  try {
    const decoded = jwt.verify(receivedRefreshToken, JWT_REFRESH_SECRET);

    const resolved = await resolveSession({
      userID: decoded.id,
      sessionID,
      refreshToken: receivedRefreshToken,
    });

    if (!resolved) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Invalid token or session ID. Please log in again.",
          },
        ],
        "Invalid token.",
        401,
      );
    }

    const { session, cookiesNeedSync } = resolved;

    let admin;
    if (decoded.role === 2) {
      admin = await Admin.findById(decoded.id);
    } else if (decoded.role === 3) {
      admin = await SubAdmin.findById(decoded.id);
    } else {
      admin = await Admin.findById(decoded.id);
      if (!admin) {
        admin = await SubAdmin.findById(decoded.id);
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ msg: "Admin not found." }],
        "Admin not found.",
        401,
      );
    }

    if (admin.passwordChangedAt) {
      const refreshTokenIssuedAt = decoded.iat * 1000;
      const passwordChangedAt = new Date(admin.passwordChangedAt).getTime();

      if (refreshTokenIssuedAt < passwordChangedAt) {
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return response.errorResponse(
          res,
          [{ msg: "Your password has been changed. Please log in again." }],
          "Invalid token.",
          401,
        );
      }
    }

    if (cookiesNeedSync) {
      setSessionAuthCookies(
        res,
        {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          sessionID: session.sessionID,
        },
        "admin_",
      );

      return response.successResponse(res, {}, "Token refreshed successfully.");
    }

    const tokens = await rotateRefreshToken(
      admin,
      session,
      receivedRefreshToken,
    );
    setSessionAuthCookies(res, tokens, "admin_");

    return response.successResponse(res, {}, "Token refreshed successfully.");
  } catch (err) {
    console.error("Error during token refresh:", err);
    return response.errorResponse(res, {}, "Invalid token.", 403);
  }
};

module.exports = adminRefreshToken;
