import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Form, InputGroup } from "react-bootstrap";
import { connect } from "react-redux";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import CustomModal from "@src/components/common/Modal/CustomModal";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import { formatIndianNumber } from "@src/utils/helper";

const DonationRejectModal = ({
  show,
  onHide,
  onConfirm,
  request,
  setErrors,
  errorList,
  loading,
}) => {
  const [txnPassword, setTxnPassword] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (!show) {
      setTxnPassword("");
      setRejectionReason("");
      setShowPassword(false);
      setReasonError("");
    }
  }, [show]);

  const handleConfirm = () => {
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setReasonError("Rejection reason is required.");
      return;
    }
    if (trimmedReason.length > 500) {
      setReasonError("Rejection reason must be at most 500 characters.");
      return;
    }
    setReasonError("");

    const errors = validateForm(
      { txn_password: txnPassword },
      [{ path: "txn_password", msg: "Transaction password is required." }],
    );

    if (errors.length) {
      setErrors(errors);
      return;
    }

    onConfirm(txnPassword, trimmedReason);
    setTxnPassword("");
    setRejectionReason("");
  };

  const handleClose = () => {
    setTxnPassword("");
    setRejectionReason("");
    setReasonError("");
    onHide();
  };

  if (!request) return null;

  const summary = `${request.donorName || "Guest"} — ₹${formatIndianNumber(request.amount) || 0}`;

  return (
    <CustomModal
      show={show}
      onHide={handleClose}
      title="Reject Donation"
      size="md"
      closeButton
      className="settings-confirm-modal"
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: "Close",
          onClick: handleClose,
          className: "btn btn--outline",
          colSize: 5,
          disabled: loading,
        },
        {
          label: loading ? "Rejecting..." : "Reject",
          onClick: handleConfirm,
          className: "btn btn--reject",
          colSize: 7,
          disabled: loading,
        },
      ]}
    >
      <p className="mb-3">
        You are about to reject the donation from <strong>{summary}</strong>.
        Please provide a reason for rejection.
      </p>

      <Form.Group controlId="donation_rejection_reason" className="mb-4">
        <Form.Label htmlFor="donation_rejection_reason" className="fw-bold">
          Rejection Reason *
        </Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          id="donation_rejection_reason"
          value={rejectionReason}
          onChange={(e) => {
            setRejectionReason(e.target.value);
            if (reasonError) setReasonError("");
          }}
          placeholder="Enter reason for rejecting this donation request"
          className={reasonError ? "is-invalid" : ""}
          maxLength={500}
          disabled={loading}
        />
        {reasonError ? (
          <div className="invalid-feedback d-block">{reasonError}</div>
        ) : (
          <Form.Text className="text-muted">
            {rejectionReason.length}/500 characters
          </Form.Text>
        )}
      </Form.Group>

      <Form.Group controlId="donation_reject_txn_password">
        <Form.Label htmlFor="donation_reject_txn_password" className="fw-bold">
          Transaction Password *
        </Form.Label>
        <InputGroup>
          <Form.Control
            type={showPassword ? "text" : "password"}
            id="donation_reject_txn_password"
            value={txnPassword}
            name="txn_password"
            className={`text-muted ${errorList.txn_password ? "invalid" : ""}`}
            onChange={(e) => setTxnPassword(e.target.value)}
            placeholder="Enter transaction password"
            disabled={loading}
          />
          <InputGroup.Text
            className="show-password-icon text-muted"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <AiOutlineEye size={20} />
            ) : (
              <AiOutlineEyeInvisible size={20} />
            )}
          </InputGroup.Text>
        </InputGroup>
        <Errors current_key="txn_password" />
      </Form.Group>
    </CustomModal>
  );
};

DonationRejectModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  request: PropTypes.object,
  loading: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loading: state.adminDonation.loadingOnDonationRequestAction,
});

export default connect(mapStateToProps, { setErrors })(DonationRejectModal);
