const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const cashfree = require("../../../services/cashfreeClient");
const {
  createMembershipOrder,
  getPaymentStatusResponse,
  processPaymentWebhook,
} = require("../../../services/membershipPaymentService");

const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    const { userId, planId } = req.body;
    const order = await createMembershipOrder({ userId, planId });

    return response.successResponse(
      res,
      order,
      "Payment order created successfully",
    );
  } catch (error) {
    console.error("Error creating payment order:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to create payment order" }],
      error.message || "Failed to create payment order",
      400,
    );
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const fromReturn = String(req.query.fromReturn || "").toLowerCase() === "true";

    if (!orderId || !String(orderId).trim()) {
      return response.errorResponse(res, {}, "Order ID is required", 400);
    }

    const statusResponse = await getPaymentStatusResponse(
      String(orderId).trim(),
      { fromReturn },
    );
    if (!statusResponse) {
      return response.errorResponse(res, {}, "Payment not found", 404);
    }

    return response.successResponse(
      res,
      statusResponse,
      "Payment status retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return response.errorResponse(res, {}, "Failed to fetch payment status", 500);
  }
};

const handleCashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    if (!signature || !timestamp) {
      return response.errorResponse(
        res,
        [{ msg: "Missing webhook signature headers" }],
        "Invalid webhook request",
        400,
      );
    }

    const webhookEvent = cashfree.PGVerifyWebhookSignature(
      signature,
      rawBody,
      timestamp,
    );

    const result = await processPaymentWebhook(webhookEvent, req);

    return response.successResponse(
      res,
      result,
      "Webhook processed successfully",
    );
  } catch (error) {
    console.error("Cashfree webhook error:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Webhook processing failed" }],
      error.message || "Webhook processing failed",
      400,
    );
  }
};

module.exports = {
  createOrder,
  getPaymentStatus,
  handleCashfreeWebhook,
};
