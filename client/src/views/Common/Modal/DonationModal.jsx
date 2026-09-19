import React, { useState, useEffect } from "react";
import { Form, Spinner, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import { validateForm, validateTransactionReference } from "@src/utils/validation";
import { setErrorsList } from "@src/actions/errors";
import Errors from "@src/notifications/Errors";
import {
  generateDonationQRCode,
  submitDonationRequest,
} from "@src/actions/donationActions";
import { lookupReferralUser } from "@src/actions/auth";
import { clearQRCode } from "@src/reducers/donationReducer";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";

const DonationModal = ({
  show,
  handleClose,
  paymentMode,
  initialAmount,
  isFixedAmount,
  donationSettings,
  generateDonationQRCode,
  submitDonationRequest,
  setErrorsList,
  clearQRCode,
  errorList,
  loggedInUser,
  loadingSubmitDonation,
  loadingQRCode,
  qrCodeData,
  lookupReferralUser,
}) => {
  const initialFormData = {
    donorName: "",
    phone: "",
    email: "",
    address: "",
    amount: initialAmount || "",
    utrNumber: "",
    referralId: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [customAmount, setCustomAmount] = useState(initialAmount || "");
  const [referralPreview, setReferralPreview] = useState(null);
  const [referralLookupLoading, setReferralLookupLoading] = useState(false);
  const [referralLookupError, setReferralLookupError] = useState("");
  const [referralTouched, setReferralTouched] = useState(false);

  const getEffectiveAmount = () => {
    const raw = isFixedAmount ? formData.amount : customAmount || formData.amount;
    const amount = parseFloat(raw);
    return isNaN(amount) ? 0 : amount;
  };

  // Reset form data and clear errors when modal opens/closes
  useEffect(() => {
    if (show) {
      setFormData({
        ...initialFormData,
        amount: initialAmount || "",
        donorName: loggedInUser?.name || "",
        phone: loggedInUser?.phone || "",
        email: loggedInUser?.email || "",
        referralId: loggedInUser?.referralId || "",
      });
      setCustomAmount(initialAmount || "");
      setReferralPreview(null);
      setReferralLookupLoading(false);
      setReferralLookupError("");
      setReferralTouched(false);
      setErrorsList("", "donorName");
      setErrorsList("", "phone");
      setErrorsList("", "email");
      setErrorsList("", "amount");
      setErrorsList("", "utrNumber");
      setErrorsList("", "referralId");
    } else {
      setFormData(initialFormData);
      setCustomAmount("");
      setReferralPreview(null);
      setReferralLookupLoading(false);
      setReferralLookupError("");
      setReferralTouched(false);
      clearQRCode();
      setErrorsList("", "donorName");
      setErrorsList("", "phone");
      setErrorsList("", "email");
      setErrorsList("", "amount");
      setErrorsList("", "utrNumber");
      setErrorsList("", "referralId");
    }
  }, [show, initialAmount, loggedInUser]);

  // Generate UPI QR code when amount is valid
  useEffect(() => {
    if (!show || paymentMode !== "UPI") return;

    const amount = getEffectiveAmount();
    if (amount >= 1) {
      generateDonationQRCode(amount);
    }
  }, [show, paymentMode, customAmount, formData.amount, isFixedAmount]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount" || name === "phone") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === "utrNumber") {
      const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 22);
      setFormData({ ...formData, utrNumber: cleaned });
      setErrorsList("", "utrNumber");
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleReferralIdChange = createMemberIdChangeHandler((e) => {
    setReferralTouched(true);
    onChange(e);
  }, "referralId");
  const handleReferralIdPaste = createMemberIdPasteHandler();
  const handleReferralIdKeyDown = createMemberIdKeyDownHandler(
    formData.referralId,
    (e) => {
      setReferralTouched(true);
      onChange(e);
    },
    "referralId",
  );

  useEffect(() => {
    const referralId = formData.referralId;
    const phone = formData.phone;

    setErrorsList("", "referralId");

    if (!referralId) {
      setReferralPreview(null);
      setReferralLookupError("");
      setReferralLookupLoading(false);
      return;
    }

    if (!isValidMemberIdFormat(referralId)) {
      setReferralPreview(null);
      setReferralLookupError("");
      setReferralLookupLoading(false);
      return;
    }

    if (phone && referralId.startsWith(`${phone}-`)) {
      setReferralPreview(null);
      setReferralLookupError("You cannot use your own Member ID as referral.");
      setReferralLookupLoading(false);
      return;
    }

    let cancelled = false;
    setReferralLookupLoading(true);
    setReferralLookupError("");
    setReferralPreview(null);

    const timer = setTimeout(async () => {
      const result = await lookupReferralUser(referralId);
      if (cancelled) return;

      setReferralLookupLoading(false);
      if (result?.status === true && result.response) {
        setReferralPreview(result.response);
      } else {
        setReferralLookupError(
          result?.errors?.[0]?.msg ||
            result?.message ||
            "Referral Member ID was not found.",
        );
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.referralId, formData.phone, lookupReferralUser]);

  const handleAmountChange = (e) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setCustomAmount(numericValue);
    setFormData({ ...formData, amount: numericValue });
    setErrorsList("", "amount");
  };

  useEffect(() => {
    if (!isFixedAmount) {
      setFormData((prev) => ({ ...prev, amount: customAmount }));
    }
  }, [customAmount, isFixedAmount]);

  const onSubmit = async (e) => {
    e.preventDefault();

    setErrorsList("", "donorName");
    setErrorsList("", "phone");
    setErrorsList("", "email");
    setErrorsList("", "amount");
    setErrorsList("", "utrNumber");
    setErrorsList("", "referralId");

    const validationRules = [
      { path: "donorName", msg: "Donor name is required." },
      { path: "phone", msg: "Phone number is required." },
      { path: "email", msg: "Email is required." },
      { path: "amount", msg: "Amount is required.", type: "number" },
    ];

    const errors = validateForm(formData, validationRules);

    if (errors.length) {
      errors.forEach((error) => {
        setErrorsList(error.msg, error.path);
      });
      return;
    }

    const txnRefResult = validateTransactionReference(formData.utrNumber);
    if (!txnRefResult.valid) {
      setErrorsList(txnRefResult.error, "utrNumber");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setErrorsList("Amount must be greater than 0", "amount");
      return;
    }

    if (amount < 1) {
      setErrorsList("Minimum donation amount is ₹1", "amount");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorsList("Invalid email format", "email");
      return;
    }

    if (
      formData.referralId &&
      !isValidMemberIdFormat(formData.referralId)
    ) {
      setErrorsList(
        "Please provide a valid referral Member ID, or leave it blank.",
        "referralId",
      );
      return;
    }

    if (formData.referralId && referralLookupLoading) {
      setErrorsList(
        "Please wait while we verify the referral Member ID.",
        "referralId",
      );
      return;
    }

    if (formData.referralId && !referralPreview) {
      setErrorsList(
        referralLookupError ||
          "Please enter a valid active referral Member ID, or leave it blank.",
        "referralId",
      );
      return;
    }

    const submitData = {
      donorName: formData.donorName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address?.trim() || "",
      amount,
      utrNumber: txnRefResult.sanitized,
      paymentMode,
    };

    // Explicit value or cleared field → send referralId.
    // Untouched empty → omit so server can fall back to logged-in user.referralId.
    if (formData.referralId) {
      submitData.referralId = formData.referralId;
    } else if (referralTouched) {
      submitData.referralId = "";
    }

    const result = await submitDonationRequest(submitData);
    if (result && result.status) {
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const upiId = donationSettings.upi?.upiId;
  const upiHolderName = donationSettings.upi?.upiHolderName;
  const bank = donationSettings.bank || {};
  const effectiveAmount = getEffectiveAmount();
  const showUpiQr = paymentMode === "UPI" && effectiveAmount >= 1;

  const warningText =
    paymentMode === "UPI"
      ? "Scan the QR code or pay using the UPI ID below. After payment, enter your UTR or transaction reference number and submit for admin verification."
      : "Transfer the amount to the bank account below. After payment, enter your UTR or transaction reference number and submit for admin verification.";

  return (
    <AdvancedModal
      show={show}
      onHide={handleClose}
      size="lg"
      closeButton
      className="donation-form-modal"
      bodyClassName="common-modal-body--start"
      title={`Donate via ${paymentMode === "UPI" ? "UPI" : "Bank Transfer"}`}
    >
      <p className="donation-form-modal__warning">{warningText}</p>

      {paymentMode === "UPI" && !isFixedAmount && (
        <Form.Group className="donation-form-modal__amount-field mb-3">
          <Form.Label>Enter Amount</Form.Label>
          <Form.Control
            type="text"
            value={customAmount}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            inputMode="numeric"
            pattern="[0-9]*"
            className={errorList.amount ? "form-input-invalid" : ""}
          />
          <Form.Text className="text-muted">
            Minimum donation amount is ₹1
          </Form.Text>
          <Errors current_key="amount" />
        </Form.Group>
      )}

      {paymentMode === "UPI" && (
        <div className="donation-form-modal__pay-row">
          <div className="donation-form-modal__pay-details">
            {upiId && (
              <div className="donation-form-modal__detail">
                <span className="donation-form-modal__detail-label">UPI ID</span>
                <span className="donation-form-modal__detail-value">{upiId}</span>
              </div>
            )}
            {upiHolderName && (
              <div className="donation-form-modal__detail">
                <span className="donation-form-modal__detail-label">
                  Account Holder
                </span>
                <span className="donation-form-modal__detail-value">
                  {upiHolderName}
                </span>
              </div>
            )}
          </div>

          <div className="donation-form-modal__divider" aria-hidden="true" />

          <div className="donation-form-modal__qr">
            {loadingQRCode && showUpiQr && (
              <div className="donation-form-modal__qr-status">
                <Spinner animation="border" variant="primary" size="sm" />
                <span>Generating QR...</span>
              </div>
            )}

            {!loadingQRCode && qrCodeData && showUpiQr && (
              <>
                <img
                  src={qrCodeData}
                  alt="UPI QR Code"
                  className="donation-form-modal__qr-img"
                />
                {isFixedAmount && (
                  <p className="donation-form-modal__qr-amount">
                    Amount: ₹{initialAmount}
                  </p>
                )}
                {!isFixedAmount && effectiveAmount >= 1 && (
                  <p className="donation-form-modal__qr-amount">
                    Amount: ₹{effectiveAmount}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {paymentMode === "BANK" && (
        <div className="donation-form-modal__pay-row donation-form-modal__pay-row--bank">
          <div className="donation-form-modal__pay-details">
            <div className="donation-form-modal__detail">
              <span className="donation-form-modal__detail-label">Bank Name</span>
              <span className="donation-form-modal__detail-value">
                {bank.bankName || "N/A"}
              </span>
            </div>
            <div className="donation-form-modal__detail">
              <span className="donation-form-modal__detail-label">
                Account Holder
              </span>
              <span className="donation-form-modal__detail-value">
                {bank.accountHolderName || "N/A"}
              </span>
            </div>
            <div className="donation-form-modal__detail">
              <span className="donation-form-modal__detail-label">
                Account Number
              </span>
              <span className="donation-form-modal__detail-value">
                {bank.accountNo || "N/A"}
              </span>
            </div>
            <div className="donation-form-modal__detail">
              <span className="donation-form-modal__detail-label">IFSC Code</span>
              <span className="donation-form-modal__detail-value">
                {bank.ifscCode || "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}

      <Form onSubmit={onSubmit} className="donation-form-modal__form">
        <Row className="g-3">
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>
                Donor Name <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="donorName"
                value={formData.donorName}
                onChange={onChange}
                placeholder="Enter your name"
                required
              />
              <Errors current_key="donorName" />
            </Form.Group>
          </Col>

          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>
                Phone Number <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="phone"
                value={formData.phone}
                onChange={onChange}
                placeholder="Enter your phone number"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="10"
                minLength="10"
                className={errorList.phone ? "form-input-invalid" : ""}
              />
              <Errors current_key="phone" />
            </Form.Group>
          </Col>

          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>
                Email <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                placeholder="Enter your email"
                required
              />
              <Errors current_key="email" />
            </Form.Group>
          </Col>

          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Address (Optional)</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={onChange}
                placeholder="Enter your address (optional)"
              />
              <Errors current_key="address" />
            </Form.Group>
          </Col>

          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Referral Member ID (Optional)</Form.Label>
              <Form.Control
                type="text"
                name="referralId"
                value={formData.referralId}
                onChange={handleReferralIdChange}
                onPaste={handleReferralIdPaste}
                onKeyDown={handleReferralIdKeyDown}
                placeholder="9999999999-01"
                maxLength={13}
                className={
                  errorList.referralId || referralLookupError
                    ? "form-input-invalid"
                    : ""
                }
              />
              {referralLookupLoading && (
                <Form.Text className="text-muted">
                  Checking referral…
                </Form.Text>
              )}
              {!referralLookupLoading && referralPreview?.name && (
                <Form.Text className="text-success">
                  Referred by: {referralPreview.name} (
                  {referralPreview.memberId})
                </Form.Text>
              )}
              {!referralLookupLoading && referralLookupError && (
                <Form.Text className="text-danger">
                  {referralLookupError}
                </Form.Text>
              )}
              <Errors current_key="referralId" />
            </Form.Group>
          </Col>

          {paymentMode === "BANK" && (
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>
                  Amount <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={onChange}
                  placeholder="Enter amount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  className={errorList.amount ? "form-input-invalid" : ""}
                />
                <Errors current_key="amount" />
              </Form.Group>
            </Col>
          )}

          <Col xs={12}>
            <Form.Group>
              <Form.Label>
                UTR / Transaction Reference{" "}
                <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="utrNumber"
                value={formData.utrNumber}
                onChange={onChange}
                placeholder="Enter UTR or transaction reference number"
                required
                maxLength={22}
                autoComplete="off"
                spellCheck={false}
                className={errorList.utrNumber ? "form-input-invalid" : ""}
              />
              <Form.Text className="text-muted">
                Use the UTR or transaction reference from your UPI / bank payment
                receipt (8-22 letters or numbers).
              </Form.Text>
              <Errors current_key="utrNumber" />
            </Form.Group>
          </Col>
        </Row>

        <div className="donation-form-modal__actions">
          <button
            type="submit"
            className="home-btn home-btn--primary home-btn--compact"
            disabled={loadingSubmitDonation || referralLookupLoading}
          >
            {loadingSubmitDonation ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                Processing...
              </>
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </Form>
    </AdvancedModal>
  );
};

DonationModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  paymentMode: PropTypes.oneOf(["UPI", "BANK"]).isRequired,
  initialAmount: PropTypes.number,
  isFixedAmount: PropTypes.bool,
  donationSettings: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  loggedInUser: state.auth.user,
  loadingSubmitDonation: state.donation.loadingSubmitDonation,
  loadingQRCode: state.donation.loadingQRCode,
  qrCodeData: state.donation.qrCodeData,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  generateDonationQRCode,
  submitDonationRequest,
  setErrorsList,
  clearQRCode,
  lookupReferralUser,
})(DonationModal);
