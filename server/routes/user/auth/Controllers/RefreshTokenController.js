const jwt = require("jsonwebtoken");

const Session = require("../../../../models/Session");
const response = require("../../../../config/response");
const { JWT_REFRESH_SECRET } = require("../../../../config/config");
const {
  rotateRefreshToken,
  resolveSession,
} = require("../../../../utils/authUtils");
const { setSessionAuthCookies } = require("../../../../utils/cookieUtils");
const User = require("../../../../models/User");

const refreshToken = async (req, res) => {
  const receivedRefreshToken =
    req.cookies?.user_refreshToken ||
    req.cookies?.refreshToken ||
    req.body.refreshToken;
  const sessionID =
    req.cookies?.user_sessionID || req.cookies?.sessionID;

  if (!receivedRefreshToken) {
    return response.errorResponse(
      res,
      { msg: "Refresh token is required." },
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
    const user = await User.findById(decoded.id);

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found." },
        "Invalid token.",
        401,
      );
    }

    if (user.passwordChangedAt) {
      const refreshTokenIssuedAt = decoded.iat * 1000;
      const passwordChangedAt = new Date(user.passwordChangedAt).getTime();

      if (refreshTokenIssuedAt < passwordChangedAt) {
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return response.errorResponse(
          res,
          { msg: "Your password has been changed. Please log in again." },
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
        "user_",
      );

      return response.successResponse(res, {}, "Token refreshed successfully.");
    }

    const tokens = await rotateRefreshToken(
      user,
      session,
      receivedRefreshToken,
    );
    setSessionAuthCookies(res, tokens, "user_");

    return response.successResponse(res, {}, "Token refreshed successfully.");
  } catch (err) {
    console.error("Error during token refresh:", err);
    return response.errorResponse(res, {}, "Invalid token.", 403);
  }
};

module.exports = refreshToken;
