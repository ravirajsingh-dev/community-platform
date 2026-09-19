const { Cashfree, CFEnvironment } = require("cashfree-pg");
const {
  CASHFREE_MODE,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
} = require("../config/config");

const environment =
  String(CASHFREE_MODE).toLowerCase() === "production"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

const cashfree = new Cashfree(
  environment,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
);

module.exports = cashfree;
