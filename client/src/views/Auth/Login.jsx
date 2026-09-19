import React, { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { connect } from "react-redux";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import {
  login,
  setErrors,
  removeRegistrationErrors,
  forgotPasswordStep1,
  forgotPasswordStep2,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
} from "@src/actions/auth";
import { setAlert } from "@src/actions/alert";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import { FaRegUser } from "react-icons/fa";
import { getUserCredentials } from "@src/utils/credentialsHelper";
import ForgotPasswordModal from "../Common/Modal/ForgotPasswordModal";
import ForgotPasswordEmailOtpModal from "../Common/Modal/ForgotPasswordEmailOtpModal";
import { consumePaymentResultMessage } from "@src/utils/paymentReturnHelper";
import AuthShell from "@src/views/Auth/AuthShell";

const Login = ({
  errorList,
  setErrors,
  removeRegistrationErrors,
  login,
  forgotPasswordStep1,
  forgotPasswordStep2,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
  auth,
  common: { commonSettings, loadingCommonSettings },
}) => {
  const navigate = useNavigate();

  const initialFormData = {
    memberId: "",
    password: "",
    rememberPassword: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showForgotPasswordEmailOtpModal, setShowForgotPasswordEmailOtpModal] =
    useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");

  const { memberId, password, rememberPassword } = formData;

  useEffect(() => {
    const paymentResult = consumePaymentResultMessage();
    if (paymentResult?.message) {
      setAlert(paymentResult.message, paymentResult.variant || "success");
    }
  }, [setAlert]);

  const isVerifying = auth.forgotPasswordStep1Loading;
  const isResetting = auth.forgotPasswordStep2Loading;
  const isVerifyingMemberId = auth.forgotPasswordEmailVerifyMemberIdLoading;
  const isSendingOtp = auth.forgotPasswordEmailSendOtpLoading;
  const isResendingOtp = auth.forgotPasswordEmailResendOtpLoading;
  const isVerifyingOtp = auth.forgotPasswordEmailVerifyOtpLoading;
  const isResettingPassword = auth.forgotPasswordEmailResetLoading;

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData({ ...formData, [name]: newValue });
  };

  const handleMemberIdChange = createMemberIdChangeHandler(
    onChange,
    "memberId",
  );
  const handleMemberIdPaste = createMemberIdPasteHandler();
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    memberId,
    onChange,
    "memberId",
  );

  const toggleShowPassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    const storedCredentials = getUserCredentials();
    if (
      storedCredentials?.rememberPassword &&
      storedCredentials?.memberId &&
      storedCredentials?.password
    ) {
      setFormData({
        ...formData,
        memberId: storedCredentials.memberId,
        password: storedCredentials.password,
        rememberPassword: true,
      });
    }
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    removeRegistrationErrors();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
    }

    setValidated(true);

    const validationRules = [
      {
        path: "memberId",
        msg: "Please provide a valid Member ID (10-digit phone + 2-digit ID).",
        validator: (value) => isValidMemberIdFormat(value),
      },
      { path: "password", msg: "Please provide a valid password." },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const submitData = Object.fromEntries(
      Object.entries(formData).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );

    login(submitData, navigate);
  };

  const handleVerifyPhone = async (phone) => {
    setForgotPasswordError("");
    try {
      const response = await forgotPasswordStep1(phone);
      return response;
    } catch (err) {
      setForgotPasswordError(err.message);
      throw err;
    }
  };

  const handleResetPassword = async ({ phone }) => {
    setForgotPasswordError("");
    try {
      await forgotPasswordStep2(phone);
      setForgotPasswordSuccess(
        "Your password reset request has been submitted successfully. You'll receive your new password shortly.",
      );
    } catch (err) {
      setForgotPasswordError(err.message);
      throw err;
    }
  };

  const handleCloseModal = () => {
    setShowForgotPasswordModal(false);
    setTimeout(() => {
      setForgotPasswordSuccess("");
      setForgotPasswordError("");
    }, 300);
  };

  const handleVerifyMemberId = async (memberId) => {
    try {
      const response = await verifyForgotPasswordEmailMemberId(memberId);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleSendEmailOtp = async (memberId, email) => {
    try {
      const response = await sendForgotPasswordEmailOtp(memberId, email);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleResendEmailOtp = async (memberId) => {
    try {
      const response = await resendForgotPasswordEmailOtp(memberId);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleVerifyEmailOtp = async (memberId, otp) => {
    try {
      const response = await verifyForgotPasswordEmailOtp(memberId, otp);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleResetPasswordWithEmailOtp = async (
    memberId,
    otp,
    password,
    confirmPassword,
  ) => {
    try {
      await resetPasswordWithEmailOtp(memberId, otp, password, confirmPassword);
      setForgotPasswordSuccess(
        "Password reset successfully! You can now login with your new password.",
      );
    } catch (err) {
      throw err;
    }
  };

  const handleCloseEmailOtpModal = () => {
    setShowForgotPasswordEmailOtpModal(false);
    setTimeout(() => {
      setForgotPasswordSuccess("");
      setForgotPasswordError("");
    }, 300);
  };

  const pageTitle = loadingCommonSettings
    ? "Loading..."
    : commonSettings?.abbreviation
      ? `Welcome to ${commonSettings.abbreviation}`
      : "Welcome Back";

  return (
    <>
      <AuthShell
        title={pageTitle}
        subtitle="Sign in with your Member ID to access the community portal"
        loading={loadingCommonSettings}
        footer={
          commonSettings?.registerEnabled !== false ? (
            <>
              Don&apos;t have an account?{" "}
              <Link to="/register" className="auth-link">
                Register
              </Link>
            </>
          ) : null
        }
      >
        <Form noValidate validated={validated} onSubmit={onSubmit} className="auth-form">
          <div className="auth-field">
            <Form.Label htmlFor="memberId" className="auth-field__label">
              <span className="auth-field__label-icon">
                <FaRegUser size={14} />
              </span>
              Member ID <span className="auth-field__required">*</span>
            </Form.Label>
            <Form.Control
              required
              type="text"
              id="memberId"
              name="memberId"
              value={memberId}
              onChange={handleMemberIdChange}
              onPaste={handleMemberIdPaste}
              onKeyDown={handleMemberIdKeyDown}
              placeholder="9999999999-01"
              maxLength={13}
              className={`auth-field__control ${errorList.memberId ? "form-input-invalid" : ""}`}
            />
            <p className="auth-field__hint">
              10-digit phone number + 2-digit member ID
            </p>
            <Errors current_key="memberId" key="memberId" />
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
                value={password}
                name="password"
                className={`auth-field__control ${
                  errorList.password ? "form-input-invalid" : ""
                }`}
                onChange={onChange}
                placeholder="Enter your password"
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

          <div className="auth-row">
            <Form.Group htmlFor="rememberPassword" className="auth-checkbox mb-0">
              <Form.Check
                label="Remember password"
                id="rememberPassword"
                name="rememberPassword"
                checked={rememberPassword}
                onChange={onChange}
              />
            </Form.Group>

            <Button
              variant="link"
              className="auth-link--muted p-0"
              onClick={() => setShowForgotPasswordEmailOtpModal(true)}
            >
              Forgot Password?
            </Button>
          </div>

          <div className="auth-actions">
            <Button type="submit" className="auth-btn auth-btn--primary">
              Sign In
            </Button>
          </div>
        </Form>
      </AuthShell>

      <ForgotPasswordModal
        show={showForgotPasswordModal}
        onHide={handleCloseModal}
        onVerifyPhone={handleVerifyPhone}
        onResetPassword={handleResetPassword}
        isVerifying={isVerifying}
        isResetting={isResetting}
        successMessage={forgotPasswordSuccess}
      />

      <ForgotPasswordEmailOtpModal
        show={showForgotPasswordEmailOtpModal}
        onHide={handleCloseEmailOtpModal}
        onVerifyMemberId={handleVerifyMemberId}
        onSendOtp={handleSendEmailOtp}
        onResendOtp={handleResendEmailOtp}
        onVerifyOtp={handleVerifyEmailOtp}
        onResetPassword={handleResetPasswordWithEmailOtp}
        isVerifyingMemberId={isVerifyingMemberId}
        isSendingOtp={isSendingOtp}
        isResendingOtp={isResendingOtp}
        isVerifyingOtp={isVerifyingOtp}
        isResetting={isResettingPassword}
        successMessage={forgotPasswordSuccess}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  auth: state.auth,
  common: state.common,
});

export default connect(mapStateToProps, {
  setErrors,
  removeRegistrationErrors,
  login,
  setAlert,
  forgotPasswordStep1,
  forgotPasswordStep2,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
})(Login);
