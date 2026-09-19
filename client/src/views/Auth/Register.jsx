import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Form,
  Button,
} from "react-bootstrap";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { connect } from "react-redux";

import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import {
  FaRegUser,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";
import { MdOutlinePhone } from "react-icons/md";
import { IoMailOpenOutline } from "react-icons/io5";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import {
  register,
  setErrors,
  removeRegistrationErrors,
  lookupReferralUser,
} from "@src/actions/auth";
import {
  fetchMembershipPlans,
  createPaymentOrder,
  fetchPaymentStatus,
} from "@src/actions/membershipActions";
import { setAlert } from "@src/actions/alert";
import { fetchPublicCommunities } from "@src/actions/commonActions";
import { handleNumberInput } from "@src/utils/helper";
import { openCashfreeCheckout } from "@src/utils/cashfreeCheckout";
import {
  formatPlanDuration,
  formatPlanPrice,
} from "@src/utils/membershipPlanUtils";
import {
  getProcessedOrderOutcome,
  isOrderAlreadyProcessed,
  isStickyTerminalOutcome,
  markOrderTerminal,
  savePendingPayment,
} from "@src/utils/paymentReturnHelper";
import {
  PAYMENT_OUTCOMES,
  getPaymentOutcomeAlertVariant,
  getPaymentOutcomeMessage,
  pollPaymentStatus,
} from "@src/utils/paymentStatusPoller";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import CopyIcon from "@src/views/Common/CopyIcon";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import CommonSpinner from "@src/views/Common/Loaders/CommonSpinner";
import MembershipPlanCard from "@src/views/Auth/MembershipPlanCard";
import AuthShell from "@src/views/Auth/AuthShell";
import CustomSelect from "@src/views/Common/CustomSelect";

const STEPS = { INFO: 1, PLAN: 2, PAYMENT: 3 };
const REGISTRATION_STORAGE_KEY = "rsf_pending_registration";

const Register = ({
  errorList,
  setErrors,
  removeRegistrationErrors,
  register,
  lookupReferralUser,
  loadingRegister,
  setAlert,
  fetchMembershipPlans,
  createPaymentOrder,
  fetchPaymentStatus,
  common: { commonSettings, loadingCommonSettings },
  membership: { plans, loadingPlans, creatingOrder },
  fetchPublicCommunities,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFormData = {
    community: null,
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralId: "",
    terms_accepted: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(STEPS.INFO);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    memberId: "",
    name: "",
    password: "",
    accountStatus: "pending",
  });
  const [referralPreview, setReferralPreview] = useState(null);
  const [referralLookupLoading, setReferralLookupLoading] = useState(false);
  const [referralLookupError, setReferralLookupError] = useState("");

  const {
    community,
    name,
    phone,
    email,
    password,
    confirmPassword,
    referralId,
    terms_accepted,
  } = formData;

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan._id === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  const registrationAvailable = useMemo(() => {
    if (loadingCommonSettings || loadingPlans) return null;
    if (commonSettings?.registerEnabled === false) {
      return {
        allowed: false,
        message: "New registrations are currently disabled. Please try again later.",
      };
    }
    if (commonSettings?.paymentGateway?.enabled !== true) {
      return {
        allowed: false,
        message:
          "Online membership payment is not available yet. Please contact support.",
      };
    }
    if (!plans.length) {
      return {
        allowed: false,
        message:
          "No membership plans are available for registration at this time.",
      };
    }
    return { allowed: true, message: "" };
  }, [commonSettings, loadingCommonSettings, loadingPlans, plans]);

  useEffect(() => {
    fetchMembershipPlans();
    return () => {
      removeRegistrationErrors();
    };
  }, [fetchMembershipPlans, removeRegistrationErrors]);

  const pendingRegistrationMemoryRef = useRef(null);
  const paymentReturnAttemptRef = useRef(null);

  const savePendingRegistration = useCallback((data) => {
    pendingRegistrationMemoryRef.current = data;
    try {
      sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Private mode / WebView may block storage; memory fallback still works in-tab.
    }
  }, []);

  const loadPendingRegistration = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(REGISTRATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        pendingRegistrationMemoryRef.current = parsed;
        return parsed;
      }
    } catch {
      // fall through to memory
    }
    return pendingRegistrationMemoryRef.current;
  }, []);

  const clearPendingRegistration = useCallback(() => {
    pendingRegistrationMemoryRef.current = null;
    try {
      sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const showWelcomeWithStatus = useCallback(
    ({ memberId, name: userName, password: userPassword, accountStatus }) => {
      setRegistrationData({
        memberId,
        name: userName,
        password: userPassword || "",
        accountStatus,
      });
      setShowWelcomeModal(true);
    },
    [],
  );

  const handlePaymentReturn = useCallback(
    async (orderId) => {
      if (isOrderAlreadyProcessed(orderId)) {
        return;
      }

      const priorOutcome = getProcessedOrderOutcome(orderId);
      // Only skip re-poll for definitive outcomes. Pending/timeout/network must re-check
      // (common after UPI app-switch on slower phones).
      if (isStickyTerminalOutcome(priorOutcome)) {
        if (priorOutcome === PAYMENT_OUTCOMES.SUCCESS) {
          return;
        }
        const pending = loadPendingRegistration();
        showWelcomeWithStatus({
          memberId: pending?.memberId || "",
          name: pending?.name || "",
          password: pending?.password || "",
          accountStatus: "failed",
        });
        setCurrentStep(STEPS.PAYMENT);
        setSearchParams({}, { replace: true });
        return;
      }

      setIsVerifyingPayment(true);
      const pending = loadPendingRegistration();

      try {
        const { outcome, paymentData } = await pollPaymentStatus({
          orderId,
          fetchStatus: (id, options) =>
            fetchPaymentStatus(id, options),
          fromReturn: true,
        });

        markOrderTerminal(orderId, outcome);

        if (outcome === PAYMENT_OUTCOMES.SUCCESS) {
          setSearchParams({}, { replace: true });
          showWelcomeWithStatus({
            memberId: paymentData?.user?.memberId || pending?.memberId || "",
            name: paymentData?.user?.name || pending?.name || "",
            password: pending?.password || "",
            accountStatus: "active",
          });
          clearPendingRegistration();
          return;
        }

        if (
          outcome === PAYMENT_OUTCOMES.FAILED ||
          outcome === PAYMENT_OUTCOMES.ABANDONED
        ) {
          setSearchParams({}, { replace: true });
          showWelcomeWithStatus({
            memberId: paymentData?.user?.memberId || pending?.memberId || "",
            name: paymentData?.user?.name || pending?.name || "",
            password: pending?.password || "",
            accountStatus: "failed",
          });
          if (paymentData?.user?._id) {
            setRegisteredUserId(paymentData.user._id);
          }
          setCurrentStep(STEPS.PAYMENT);
          return;
        }

        // Keep order_id in URL so refresh re-polls for in-flight UPI/network cases.
        if (outcome === PAYMENT_OUTCOMES.NETWORK_ERROR) {
          setAlert(
            getPaymentOutcomeMessage(outcome),
            getPaymentOutcomeAlertVariant(outcome),
          );
          setCurrentStep(STEPS.PAYMENT);
          return;
        }

        if (outcome === PAYMENT_OUTCOMES.PENDING) {
          showWelcomeWithStatus({
            memberId: paymentData?.user?.memberId || pending?.memberId || "",
            name: paymentData?.user?.name || pending?.name || "",
            password: pending?.password || "",
            accountStatus: "pending",
          });
          if (paymentData?.user?._id) {
            setRegisteredUserId(paymentData.user._id);
          }
          setAlert(
            getPaymentOutcomeMessage(outcome),
            getPaymentOutcomeAlertVariant(outcome),
          );
          return;
        }

        showWelcomeWithStatus({
          memberId: paymentData?.user?.memberId || pending?.memberId || "",
          name: paymentData?.user?.name || pending?.name || "",
          password: pending?.password || "",
          accountStatus: "pending",
        });
        if (paymentData?.user?._id) {
          setRegisteredUserId(paymentData.user._id);
        }
        setAlert(
          getPaymentOutcomeMessage(outcome),
          getPaymentOutcomeAlertVariant(outcome),
        );
      } finally {
        setIsVerifyingPayment(false);
      }
    },
    [
      clearPendingRegistration,
      fetchPaymentStatus,
      loadPendingRegistration,
      setAlert,
      setSearchParams,
      showWelcomeWithStatus,
    ],
  );

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    if (
      !orderId ||
      isVerifyingPayment ||
      paymentReturnAttemptRef.current === orderId
    ) {
      return;
    }
    paymentReturnAttemptRef.current = orderId;
    handlePaymentReturn(orderId);
  }, [searchParams, handlePaymentReturn, isVerifyingPayment]);

  const referralFromUrl = useMemo(
    () => (searchParams.get("referralId") || "").trim(),
    [searchParams],
  );
  const isReferralLocked = Boolean(referralFromUrl);

  useEffect(() => {
    if (!referralFromUrl) return;

    setFormData((prev) => {
      if (prev.referralId === referralFromUrl) return prev;
      return { ...prev, referralId: referralFromUrl };
    });
  }, [referralFromUrl]);

  const onChange = (e) => {
    if (!e.target) return;
    const { name: fieldName, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData({ ...formData, [fieldName]: newValue });
  };

  const handleCommunityChange = (option) => {
    setFormData((prev) => ({ ...prev, community: option }));
  };

  const loadCommunities = useCallback(
    () => fetchPublicCommunities(),
    [fetchPublicCommunities],
  );

  const handleReferralIdChange = createMemberIdChangeHandler(
    onChange,
    "referralId",
  );
  const handleReferralIdPaste = createMemberIdPasteHandler();
  const handleReferralIdKeyDown = createMemberIdKeyDownHandler(
    referralId,
    onChange,
    "referralId",
  );

  useEffect(() => {
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
        setReferralLookupError("");
      } else {
        setReferralPreview(null);
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
  }, [referralId, phone, lookupReferralUser]);

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const validateInfoStep = () => {
    removeRegistrationErrors();
    const validationRules = [
      {
        path: "community",
        msg: "Please select a community.",
        validator: (value) => Boolean(value?.value),
      },
      { path: "name", msg: "Please provide a valid name." },
      {
        path: "phone",
        msg: "Please provide a valid phone number.",
        validator: (value) => value.length === 10,
      },
      {
        path: "email",
        msg: "Please provide a valid email address.",
        validator: (value) => value && /\S+@\S+\.\S+/.test(value),
      },
      {
        path: "password",
        msg: "Password must be at least 6 characters.",
        validator: (value) => value.length >= 6,
      },
      {
        path: "confirmPassword",
        msg: "Passwords do not match.",
        validator: (value) => value === formData.password,
      },
      {
        path: "referralId",
        msg: "Please provide a valid referral Member ID, or leave it blank.",
        validator: (value) => !value || isValidMemberIdFormat(value),
      },
      {
        path: "terms_accepted",
        msg: "You must accept the terms and conditions.",
        validator: (value) => value === true,
      },
    ];

    const errors = validateForm(formData, validationRules);

    if (formData.referralId && isValidMemberIdFormat(formData.referralId)) {
      if (referralLookupLoading) {
        errors.push({
          path: "referralId",
          msg: "Please wait while we verify the referral Member ID.",
        });
      } else if (!referralPreview) {
        errors.push({
          path: "referralId",
          msg:
            referralLookupError ||
            "Please enter a valid active referral Member ID, or leave it blank.",
        });
      }
    }

    if (errors.length) {
      setErrors(errors);
      setValidated(true);
      return false;
    }
    return true;
  };

  const handleInfoNext = (e) => {
    e.preventDefault();
    if (!validateInfoStep()) return;
    setValidated(true);
    setCurrentStep(STEPS.PLAN);
  };

  const handlePlanNext = () => {
    if (!selectedPlanId) {
      setAlert("Please select a membership plan to continue.", "danger");
      return;
    }
    setCurrentStep(STEPS.PAYMENT);
  };

  const handleRegisterAndPay = async () => {
    if (!validateInfoStep()) {
      setCurrentStep(STEPS.INFO);
      return;
    }
    if (!selectedPlanId) {
      setAlert("Please select a membership plan.", "danger");
      setCurrentStep(STEPS.PLAN);
      return;
    }

    setIsProcessing(true);

    try {
      let userId = registeredUserId;

      if (!userId) {
        const submitData = {
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
          email: formData.email,
          community: formData.community?.value,
          planId: selectedPlanId,
          ...(formData.referralId
            ? { referralId: formData.referralId }
            : {}),
        };

        const registerResult = await register(submitData);
        if (registerResult?.status !== true) {
          setIsProcessing(false);
          return;
        }

        const credentials = registerResult.response?.credentials;
        const user = registerResult.response?.user;
        userId = user?._id;

        if (!userId) {
          setAlert("Registration succeeded but user ID was missing.", "danger");
          setIsProcessing(false);
          return;
        }

        setRegisteredUserId(userId);
        savePendingRegistration({
          memberId: credentials?.memberId || user?.memberId,
          password: credentials?.password || formData.password,
          name: formData.name,
          userId,
        });
      }

      const orderResult = await createPaymentOrder({
        userId,
        planId: selectedPlanId,
      });

      if (orderResult?.status !== true) {
        setIsProcessing(false);
        return;
      }

      const paymentSessionId = orderResult.response?.paymentSessionId;
      const orderId = orderResult.response?.orderId;
      if (!paymentSessionId) {
        setAlert("Payment session could not be started.", "danger");
        setIsProcessing(false);
        return;
      }

      if (orderId) {
        savePendingPayment({ orderId, type: "registration" });
      }

      await openCashfreeCheckout(paymentSessionId, "_self");
      // Keep loading until checkout redirect — do not reset isProcessing here
    } catch {
      setAlert("Something went wrong during registration or payment.", "danger");
      setIsProcessing(false);
    }
  };

  const isBusy =
    isProcessing || loadingRegister || creatingOrder || isVerifyingPayment;

  const stepLabels = ["Your Details", "Choose Plan", "Payment"];

  const renderStepIndicator = () => (
    <div className="auth-steps" aria-label="Registration progress">
      {stepLabels.map((label, index) => {
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

  const renderBlockedState = () => (
    <div className="alert alert-warning mb-0" role="alert">
      {registrationAvailable?.message}
      <div className="mt-3">
        <Link to="/login" className="auth-link">
          Go to Login
        </Link>
      </div>
    </div>
  );

  const renderInfoStep = () => (
    <>
      <div className="auth-field">
        <Form.Label htmlFor="community" className="auth-field__label">
          <span className="auth-field__label-icon">
            <FaUsers size={14} />
          </span>
          Community <span className="auth-field__required">*</span>
        </Form.Label>
        <CustomSelect
          id="community"
          value={community}
          onChange={handleCommunityChange}
          loadOptions={loadCommunities}
          placeholder="Select community"
          className={errorList.community ? "form-input-invalid" : ""}
        />
        <Errors current_key="community" key="community" />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="name" className="auth-field__label">
          <span className="auth-field__label-icon">
            <FaRegUser size={14} />
          </span>
          Name <span className="auth-field__required">*</span>
        </Form.Label>
        <Form.Control
          required
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={onChange}
          placeholder="Enter your full name"
          className={`auth-field__control ${errorList.name ? "form-input-invalid" : ""}`}
        />
        <Errors current_key="name" key="name" />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="phone" className="auth-field__label">
          <span className="auth-field__label-icon">
            <MdOutlinePhone size={15} />
          </span>
          Phone Number <span className="auth-field__required">*</span>
        </Form.Label>
        <Form.Control
          required
          type="tel"
          id="phone"
          name="phone"
          value={phone}
          onChange={onChange}
          maxLength="10"
          minLength="10"
          placeholder="10-digit mobile number"
          className={`auth-field__control ${errorList.phone ? "form-input-invalid" : ""}`}
          onKeyDown={handleNumberInput}
        />
        <Errors current_key="phone" key="phone" />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="email" className="auth-field__label">
          <span className="auth-field__label-icon">
            <IoMailOpenOutline size={14} />
          </span>
          Email <span className="auth-field__required">*</span>
        </Form.Label>
        <Form.Control
          required
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={onChange}
          placeholder="you@example.com"
          className={`auth-field__control ${errorList.email ? "form-input-invalid" : ""}`}
        />
        <Errors current_key="email" key="email" />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="referralId" className="auth-field__label">
          <span className="auth-field__label-icon">
            <FaUserFriends size={14} />
          </span>
          Referral Member ID{" "}
          <span className="text-muted fw-normal">(optional)</span>
        </Form.Label>
        <Form.Control
          type="text"
          id="referralId"
          name="referralId"
          value={referralId}
          onChange={isReferralLocked ? undefined : handleReferralIdChange}
          onPaste={isReferralLocked ? undefined : handleReferralIdPaste}
          onKeyDown={isReferralLocked ? undefined : handleReferralIdKeyDown}
          placeholder="9999999999-01"
          maxLength={13}
          readOnly={isReferralLocked}
          className={`auth-field__control ${
            errorList.referralId || referralLookupError
              ? "form-input-invalid"
              : ""
          }`}
        />
        {referralLookupLoading && (
          <p className="auth-field__hint mb-0">Checking referral…</p>
        )}
        {!referralLookupLoading && referralPreview?.name && (
          <p className="auth-field__hint mb-0 text-success">
            Referred by: {referralPreview.name} ({referralPreview.memberId})
          </p>
        )}
        {!referralLookupLoading && referralLookupError && (
          <p className="auth-field__hint mb-0 text-danger">
            {referralLookupError}
          </p>
        )}
        <Errors current_key="referralId" key="referralId" />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="password" className="auth-field__label">
          <span className="auth-field__label-icon">
            <BiLockAlt size={15} />
          </span>
          Password <span className="auth-field__required">*</span>
        </Form.Label>
        <div className="auth-input-wrap">
          <Form.Control
            required
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            placeholder="Min. 6 characters"
            className={`auth-field__control ${errorList.password ? "form-input-invalid" : ""}`}
            minLength={6}
          />
          <button
            type="button"
            className="auth-input-wrap__toggle"
            onClick={toggleShowPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <AiOutlineEye size={18} />
            ) : (
              <AiOutlineEyeInvisible size={18} />
            )}
          </button>
        </div>
        <Errors current_key="password" key="password" />
      </div>

      <div className="auth-field">
        <Form.Label htmlFor="confirmPassword" className="auth-field__label">
          <span className="auth-field__label-icon">
            <BiLockAlt size={15} />
          </span>
          Confirm Password <span className="auth-field__required">*</span>
        </Form.Label>
        <div className="auth-input-wrap">
          <Form.Control
            required
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            placeholder="Re-enter password"
            className={`auth-field__control ${errorList.confirmPassword ? "form-input-invalid" : ""}`}
            minLength={6}
          />
          <button
            type="button"
            className="auth-input-wrap__toggle"
            onClick={toggleShowConfirmPassword}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
              <AiOutlineEye size={18} />
            ) : (
              <AiOutlineEyeInvisible size={18} />
            )}
          </button>
        </div>
        <Errors current_key="confirmPassword" key="confirmPassword" />
      </div>

      <Form.Group htmlFor="terms_accepted" className="auth-checkbox">
        <Form.Check
          type="checkbox"
          id="terms_accepted"
          name="terms_accepted"
          checked={terms_accepted}
          onChange={onChange}
          label="I accept the terms and conditions *"
          className={errorList.terms_accepted ? "form-input-invalid" : ""}
        />
        <Errors current_key="terms_accepted" key="terms_accepted" />
      </Form.Group>

      <div className="auth-actions">
        <Button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={handleInfoNext}
          disabled={isBusy}
        >
          Continue to Plans
        </Button>
      </div>
    </>
  );

  const renderPlanStep = () => (
    <>
      <p className="auth-step-intro">
        Select a membership plan to continue registration.
      </p>
      <div className="membership-plans-grid mb-3">
        {plans.map((plan) => (
          <MembershipPlanCard
            key={plan._id}
            plan={plan}
            selected={selectedPlanId}
            onSelect={setSelectedPlanId}
          />
        ))}
      </div>
      <div className="auth-actions auth-actions--split">
        <Button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => setCurrentStep(STEPS.INFO)}
          disabled={isBusy}
        >
          Back
        </Button>
        <Button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={handlePlanNext}
          disabled={isBusy || !selectedPlanId}
        >
          Continue
        </Button>
      </div>
    </>
  );

  const renderPaymentStep = () => (
    <>
      <div className="registration-summary mb-4">
        <h6 className="registration-summary__title">Registration Summary</h6>
        {community?.label && (
          <div className="registration-summary__row">
            <span>Community</span>
            <strong>{community.label}</strong>
          </div>
        )}
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
        {referralId && (
          <div className="registration-summary__row">
            <span>Referral</span>
            <strong>
              {referralPreview?.name
                ? `${referralPreview.name} (${referralId})`
                : referralId}
            </strong>
          </div>
        )}
        {selectedPlan && (
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
        )}
      </div>

      <p className="auth-step-intro small">
        {registeredUserId
          ? "Your account is created. Complete payment to activate your membership."
          : "You will be redirected to our secure payment partner to complete registration."}
      </p>

      <div className="auth-actions auth-actions--split">
        <Button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => setCurrentStep(STEPS.PLAN)}
          disabled={isBusy}
        >
          Back
        </Button>
        <Button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={handleRegisterAndPay}
          disabled={isBusy}
        >
          {isBusy ? (
            <>
              <CommonSpinner size="sm" className="common-spinner--button me-2" />
              Processing...
            </>
          ) : registeredUserId ? (
            "Retry Payment"
          ) : (
            "Register & Pay"
          )}
        </Button>
      </div>
    </>
  );

  const cardWide = currentStep !== STEPS.INFO;
  const appName = commonSettings?.abbreviation || "";

  const registerTitle = loadingCommonSettings
    ? "Loading..."
    : commonSettings?.abbreviation
      ? `Begin Your ${commonSettings.abbreviation} Journey`
      : "Begin Your Journey";

  const accountStatus = registrationData.accountStatus;
  const isActiveAccount = accountStatus === "active";
  const isPendingAccount = accountStatus === "pending";

  const welcomeStatusConfig = isActiveAccount
    ? {
        tone: "success",
        Icon: FaCheckCircle,
        badge: "success",
        label: "ACTIVE",
        message:
          "Your account is now active. You can log in and start using the portal.",
      }
    : isPendingAccount
      ? {
          tone: "warning",
          Icon: FaClock,
          badge: "warning",
          label: "PAYMENT PENDING",
          message:
            "We could not confirm your payment yet. If you already paid, wait a few minutes and log in, or contact support with your order reference.",
        }
      : {
          tone: "danger",
          Icon: FaExclamationCircle,
          badge: "danger",
          label: "PAYMENT FAILED",
          message:
            "Your account was created but payment was not completed. Please try again or contact support.",
        };

  const WelcomeStatusIcon = welcomeStatusConfig.Icon;

  const handleCopyMemberId = () => {
    navigator.clipboard.writeText(registrationData.memberId);
    setAlert("Member ID copied to clipboard", "success");
  };

  const handleCopyPassword = () => {
    if (!registrationData.password) return;
    navigator.clipboard.writeText(registrationData.password);
    setAlert("Password copied to clipboard", "success");
  };

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    clearPendingRegistration();
    navigate("/login");
  };

  return (
    <>
      <AuthShell
        wide={cardWide}
        title={registerTitle}
        subtitle="Create your account in three simple steps"
        footer={
          <>
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Login
            </Link>
          </>
        }
      >
        {isVerifyingPayment ? (
          <div className="auth-verify">
            <BouncingLoader
              minHeight="120px"
              message="Verifying your payment..."
            />
          </div>
        ) : registrationAvailable?.allowed === false ? (
          renderBlockedState()
        ) : registrationAvailable === null ? (
          <BouncingLoader minHeight="120px" message="Loading..." />
        ) : (
          <Form noValidate validated={validated} className="auth-form">
            {renderStepIndicator()}
            {currentStep === STEPS.INFO && renderInfoStep()}
            {currentStep === STEPS.PLAN && renderPlanStep()}
            {currentStep === STEPS.PAYMENT && renderPaymentStep()}
          </Form>
        )}
      </AuthShell>

      <AdvancedModal
        show={showWelcomeModal}
        onHide={handleWelcomeModalClose}
        className={`welcome-modal welcome-modal--${welcomeStatusConfig.tone}`}
        size="md"
        backdrop="static"
        keyboard={false}
        closeButton={false}
        icon={
          <div
            className={`welcome-modal__icon-ring welcome-modal__icon-ring--${welcomeStatusConfig.tone}`}
            aria-hidden
          >
            <WelcomeStatusIcon className="welcome-modal__icon" />
          </div>
        }
        bodyClassName="welcome-modal__body"
        actions={[
          {
            label: "Go to Login",
            onClick: handleWelcomeModalClose,
            className: "welcome-modal__cta",
          },
        ]}
      >
        <div className="welcome-modal__content">
          <h2 className="welcome-modal__title">
            Congratulations{" "}
            <span className="welcome-modal__name">{registrationData.name}</span>!
          </h2>

          <p className="welcome-modal__subtitle">
            You have successfully registered for the Community Portal
            {appName && (
              <>
                {" "}
                by <strong>{appName.toUpperCase()}</strong>
              </>
            )}
            .
          </p>

          <p className="welcome-modal__message">{welcomeStatusConfig.message}</p>

          <div className="welcome-modal__credentials">
            <div className="welcome-modal__credential-card">
              <span className="welcome-modal__credential-label">Member ID</span>
              <div className="welcome-modal__credential-value">
                <code>{registrationData.memberId}</code>
                <CopyIcon
                  textToCopy={registrationData.memberId}
                  onCopy={handleCopyMemberId}
                  className="welcome-modal__copy"
                />
              </div>
            </div>

            {registrationData.password && (
              <div className="welcome-modal__credential-card">
                <span className="welcome-modal__credential-label">Password</span>
                <div className="welcome-modal__credential-value">
                  <code>{registrationData.password}</code>
                  <CopyIcon
                    textToCopy={registrationData.password}
                    onCopy={handleCopyPassword}
                    className="welcome-modal__copy"
                  />
                </div>
              </div>
            )}
          </div>

          <div
            className={`welcome-modal__status welcome-modal__status--${welcomeStatusConfig.tone}`}
          >
            <span className="welcome-modal__status-dot" aria-hidden />
            Status: {welcomeStatusConfig.label}
          </div>

          {isActiveAccount && (
            <div className="welcome-modal__note">
              <p>
                Thank you for joining our community platform! Together, we can
                unite communities, support education, sports, culture, and make a
                meaningful impact through donations and social initiatives.
              </p>
            </div>
          )}
        </div>
      </AdvancedModal>
    </>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingRegister: state.auth.loadingRegister,
  common: state.common,
  membership: state.membership,
});

export default connect(mapStateToProps, {
  setErrors,
  removeRegistrationErrors,
  register,
  lookupReferralUser,
  setAlert,
  fetchMembershipPlans,
  createPaymentOrder,
  fetchPaymentStatus,
  fetchPublicCommunities,
})(Register);
