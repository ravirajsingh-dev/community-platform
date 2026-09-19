const express = require("express");
const { check } = require("express-validator");
const {
  createOrder,
  getPaymentStatus,
} = require("./Controllers/PaymentController");

const router = express.Router();

router.post(
  "/create-order",
  [
    check("userId", "User ID is required").isMongoId(),
    check("planId", "Plan ID is required").isMongoId(),
  ],
  createOrder,
);

router.get("/status/:orderId", getPaymentStatus);

module.exports = router;
