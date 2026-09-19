import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Badge, Form, InputGroup } from "react-bootstrap";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import CustomModal from "@src/components/common/Modal/CustomModal";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import { formatIndianNumber } from "@src/utils/helper";

const DonationDetailRow = ({ label, value }) => (
  <div className="donation-detail-row">
    <span className="donation-detail-row__label">{label}</span>
    <span className="donation-detail-row__value">{value || "—"}</span>
  </div>
);

DonationDetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

const DonationApproveModal = ({
  show,
  onHide,
  onConfirm,
  request,
  setErrors,
  errorList,
  loading,
}) => {
  const [txnPassword, setTxnPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!show) {
      setTxnPassword("");
      setShowPassword(false);
    }
  }, [show]);

  const handleConfirm = () => {
    const errors = validateForm(
      { txn_password: txnPassword },
      [{ path: "txn_password", msg: "Transaction password is required." }],
    );

    if (errors.length) {
      setErrors(errors);
      return;
    }

    onConfirm(txnPassword);
    setTxnPassword("");
  };

  const handleClose = () => {
    setTxnPassword("");
    onHide();
  };

  if (!request) return null;

  const formattedDate = request.createdAt
    ? format(parseISO(request.createdAt), "dd/MM/yyyy, hh:mm a")
    : "—";

  return (
    <CustomModal
      show={show}
      onHide={handleClose}
      title="Approve Donation"
      size="lg"
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
          label: loading ? "Approving..." : "Approve",
          onClick: handleConfirm,
          className: "btn btn--theme",
          colSize: 7,
          disabled: loading,
        },
      ]}
    >
      <p className="mb-3">
        Review the donation details below. A thank you email will be sent to the
        donor after approval.
      </p>

      <div className="donation-detail-panel mb-4">
        <DonationDetailRow label="Donor Name" value={request.donorName} />
        <DonationDetailRow label="Email" value={request.email} />
        <DonationDetailRow label="Mobile" value={request.phone} />
        <DonationDetailRow label="Address" value={request.address || "—"} />
        <DonationDetailRow
          label="Amount"
          value={`₹${formatIndianNumber(request.amount) || 0}`}
        />
        <DonationDetailRow
          label="Payment Mode"
          value={
            <Badge bg={request.paymentMode === "UPI" ? "info" : "secondary"}>
              {request.paymentMode || "N/A"}
            </Badge>
          }
        />
        <DonationDetailRow label="UTR Number" value={request.utrNumber} />
        <DonationDetailRow
          label="Referral Member ID"
          value={request.referralId || "—"}
        />
        <DonationDetailRow label="Submitted On" value={formattedDate} />
        <DonationDetailRow
          label="Status"
          value={
            <Badge bg="warning" text="dark">
              Pending
            </Badge>
          }
        />
      </div>

      <Form.Group controlId="donation_approve_txn_password">
        <Form.Label htmlFor="donation_approve_txn_password" className="fw-bold">
          Transaction Password *
        </Form.Label>
        <InputGroup>
          <Form.Control
            type={showPassword ? "text" : "password"}
            id="donation_approve_txn_password"
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

DonationApproveModal.propTypes = {
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

export default connect(mapStateToProps, { setErrors })(DonationApproveModal);
