import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Button, Form } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import { FaCheckCircle, FaRegUser, FaUserFriends, FaUsers } from "react-icons/fa";
import { IoMailOpenOutline } from "react-icons/io5";
import { MdOutlinePhone } from "react-icons/md";

import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import CopyIcon from "@src/views/Common/CopyIcon";
import CommonSpinner from "@src/views/Common/Loaders/CommonSpinner";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import MembershipPlanCard from "@src/views/Auth/MembershipPlanCard";
import CustomSelect from "@src/views/Common/CustomSelect";
import { fetchCommunities } from "@src/actions/masterDataActions";
import { handleNumberInput, formatIndianNumber } from "@src/utils/helper";
import {
  formatPlanDuration,
  formatPlanPrice,
} from "@src/utils/membershipPlanUtils";

const STEPS = { INFO: 1, PLAN: 2, CONFIRM: 3 };
const STEP_LABELS = ["Details", "Plan", "Confirm"];

const INITIAL_FORM = {
  community: null,
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const FieldError = ({ message }) =>
  message ? (
    <Form.Text className="form-error-message">{message}</Form.Text>
  ) : null;

FieldError.propTypes = {
  message: PropTypes.string,
};

const CreateUserFromWalletModal = ({
  show,
  onHide,
  balance,
  plans,
  loadingPlans,
  creating,
  onSubmit,
  onCopy,
  referralMemberId,
  referralName,
}) => {
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(STEPS.INFO);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  const { community, name, phone, email, password, confirmPassword } = formData;

  const selectedPlan = useMemo(
    () => (plans || []).find((plan) => plan._id === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  const loadCommunities = useCallback(
    () => dispatch(fetchCommunities()),
    [dispatch],
  );

  const resetState = useCallback(() => {
    setCurrentStep(STEPS.INFO);
    setFormData(INITIAL_FORM);
    setSelectedPlanId("");
    setFieldErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResult(null);
    setSubmitError("");
    setShowWelcome(false);
  }, []);

  useEffect(() => {
    if (show) {
      resetState();
    }
  }, [show, resetState]);

  const onChange = (e) => {
    const { name: field, value } = e.target;
    let next = value;
    if (field === "phone") {
      next = String(value).replace(/\D/g, "").slice(0, 10);
    }
    setFormData((prev) => ({ ...prev, [field]: next }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleCommunityChange = (option) => {
    setFormData((prev) => ({ ...prev, community: option }));
    if (fieldErrors.community) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy.community;
        return copy;
      });
    }
  };

  const validateInfo = () => {
    const errors = {};
    if (!community?.value) {
      errors.community = "Please select a community.";
    }
    if (!name.trim() || name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters.";
    } else if (name.trim().length > 50) {
      errors.name = "Name must be at most 50 characters.";
    }
    if (!/^\d{10}$/.test(phone)) {
      errors.phone = "Phone number must be 10 digits.";
    }
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInfoNext = (e) => {
    e?.preventDefault?.();
    if (!validateInfo()) return;
    setSubmitError("");
    setCurrentStep(STEPS.PLAN);
  };

  const handlePlanNext = () => {
    if (!selectedPlanId) {
      setSubmitError("Please select a membership plan to continue.");
      return;
    }
    if (selectedPlan && Number(balance) < Number(selectedPlan.price)) {
      setSubmitError(
        `Insufficient wallet balance for this plan. Required ₹${formatIndianNumber(selectedPlan.price)}, available ₹${formatIndianNumber(balance || 0)}.`,
      );
      return;
    }
    setSubmitError("");
    setCurrentStep(STEPS.CONFIRM);
  };

  const handleCreate = async () => {
    if (!validateInfo()) {
      setCurrentStep(STEPS.INFO);
      return;
    }
    if (!selectedPlanId || !selectedPlan) {
      setSubmitError("Please select a membership plan.");
      setCurrentStep(STEPS.PLAN);
      return;
    }
    if (Number(balance) < Number(selectedPlan.price)) {
      setSubmitError(
        `Insufficient wallet balance. This plan costs ₹${formatIndianNumber(selectedPlan.price)}.`,
      );
      setCurrentStep(STEPS.PLAN);
      return;
    }

    setSubmitError("");
    const response = await onSubmit({
      name: name.trim(),
      phone,
      email: email.trim(),
      password,
      community: community?.value,
      planId: selectedPlanId,
    });

    if (response?.status && response?.response) {
      setResult(response.response);
      setShowWelcome(true);
      return;
    }

    const apiErrors = response?.errors || response?.data?.errors;
    if (Array.isArray(apiErrors) && apiErrors.length) {
      const next = {};
      apiErrors.forEach((err) => {
        if (err.path) next[err.path] = err.msg;
      });
      if (Object.keys(next).length) {
        setFieldErrors(next);
        if (
          next.community ||
          next.name ||
          next.phone ||
          next.email ||
          next.password
        ) {
          setCurrentStep(STEPS.INFO);
        }
      }
    }

    setSubmitError(
      response?.message ||
        response?.data?.message ||
        "Failed to create user from wallet.",
    );
  };

  const handleClose = () => {
    onHide(Boolean(result));
    resetState();
  };

  const renderStepIndicator = () => (
    <div className="auth-steps" aria-label="Create user progress">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isComplete = currentStep > stepNumber;
        return (
          <div
            key={label}
            className={`auth-steps__item ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
          >
            <span className="auth-steps__number">{stepNumber}</span>
            <span className="auth-steps__label">{label}</span>
          </div>
        );
      })}
    </div>
  );

  const renderInfoStep = () => (
    <>
      <div className="auth-field">
        <Form.Label
          htmlFor="wallet-create-community"
          className="auth-field__label"
        >
          <span className="auth-field__label-icon">
            <FaUsers size={14} />
          </span>
          Community <span className="auth-field__required">*</span>
        </Form.Label>
        <CustomSelect
          id="wallet-create-community"
          value={community}
          onChange={handleCommunityChange}
          loadOptions={loadCommunities}
          placeholder="Select community"
          className={fieldErrors.community ? "form-input-invalid" : ""}
        />
        <FieldError message={fieldErrors.community} />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="wallet-create-name" className="auth-field__label">
          <span className="auth-field__label-icon">
            <FaRegUser size={14} />
          </span>
          Name <span className="auth-field__required">*</span>
        </Form.Label>
        <Form.Control
          required
          type="text"
          id="wallet-create-name"
          name="name"
          value={name}
          onChange={onChange}
          placeholder="Enter full name"
          className={`auth-field__control ${fieldErrors.name ? "form-input-invalid" : ""}`}
        />
        <FieldError message={fieldErrors.name} />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="wallet-create-phone" className="auth-field__label">
          <span className="auth-field__label-icon">
            <MdOutlinePhone size={15} />
          </span>
          Phone Number <span className="auth-field__required">*</span>
        </Form.Label>
        <Form.Control
          required
          type="tel"
          id="wallet-create-phone"
          name="phone"
          value={phone}
          onChange={onChange}
          maxLength="10"
          minLength="10"
          placeholder="10-digit mobile number"
          className={`auth-field__control ${fieldErrors.phone ? "form-input-invalid" : ""}`}
          onKeyDown={handleNumberInput}
        />
        <FieldError message={fieldErrors.phone} />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="wallet-create-email" className="auth-field__label">
          <span className="auth-field__label-icon">
            <IoMailOpenOutline size={14} />
          </span>
          Email <span className="auth-field__required">*</span>
        </Form.Label>
        <Form.Control
          required
          type="email"
          id="wallet-create-email"
          name="email"
          value={email}
          onChange={onChange}
          placeholder="you@example.com"
          className={`auth-field__control ${fieldErrors.email ? "form-input-invalid" : ""}`}
        />
        <FieldError message={fieldErrors.email} />
      </div>

      <div className="auth-field">
        <Form.Label
          htmlFor="wallet-create-referral"
          className="auth-field__label"
        >
          <span className="auth-field__label-icon">
            <FaUserFriends size={14} />
          </span>
          Referral Member ID
        </Form.Label>
        <Form.Control
          type="text"
          id="wallet-create-referral"
          name="referralId"
          value={referralMemberId || ""}
          readOnly
          placeholder="9999999999-01"
          className="auth-field__control"
        />
        {referralMemberId ? (
          <p className="auth-field__hint mb-0 text-success">
            Referred by: {referralName || "You"} ({referralMemberId})
          </p>
        ) : null}
      </div>

      <div className="auth-field">
        <Form.Label
          htmlFor="wallet-create-password"
          className="auth-field__label"
        >
          <span className="auth-field__label-icon">
            <BiLockAlt size={15} />
          </span>
          Password <span className="auth-field__required">*</span>
        </Form.Label>
        <div className="auth-input-wrap">
          <Form.Control
            required
            type={showPassword ? "text" : "password"}
            id="wallet-create-password"
            name="password"
            value={password}
            onChange={onChange}
            placeholder="Min. 6 characters"
            className={`auth-field__control ${fieldErrors.password ? "form-input-invalid" : ""}`}
            minLength={6}
          />
          <button
            type="button"
            className="auth-input-wrap__toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <AiOutlineEye size={18} />
            ) : (
              <AiOutlineEyeInvisible size={18} />
            )}
          </button>
        </div>
        <FieldError message={fieldErrors.password} />
      </div>

      <div className="auth-field">
        <Form.Label
          htmlFor="wallet-create-confirm-password"
          className="auth-field__label"
        >
          <span className="auth-field__label-icon">
            <BiLockAlt size={15} />
          </span>
          Confirm Password <span className="auth-field__required">*</span>
        </Form.Label>
        <div className="auth-input-wrap">
          <Form.Control
            required
            type={showConfirmPassword ? "text" : "password"}
            id="wallet-create-confirm-password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            placeholder="Re-enter password"
            className={`auth-field__control ${fieldErrors.confirmPassword ? "form-input-invalid" : ""}`}
            minLength={6}
          />
          <button
            type="button"
            className="auth-input-wrap__toggle"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={
              showConfirmPassword ? "Hide password" : "Show password"
            }
          >
            {showConfirmPassword ? (
              <AiOutlineEye size={18} />
            ) : (
              <AiOutlineEyeInvisible size={18} />
            )}
          </button>
        </div>
        <FieldError message={fieldErrors.confirmPassword} />
      </div>

      <div className="auth-actions">
        <Button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={handleInfoNext}
          disabled={creating}
        >
          Continue to Plans
        </Button>
      </div>
    </>
  );

  const renderPlanStep = () => (
    <>
      <p className="auth-step-intro">
        Select a membership plan. Amount will be deducted from your wallet
        balance (₹{formatIndianNumber(balance || 0)}).
      </p>

      {loadingPlans ? (
        <BouncingLoader minHeight="120px" message="Loading plans..." />
      ) : !(plans || []).length ? (
        <Alert variant="warning" className="mb-3">
          No membership plans are available right now.
        </Alert>
      ) : (
        <div className="membership-plans-grid mb-3">
          {(plans || []).map((plan) => {
            const affordable = Number(balance) >= Number(plan.price);
            return (
              <div
                key={plan._id}
                className={
                  affordable
                    ? undefined
                    : "wallet-create-plan--unaffordable"
                }
                title={
                  affordable
                    ? undefined
                    : "Insufficient wallet balance for this plan"
                }
              >
                <MembershipPlanCard
                  plan={plan}
                  selected={selectedPlanId}
                  onSelect={(id) => {
                    if (Number(balance) < Number(plan.price)) {
                      setSubmitError(
                        `Insufficient wallet balance for ${plan.name}. Required ₹${formatIndianNumber(plan.price)}.`,
                      );
                      return;
                    }
                    setSubmitError("");
                    setSelectedPlanId(id);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="auth-actions auth-actions--split">
        <Button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => {
            setSubmitError("");
            setCurrentStep(STEPS.INFO);
          }}
          disabled={creating}
        >
          Back
        </Button>
        <Button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={handlePlanNext}
          disabled={creating || loadingPlans || !selectedPlanId}
        >
          Continue
        </Button>
      </div>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <div className="registration-summary mb-4">
        <h6 className="registration-summary__title">Registration Summary</h6>
        {community?.label ? (
          <div className="registration-summary__row">
            <span>Community</span>
            <strong>{community.label}</strong>
          </div>
        ) : null}
        <div className="registration-summary__row">
          <span>Name</span>
          <strong>{name}</strong>
        </div>
        <div className="registration-summary__row">
          <span>Phone</span>
          <strong>{phone}</strong>
        </div>
        <div className="registration-summary__row">
          <span>Email</span>
          <strong>{email}</strong>
        </div>
        {referralMemberId ? (
          <div className="registration-summary__row">
            <span>Referral</span>
            <strong>
              {referralName
                ? `${referralName} (${referralMemberId})`
                : referralMemberId}
            </strong>
          </div>
        ) : null}
        {selectedPlan ? (
          <>
            <div className="registration-summary__row">
              <span>Plan</span>
              <strong>{selectedPlan.name}</strong>
            </div>
            <div className="registration-summary__row">
              <span>Duration</span>
              <strong>{formatPlanDuration(selectedPlan)}</strong>
            </div>
            <div className="registration-summary__row registration-summary__row--total">
              <span>Amount</span>
              <strong>{formatPlanPrice(selectedPlan)}</strong>
            </div>
          </>
        ) : null}
      </div>

      <p className="auth-step-intro small">
        ₹{formatIndianNumber(selectedPlan?.price || 0)} will be deducted from
        your wallet and the new member will be activated immediately.
      </p>

      <div className="auth-actions auth-actions--split">
        <Button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => {
            setSubmitError("");
            setCurrentStep(STEPS.PLAN);
          }}
          disabled={creating}
        >
          Back
        </Button>
        <Button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <>
              <CommonSpinner size="sm" className="common-spinner--button me-2" />
              Processing...
            </>
          ) : (
            "Create & Pay from Wallet"
          )}
        </Button>
      </div>
    </>
  );

  const welcomeUser = result?.user || {};
  const welcomeCredentials = result?.credentials || {};
  const welcomePlan = result?.plan || {};
  const welcomeWallet = result?.wallet || {};

  return (
    <>
      <AdvancedModal
        show={show && !showWelcome}
        onHide={handleClose}
        title="Create user from wallet"
        size={currentStep === STEPS.INFO ? "md" : "lg"}
        closeButton
        backdrop={creating ? "static" : true}
        keyboard={!creating}
        className="wallet-create-user-modal"
        bodyClassName="wallet-create-user-modal__body"
      >
        <Form noValidate className="auth-form" onSubmit={handleInfoNext}>
          {renderStepIndicator()}

          {submitError ? (
            <Alert variant="danger" className="mb-3">
              {submitError}
            </Alert>
          ) : null}

          {currentStep === STEPS.INFO && renderInfoStep()}
          {currentStep === STEPS.PLAN && renderPlanStep()}
          {currentStep === STEPS.CONFIRM && renderConfirmStep()}
        </Form>
      </AdvancedModal>

      <AdvancedModal
        show={show && showWelcome}
        onHide={handleClose}
        className="welcome-modal welcome-modal--success"
        size="md"
        backdrop="static"
        keyboard={false}
        closeButton={false}
        icon={
          <div
            className="welcome-modal__icon-ring welcome-modal__icon-ring--success"
            aria-hidden
          >
            <FaCheckCircle className="welcome-modal__icon" />
          </div>
        }
        bodyClassName="welcome-modal__body"
        actions={[
          {
            label: "Done",
            onClick: handleClose,
            className: "welcome-modal__cta",
          },
        ]}
      >
        <div className="welcome-modal__content">
          <h2 className="welcome-modal__title">
            User created{" "}
            <span className="welcome-modal__name">
              {welcomeUser.name || "successfully"}
            </span>
            !
          </h2>

          <p className="welcome-modal__subtitle">
            {result?.summary ||
              `Created ${welcomeUser.name} (Member ID: ${welcomeCredentials.memberId || welcomeUser.memberId}) with ${welcomePlan.name || "selected"} plan.`}
          </p>

          <p className="welcome-modal__message">
            Membership is active. Share these credentials with the new member so
            they can log in.
          </p>

          <div className="welcome-modal__credentials">
            <div className="welcome-modal__credential-card">
              <span className="welcome-modal__credential-label">Member ID</span>
              <div className="welcome-modal__credential-value">
                <code>
                  {welcomeCredentials.memberId || welcomeUser.memberId}
                </code>
                <CopyIcon
                  textToCopy={
                    welcomeCredentials.memberId || welcomeUser.memberId || ""
                  }
                  onCopy={() => onCopy?.("Member ID copied to clipboard")}
                  className="welcome-modal__copy"
                />
              </div>
            </div>

            {welcomeCredentials.password ? (
              <div className="welcome-modal__credential-card">
                <span className="welcome-modal__credential-label">Password</span>
                <div className="welcome-modal__credential-value">
                  <code>{welcomeCredentials.password}</code>
                  <CopyIcon
                    textToCopy={welcomeCredentials.password}
                    onCopy={() => onCopy?.("Password copied to clipboard")}
                    className="welcome-modal__copy"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="welcome-modal__status welcome-modal__status--success">
            <span className="welcome-modal__status-dot" aria-hidden />
            Status: ACTIVE
            {welcomePlan.name ? ` · ${welcomePlan.name}` : ""}
            {welcomeWallet.deducted != null
              ? ` · −₹${formatIndianNumber(welcomeWallet.deducted)}`
              : ""}
          </div>

          <div className="welcome-modal__note">
            <p>
              Wallet balance after deduction: ₹
              {formatIndianNumber(welcomeWallet.balance || 0)}. The new member
              can log in with the Member ID and password above.
            </p>
          </div>
        </div>
      </AdvancedModal>
    </>
  );
};

CreateUserFromWalletModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  balance: PropTypes.number,
  plans: PropTypes.array,
  loadingPlans: PropTypes.bool,
  creating: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCopy: PropTypes.func,
  referralMemberId: PropTypes.string,
  referralName: PropTypes.string,
};

CreateUserFromWalletModal.defaultProps = {
  balance: 0,
  plans: [],
  loadingPlans: false,
  creating: false,
  onCopy: undefined,
  referralMemberId: "",
  referralName: "",
};

export default CreateUserFromWalletModal;
