const {
  getMembershipAccessState,
} = require("../utils/membershipHelper");

const requireActiveMembership = (req, res, next) => {
  const user = req.userObj;

  if (!user) {
    console.error(
      "requireActiveMembership: req.userObj missing after UserAuth",
    );
    return res.status(500).json({
      msg: "An error occurred",
    });
  }

  const access = getMembershipAccessState(user);

  if (access.allowed) {
    return next();
  }

  return res.status(403).json({
    msg: access.message,
    code: access.code,
    membershipStatus: access.membershipStatus,
  });
};

module.exports = requireActiveMembership;
