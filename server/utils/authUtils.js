const jwt = require("jsonwebtoken");
const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION,
} = require("../config/config");

const Session = require("../models/Session");
const crypto = require("crypto");
const { parseTokenExpiryTime } = require("./helper");
const { logSecurityEvent, EVENT_TYPES, getClientIP } = require("./auditLogger");

// Grace window for concurrent requests that still carry a pre-rotation refresh cookie.
const ROTATION_GRACE_MS = 60 * 1000;

const generateAccessToken = (user) => {
  return jwt.sign(user, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRATION || "15m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign(user, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRATION || "1d",
  });
};

const generateTokens = async (user, req = null) => {
  // Determine role: 
  // 2 for Admin (role field === 2)
  // 3 for SubAdmin (has role field as string: "sub_admin", "staff", "manager")
  // 1 for User (no role field or role === 1)
  let role = 1;
  if (user.role !== undefined) {
    if (typeof user.role === 'number') {
      role = user.role; // Admin (2) or User (1)
    } else if (typeof user.role === 'string') {
      role = 3; // SubAdmin
    }
  }
  
  const userPlainObj = {
    id: user?._id,
    uuid: user?.uuid,
    role: role,
    // Include passwordChangedAt timestamp in token for validation
    passwordChangedAt: user?.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : null,
  };

  const accessToken = generateAccessToken(userPlainObj);
  const refreshToken = generateRefreshToken(userPlainObj);
  const sessionID = crypto.randomBytes(16).toString("hex");
  
  // Extract IP address and user-agent from request if available
  let ipAddress = null;
  let userAgent = null;
  if (req) {
    ipAddress = getClientIP(req);
    userAgent = req.headers?.['user-agent'] || null;
  }
  
  const sessionData = {
    userID: user?._id || user?.id,
    role: role,
    sessionID,
    accessToken,
    refreshToken,
    ipAddress,
    userAgent,
  };

  try {
    const userID = user?._id || user?.id;
    
    // SECURITY: Limit to maximum 3 active sessions per user
    // Find all active sessions for this user, ordered by creation date (oldest first)
    const activeSessions = await Session.find({
      userID: userID,
      isActive: true,
    })
      .sort({ createdAt: 1 }) // Sort by createdAt ascending (oldest first)
      .lean();

    // If user already has 3 or more active sessions, remove the oldest ones
    // Keep only the latest 2, so the new session will be the 3rd
    const MAX_ACTIVE_SESSIONS = 3;
    if (activeSessions.length >= MAX_ACTIVE_SESSIONS) {
      // Calculate how many sessions to remove
      const sessionsToRemove = activeSessions.length - (MAX_ACTIVE_SESSIONS - 1);
      
      // Get IDs of the oldest sessions to remove
      const sessionIDsToDeactivate = activeSessions
        .slice(0, sessionsToRemove)
        .map((session) => session._id);

      // Deactivate the oldest sessions
      await Session.updateMany(
        { _id: { $in: sessionIDsToDeactivate } },
        { isActive: false }
      );
    }

    // Create the new session
    const session = await new Session(sessionData).save();

    // Log session creation (note: req is not available here, so IP will be "unknown")
    logSecurityEvent({
      eventType: EVENT_TYPES.SESSION_CREATED,
      status: "success",
      userID: userID?.toString() || null,
      adminID: role === 2 || role === 3 ? userID?.toString() || null : null,
      details: { role, sessionID },
    });

    return { accessToken, refreshToken, sessionID };
  } catch (error) {
    console.error("Error saving session:", error);
    throw error;
  }
};

/**
 * Resolve an active session from cookies. Accepts a stale refresh cookie when
 * another in-flight request already rotated tokens within the grace window.
 */
const resolveSession = async ({ userID, sessionID, refreshToken }) => {
  if (!userID || !sessionID || !refreshToken) {
    return null;
  }

  const session = await Session.findOne({
    userID,
    sessionID,
    isActive: true,
  });

  if (!session) {
    return null;
  }

  if (session.refreshToken === refreshToken) {
    return { session, cookiesNeedSync: false };
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.id?.toString() !== userID.toString()) {
      return null;
    }

    const updatedAt = session.updatedAt
      ? new Date(session.updatedAt).getTime()
      : 0;
    if (Date.now() - updatedAt > ROTATION_GRACE_MS) {
      return null;
    }

    return { session, cookiesNeedSync: true };
  } catch {
    return null;
  }
};

/**
 * Rotates refresh token by updating the existing session with new tokens.
 * This invalidates the old refresh token while maintaining the session link.
 * 
 * @param {Object} user - User object with _id, uuid, role, passwordChangedAt
 * @param {Object} session - Existing session object to update
 * @param {string} [expectedRefreshToken] - Refresh token expected in DB for atomic rotation
 * @returns {Object} Object containing accessToken, refreshToken, and sessionID
 */
const rotateRefreshToken = async (user, session, expectedRefreshToken = null) => {
  // Determine role: 
  // 2 for Admin (role field === 2)
  // 3 for SubAdmin (has role field as string: "sub_admin", "staff", "manager")
  // 1 for User (no role field or role === 1)
  let role = 1;
  if (user.role !== undefined) {
    if (typeof user.role === 'number') {
      role = user.role; // Admin (2) or User (1)
    } else if (typeof user.role === 'string') {
      role = 3; // SubAdmin
    }
  }
  
  const userPlainObj = {
    id: user?._id || user?.id,
    uuid: user?.uuid,
    role: role,
    // Include passwordChangedAt timestamp in token for validation
    passwordChangedAt: user?.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : null,
  };

  const accessToken = generateAccessToken(userPlainObj);
  const refreshToken = generateRefreshToken(userPlainObj);
  const refreshTokenExpiresAt = new Date(
    Date.now() + parseTokenExpiryTime(JWT_REFRESH_EXPIRATION || "1d"),
  );
  const expectedToken = expectedRefreshToken || session.refreshToken;

  try {
    const updatedSession = await Session.findOneAndUpdate(
      {
        _id: session._id,
        isActive: true,
        refreshToken: expectedToken,
      },
      {
        $set: {
          accessToken,
          refreshToken,
          refreshTokenExpiresAt,
        },
      },
      { returnDocument: "after" },
    );

    if (updatedSession) {
      return {
        accessToken,
        refreshToken,
        sessionID: updatedSession.sessionID,
        rotated: true,
      };
    }

    const currentSession = await Session.findOne({
      _id: session._id,
      isActive: true,
    });

    if (!currentSession) {
      throw new Error("Session is no longer active");
    }

    return {
      accessToken: currentSession.accessToken,
      refreshToken: currentSession.refreshToken,
      sessionID: currentSession.sessionID,
      rotated: false,
    };
  } catch (error) {
    console.error("Error rotating refresh token:", error);
    throw error;
  }
};

module.exports = {
  generateTokens,
  rotateRefreshToken,
  resolveSession,
  ROTATION_GRACE_MS,
};
