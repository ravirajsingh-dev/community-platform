import PropTypes from "prop-types";
import { Badge } from "react-bootstrap";
import { format, parseISO } from "date-fns";

import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";
import { formatIndianNumber } from "@src/utils/helper";

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy, hh:mm a");
  } catch {
    return String(value);
  }
};

const STATUS_BADGE = {
  success: { bg: "success", text: "Success" },
  failed: { bg: "danger", text: "Failed" },
  pending: { bg: "warning", text: "Pending" },
};

const DetailRow = ({ label, value }) => (
  <div className="donation-detail-row">
    <span className="donation-detail-row__label">{label}</span>
    <span className="donation-detail-row__value">{value || "—"}</span>
  </div>
);

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

const PaymentDetailModal = ({ show, onHide, payment, loading }) => {
  const user = payment?.userId;
  const plan = payment?.selectedPlan;
  const statusConfig = STATUS_BADGE[payment?.status] || STATUS_BADGE.pending;

  return (
    <AdvancedModal
      show={show}
      onHide={onHide}
      title="Payment Details"
      size="lg"
      closeButton
      className="settings-confirm-modal"
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: "Close",
          onClick: onHide,
          className: "btn btn--outline",
          colSize: 12,
          disabled: loading,
        },
      ]}
    >
      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <CommonSpinner size="lg" message="Loading payment details..." />
        </div>
      ) : !payment ? (
        <p className="text-muted mb-0 text-center">No payment selected.</p>
      ) : (
        <>
          <div className="donation-detail-panel mb-3">
            <DetailRow
              label="Status"
              value={<Badge bg={statusConfig.bg}>{statusConfig.text}</Badge>}
            />
            <DetailRow
              label="Amount"
              value={`₹${formatIndianNumber(payment.amount)}`}
            />
            <DetailRow
              label="Payment Type"
              value={payment.paymentType || "—"}
            />
            <DetailRow label="Method" value={payment.method || "—"} />
            <DetailRow
              label="Created"
              value={formatDateTime(payment.createdAt)}
            />
            <DetailRow
              label="Updated"
              value={formatDateTime(payment.updatedAt)}
            />
          </div>

          <div className="donation-detail-panel mb-3">
            <DetailRow label="Order ID" value={payment.orderId || "—"} />
            <DetailRow label="Payment ID" value={payment.paymentId || "—"} />
            <DetailRow
              label="Cashfree Payment ID"
              value={payment.cfPaymentId || "—"}
            />
            <DetailRow
              label="Session ID"
              value={payment.paymentSessionId || "—"}
            />
          </div>

          <div className="donation-detail-panel mb-3">
            <DetailRow
              label="User"
              value={user?.name || payment.userName || "—"}
            />
            <DetailRow label="Member ID" value={user?.memberId || "—"} />
            <DetailRow label="Phone" value={user?.phone || "—"} />
            <DetailRow label="Email" value={user?.email || "—"} />
          </div>

          <div className="donation-detail-panel mb-3">
            <DetailRow label="Plan" value={plan?.name || "—"} />
            <DetailRow
              label="Plan Price"
              value={
                plan?.price != null
                  ? `₹${formatIndianNumber(plan.price)}`
                  : "—"
              }
            />
            <DetailRow
              label="Duration"
              value={
                plan?.durationType
                  ? `${plan.durationValue || ""} ${plan.durationType}`.trim()
                  : "—"
              }
            />
          </div>

          <div className="donation-detail-panel">
            <DetailRow label="Remarks" value={payment.remarks || "—"} />
          </div>
        </>
      )}
    </AdvancedModal>
  );
};

PaymentDetailModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  payment: PropTypes.object,
  loading: PropTypes.bool,
};

export default PaymentDetailModal;
