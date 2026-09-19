const response = require("../../../config/response");
const {
  listPendingApprovals,
  bulkApprovePendingItems,
} = require("../../../utils/hierarchyPendingService");
const {
  buildBulkApproveSuccessMessage,
} = require("../../../utils/hierarchyApproveService");

const listPending = async (req, res) => {
  try {
    const result = await listPendingApprovals(req.query, req.userObj || null, {
      isAdmin: req.isAdmin,
    });

    return response.successResponse(
      res,
      [
        {
          metadata: [result.metadata],
          data: result.data,
        },
      ],
      "Pending hierarchy approvals fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching pending hierarchy approvals:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch pending hierarchy approvals",
      500,
    );
  }
};

const bulkApprovePending = async (req, res) => {
  try {
    const { items } = req.body;
    const result = await bulkApprovePendingItems(items, req.userObj || null, {
      isAdmin: req.isAdmin,
    });

    if (!result.ok) {
      return response.errorResponse(
        res,
        [{ path: "items", msg: result.message }],
        "Validation Error",
        result.statusCode,
      );
    }

    return response.successResponse(
      res,
      {
        approved: result.approved,
        failed: result.failed,
        summary: result.summary,
      },
      buildBulkApproveSuccessMessage(
        { label: "Pending item" },
        result.summary.approved,
        result.summary.failed,
      ),
    );
  } catch (error) {
    console.error("Error bulk approving pending hierarchy items:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to bulk approve pending hierarchy items",
      500,
    );
  }
};

module.exports = {
  listPending,
  bulkApprovePending,
};
