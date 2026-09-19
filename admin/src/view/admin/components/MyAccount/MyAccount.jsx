import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import {
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Tab,
  Tabs,
} from "react-bootstrap";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { useSearchParams } from "react-router-dom";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import {
  changePassword,
  changeTxnPassword,
  removeAllErrors,
  setErrors,
  setTxnPassword,
} from "@src/actions/adminAuth";
import { getMyProfile, updateMyProfile } from "@src/actions/profileActions";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
};

const initialLoginPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const initialTxnPasswordForm = {
  currentTxnPassword: "",
  newTxnPassword: "",
  confirmTxnPassword: "",
};

const initialSetTxnForm = {
  txn_password: "",
  confirmTxnPassword: "",
};

const TAB_KEYS = {
  profile: "profile",
  loginPassword: "login-password",
  txnPassword: "txn-password",
};

const MyAccount = ({
  adminAuth,
  errorList,
  setErrors,
  removeAllErrors,
  getMyProfile,
  updateMyProfile,
  changePassword,
  changeTxnPassword,
  setTxnPassword,
}) => {
  const admin = adminAuth?.admin;
  const isSubAdmin = Boolean(admin?.isSubAdmin);
  const loadingOnChangePassword = adminAuth?.loadingOnChangePassword;

  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [formData, setFormData] = useState(initialFormData);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [activeTab, setActiveTab] = useState(
    initialTab && Object.values(TAB_KEYS).includes(initialTab)
      ? initialTab
      : TAB_KEYS.profile,
  );
  const [isProfileEditable, setIsProfileEditable] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [loginPasswordForm, setLoginPasswordForm] = useState(
    initialLoginPasswordForm,
  );
  const [txnPasswordForm, setTxnPasswordForm] = useState(initialTxnPasswordForm);
  const [setTxnForm, setSetTxnForm] = useState(initialSetTxnForm);
  const [isTxnSet, setIsTxnSet] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentTxnPassword, setShowCurrentTxnPassword] = useState(false);
  const [showNewTxnPassword, setShowNewTxnPassword] = useState(false);
  const [showConfirmTxnPassword, setShowConfirmTxnPassword] = useState(false);
  const [showSetTxnPassword, setShowSetTxnPassword] = useState(false);
  const [showSetTxnConfirmPassword, setShowSetTxnConfirmPassword] =
    useState(false);
  const [isLoginPasswordEditable, setIsLoginPasswordEditable] = useState(false);
  const [isTxnPasswordEditable, setIsTxnPasswordEditable] = useState(false);

  useEffect(() => {
    removeAllErrors();
  }, [removeAllErrors]);

  useEffect(() => {
    const run = async () => {
      const result = await getMyProfile();
      if (result?.status && result?.data) {
        setFormData({
          name: result.data.name || "",
          phone: result.data.phone || "",
          email: result.data.email || "",
        });
        setIsTxnSet(
          Boolean(result.data.isTxnPassSet) || Boolean(admin?.isTxnPassSet),
        );
      } else {
        setFormData({
          name: admin?.name || "",
          phone: admin?.phone || "",
          email: admin?.email || "",
        });
        setIsTxnSet(Boolean(admin?.isTxnPassSet));
      }
      setFieldTouched({});
      setSubmitAttempted(false);
      setIsProfileEditable(false);
    };

    run();
  }, [getMyProfile]);

  const profileValidationRules = useMemo(() => {
    const rules = [
      { path: "name", msg: "Please enter a valid name." },
      { path: "email", msg: "Please enter a valid email address." },
    ];
    if (!isSubAdmin) {
      rules.push({ path: "phone", msg: "Please enter a valid phone number." });
    }
    return rules;
  }, [isSubAdmin]);

  const localValidationErrors = useMemo(() => {
    const errors = {};
    const validationErrors = validateForm(formData, profileValidationRules);
    validationErrors.forEach((error) => {
      errors[error.path] = error.msg;
    });

    if (formData.name && formData.name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters.";
    }

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      errors.email = "Please enter a valid email address.";
    }

    if (
      !isSubAdmin &&
      formData.phone &&
      !/^\d{10}$/.test(formData.phone.trim())
    ) {
      errors.phone = "Phone must be a 10-digit number.";
    }

    return errors;
  }, [formData, isSubAdmin, profileValidationRules]);

  const visibleLocalErrors = useMemo(() => {
    const errors = {};
    Object.entries(localValidationErrors).forEach(([path, msg]) => {
      if (fieldTouched[path] || submitAttempted) errors[path] = msg;
    });
    return errors;
  }, [fieldTouched, localValidationErrors, submitAttempted]);

  const activeTabLabel = useMemo(() => {
    if (activeTab === TAB_KEYS.loginPassword) return "Change Login Password";
    if (activeTab === TAB_KEYS.txnPassword) return "Change Transaction Password";
    return "Profile";
  }, [activeTab]);

  const onChange = (e) => {
    if (!e?.target) return;
    const { name, value } = e.target;
    let sanitizedValue = value;
    if (name === "name") sanitizedValue = value.replace(/[^\w\s.-]/g, "");
    if (name === "phone") sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
    if (name === "email") sanitizedValue = value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const onBlur = (e) => {
    const name = e?.target?.name;
    if (!name) return;
    setFieldTouched((prev) => ({ ...prev, [name]: true }));
  };

  const resetProfileForm = () => {
    setFormData({
      name: admin?.name || "",
      phone: admin?.phone || "",
      email: admin?.email || "",
    });
    setFieldTouched({});
    setSubmitAttempted(false);
    removeAllErrors();
    setIsProfileEditable(false);
  };

  const resetLoginPasswordForm = () => {
    setLoginPasswordForm(initialLoginPasswordForm);
    removeAllErrors();
    setIsLoginPasswordEditable(false);
  };

  const resetTxnPasswordForm = () => {
    setTxnPasswordForm(initialTxnPasswordForm);
    setSetTxnForm(initialSetTxnForm);
    removeAllErrors();
    setIsTxnPasswordEditable(false);
  };

  const onProfileSubmit = async (e) => {
    e.preventDefault();
    const submitIntent =
      e?.nativeEvent?.submitter?.getAttribute("data-submit-intent") || "";
    if (submitIntent !== "save-profile") return;
    if (!isProfileEditable) return;

    removeAllErrors();
    setSubmitAttempted(true);

    const errors = validateForm(formData, profileValidationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (Object.keys(localValidationErrors).length) {
      setErrors(
        Object.entries(localValidationErrors).map(([path, msg]) => ({
          path,
          msg,
        })),
      );
      return;
    }

    setIsSavingProfile(true);
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    };
    if (!isSubAdmin) {
      payload.phone = formData.phone.trim();
    }

    const result = await updateMyProfile(payload);
    if (result?.status) {
      setIsProfileEditable(false);
    }
    setIsSavingProfile(false);
  };

  const onLoginPasswordSubmit = async (e) => {
    e.preventDefault();
    removeAllErrors();

    const errors = validateForm(loginPasswordForm, [
      { path: "currentPassword", msg: "Please provide your current password." },
      { path: "newPassword", msg: "Please provide a valid new password." },
      { path: "confirmPassword", msg: "Please confirm your new password." },
    ]);
    if (errors.length) {
      setErrors(errors);
      return;
    }
    if (loginPasswordForm.newPassword !== loginPasswordForm.confirmPassword) {
      setErrors([{ path: "confirmPassword", msg: "Passwords do not match." }]);
      return;
    }

    await changePassword(loginPasswordForm);
    resetLoginPasswordForm();
  };

  const onTxnPasswordSubmit = async (e) => {
    e.preventDefault();
    removeAllErrors();

    if (!isTxnSet) {
      const setErrorsList = validateForm(setTxnForm, [
        {
          path: "txn_password",
          msg: "Please provide a valid transaction password.",
        },
        {
          path: "confirmTxnPassword",
          msg: "Please confirm your transaction password.",
        },
      ]);
      if (setErrorsList.length) {
        setErrors(setErrorsList);
        return;
      }
      if (setTxnForm.txn_password !== setTxnForm.confirmTxnPassword) {
        setErrors([
          {
            path: "confirmTxnPassword",
            msg: "Transaction passwords do not match.",
          },
        ]);
        return;
      }

      await setTxnPassword({ txn_password: setTxnForm.txn_password });
      setIsTxnSet(true);
      resetTxnPasswordForm();
      return;
    }

    const errors = validateForm(txnPasswordForm, [
      {
        path: "currentTxnPassword",
        msg: "Please provide your current transaction password.",
      },
      {
        path: "newTxnPassword",
        msg: "Please provide a valid new transaction password.",
      },
      {
        path: "confirmTxnPassword",
        msg: "Please confirm your new transaction password.",
      },
    ]);
    if (errors.length) {
      setErrors(errors);
      return;
    }
    if (txnPasswordForm.newTxnPassword !== txnPasswordForm.confirmTxnPassword) {
      setErrors([
        {
          path: "confirmTxnPassword",
          msg: "Transaction passwords do not match.",
        },
      ]);
      return;
    }

    await changeTxnPassword(txnPasswordForm);
    resetTxnPasswordForm();
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="My Account"
        crumbs={[{ name: "My Account" }, { name: activeTabLabel }]}
      />

      <Row className="justify-content-center p-2">
        <Col xs={12} sm={10} md={8} lg={7}>
          <div className="common-form-card user-profile-card">
            <Row>
              <Col className="custom-heading-theam">My Account</Col>
            </Row>

            <Tabs
              activeKey={activeTab}
              onSelect={(tabKey) => {
                if (activeTab === TAB_KEYS.profile && isProfileEditable) {
                  resetProfileForm();
                }
                if (
                  activeTab === TAB_KEYS.loginPassword &&
                  isLoginPasswordEditable
                ) {
                  resetLoginPasswordForm();
                }
                if (
                  activeTab === TAB_KEYS.txnPassword &&
                  isTxnPasswordEditable
                ) {
                  resetTxnPasswordForm();
                }
                setActiveTab(tabKey || TAB_KEYS.profile);
                removeAllErrors();
              }}
              className="mb-3 user-profile-tabs"
            >
              <Tab eventKey={TAB_KEYS.profile} title="Profile">
                <Form onSubmit={onProfileSubmit}>
                  <Row className="mb-3 align-items-center">
                    <Col>
                      <h4 className="mb-1">Profile</h4>
                    </Col>
                    <Col xs="auto">
                      <Button
                        type="button"
                        variant={null}
                        className={`btn btn-sm ${
                          isProfileEditable ? "btn--outline" : "btn--theme"
                        }`}
                        onClick={
                          isProfileEditable
                            ? resetProfileForm
                            : () => setIsProfileEditable(true)
                        }
                        disabled={isSavingProfile}
                      >
                        {isProfileEditable ? (
                          <>
                            <FaRegEye className="me-1" />
                            View mode
                          </>
                        ) : (
                          <>
                            <MdEdit className="me-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group controlId="name" as={Col} md="12">
                      <Form.Label htmlFor="name" className="form-sub-label">
                        Name
                      </Form.Label>
                      <Form.Control
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your name"
                        disabled={!isProfileEditable}
                        maxLength={isSubAdmin ? 50 : 20}
                        className={`text-muted ${
                          errorList.name || visibleLocalErrors.name
                            ? "form-input-invalid"
                            : ""
                        }`}
                      />
                      {visibleLocalErrors.name && (
                        <Form.Text className="text-danger">
                          {visibleLocalErrors.name}
                        </Form.Text>
                      )}
                      <Errors current_key="name" />
                    </Form.Group>
                  </Row>

                  {!isSubAdmin && (
                    <Row className="mb-3">
                      <Form.Group controlId="phone" as={Col} md="12">
                        <Form.Label htmlFor="phone" className="form-sub-label">
                          Phone
                        </Form.Label>
                        <Form.Control
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={onChange}
                          onBlur={onBlur}
                          placeholder="Enter your phone number"
                          disabled={!isProfileEditable}
                          maxLength={10}
                          className={`text-muted ${
                            errorList.phone || visibleLocalErrors.phone
                              ? "form-input-invalid"
                              : ""
                          }`}
                        />
                        {visibleLocalErrors.phone && (
                          <Form.Text className="text-danger">
                            {visibleLocalErrors.phone}
                          </Form.Text>
                        )}
                        <Errors current_key="phone" />
                      </Form.Group>
                    </Row>
                  )}

                  <Row className="mb-3">
                    <Form.Group controlId="email" as={Col} md="12">
                      <Form.Label htmlFor="email" className="form-sub-label">
                        Email
                      </Form.Label>
                      <Form.Control
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your email"
                        disabled={!isProfileEditable}
                        className={`text-muted ${
                          errorList.email || visibleLocalErrors.email
                            ? "form-input-invalid"
                            : ""
                        }`}
                      />
                      {visibleLocalErrors.email && (
                        <Form.Text className="text-danger">
                          {visibleLocalErrors.email}
                        </Form.Text>
                      )}
                      <Errors current_key="email" />
                    </Form.Group>
                  </Row>

                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button
                      type="submit"
                      data-submit-intent="save-profile"
                      variant={null}
                      className="btn btn--theme"
                      disabled={!isProfileEditable || isSavingProfile}
                    >
                      {isSavingProfile ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant={null}
                      className="btn btn--danger"
                      onClick={resetProfileForm}
                      disabled={!isProfileEditable || isSavingProfile}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              </Tab>

              <Tab eventKey={TAB_KEYS.loginPassword} title="Change Login Password">
                <Form onSubmit={onLoginPasswordSubmit}>
                  <Row className="mb-3 align-items-center">
                    <Col>
                      <h4 className="mb-1">Change Login Password</h4>
                    </Col>
                    <Col xs="auto">
                      <Button
                        type="button"
                        variant={null}
                        className={`btn btn-sm ${
                          isLoginPasswordEditable ? "btn--outline" : "btn--theme"
                        }`}
                        onClick={
                          isLoginPasswordEditable
                            ? resetLoginPasswordForm
                            : () => setIsLoginPasswordEditable(true)
                        }
                        disabled={loadingOnChangePassword}
                      >
                        {isLoginPasswordEditable ? (
                          <>
                            <FaRegEye className="me-1" />
                            View mode
                          </>
                        ) : (
                          <>
                            <MdEdit className="me-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group controlId="currentPassword" as={Col} md="12">
                      <Form.Label htmlFor="currentPassword" className="form-sub-label">
                        Current password
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showCurrentPassword ? "text" : "password"}
                          id="currentPassword"
                          value={loginPasswordForm.currentPassword}
                          name="currentPassword"
                          className={`text-muted ${
                            errorList.currentPassword ? "form-input-invalid" : ""
                          }`}
                          onChange={(e) =>
                            setLoginPasswordForm((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          placeholder="Enter current password"
                          disabled={!isLoginPasswordEditable}
                        />
                        <InputGroup.Text
                          className="show-password-icon text-muted"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                        >
                          {showCurrentPassword ? (
                            <AiOutlineEye size={20} />
                          ) : (
                            <AiOutlineEyeInvisible size={20} />
                          )}
                        </InputGroup.Text>
                        <Errors current_key="currentPassword" />
                      </InputGroup>
                    </Form.Group>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group controlId="newPassword" as={Col} md="12">
                      <Form.Label htmlFor="newPassword" className="form-sub-label">
                        New password
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showNewPassword ? "text" : "password"}
                          id="newPassword"
                          value={loginPasswordForm.newPassword}
                          name="newPassword"
                          className={`text-muted ${
                            errorList.newPassword ? "form-input-invalid" : ""
                          }`}
                          onChange={(e) =>
                            setLoginPasswordForm((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          placeholder="Enter new password"
                          disabled={!isLoginPasswordEditable}
                        />
                        <InputGroup.Text
                          className="show-password-icon text-muted"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                        >
                          {showNewPassword ? (
                            <AiOutlineEye size={20} />
                          ) : (
                            <AiOutlineEyeInvisible size={20} />
                          )}
                        </InputGroup.Text>
                        <Errors current_key="newPassword" />
                      </InputGroup>
                    </Form.Group>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group controlId="confirmPassword" as={Col} md="12">
                      <Form.Label htmlFor="confirmPassword" className="form-sub-label">
                        Confirm password
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirmPassword"
                          value={loginPasswordForm.confirmPassword}
                          name="confirmPassword"
                          className={`text-muted ${
                            errorList.confirmPassword ? "form-input-invalid" : ""
                          }`}
                          onChange={(e) =>
                            setLoginPasswordForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          placeholder="Confirm new password"
                          disabled={!isLoginPasswordEditable}
                        />
                        <InputGroup.Text
                          className="show-password-icon text-muted"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                        >
                          {showConfirmPassword ? (
                            <AiOutlineEye size={20} />
                          ) : (
                            <AiOutlineEyeInvisible size={20} />
                          )}
                        </InputGroup.Text>
                        <Errors current_key="confirmPassword" />
                      </InputGroup>
                    </Form.Group>
                  </Row>

                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button
                      type="submit"
                      variant={null}
                      className="btn btn--theme"
                      disabled={
                        !isLoginPasswordEditable || loadingOnChangePassword
                      }
                    >
                      {loadingOnChangePassword ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant={null}
                      className="btn btn--danger"
                      onClick={resetLoginPasswordForm}
                      disabled={
                        !isLoginPasswordEditable || loadingOnChangePassword
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              </Tab>

              <Tab eventKey={TAB_KEYS.txnPassword} title="Change Transaction Password">
                <Form onSubmit={onTxnPasswordSubmit}>
                  <Row className="mb-3 align-items-center">
                    <Col>
                      <h4 className="mb-1">Change Transaction Password</h4>
                    </Col>
                    <Col xs="auto">
                      <Button
                        type="button"
                        variant={null}
                        className={`btn btn-sm ${
                          isTxnPasswordEditable ? "btn--outline" : "btn--theme"
                        }`}
                        onClick={
                          isTxnPasswordEditable
                            ? resetTxnPasswordForm
                            : () => setIsTxnPasswordEditable(true)
                        }
                        disabled={loadingOnChangePassword}
                      >
                        {isTxnPasswordEditable ? (
                          <>
                            <FaRegEye className="me-1" />
                            View mode
                          </>
                        ) : (
                          <>
                            <MdEdit className="me-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </Col>
                  </Row>

                  {isTxnSet ? (
                    <>
                      <Row className="mb-3">
                        <Form.Group controlId="currentTxnPassword" as={Col} md="12">
                          <Form.Label
                            htmlFor="currentTxnPassword"
                            className="form-sub-label"
                          >
                            Current transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showCurrentTxnPassword ? "text" : "password"}
                              id="currentTxnPassword"
                              value={txnPasswordForm.currentTxnPassword}
                              name="currentTxnPassword"
                              className={`text-muted ${
                                errorList.currentTxnPassword
                                  ? "form-input-invalid"
                                  : ""
                              }`}
                              onChange={(e) =>
                                setTxnPasswordForm((prev) => ({
                                  ...prev,
                                  currentTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Enter current transaction password"
                              disabled={!isTxnPasswordEditable}
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() =>
                                setShowCurrentTxnPassword((prev) => !prev)
                              }
                            >
                              {showCurrentTxnPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="currentTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>

                      <Row className="mb-3">
                        <Form.Group controlId="newTxnPassword" as={Col} md="12">
                          <Form.Label
                            htmlFor="newTxnPassword"
                            className="form-sub-label"
                          >
                            New transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showNewTxnPassword ? "text" : "password"}
                              id="newTxnPassword"
                              value={txnPasswordForm.newTxnPassword}
                              name="newTxnPassword"
                              className={`text-muted ${
                                errorList.newTxnPassword ? "form-input-invalid" : ""
                              }`}
                              onChange={(e) =>
                                setTxnPasswordForm((prev) => ({
                                  ...prev,
                                  newTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Enter new transaction password"
                              disabled={!isTxnPasswordEditable}
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() => setShowNewTxnPassword((prev) => !prev)}
                            >
                              {showNewTxnPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="newTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>

                      <Row className="mb-3">
                        <Form.Group controlId="confirmTxnPassword" as={Col} md="12">
                          <Form.Label
                            htmlFor="confirmTxnPassword"
                            className="form-sub-label"
                          >
                            Confirm transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showConfirmTxnPassword ? "text" : "password"}
                              id="confirmTxnPassword"
                              value={txnPasswordForm.confirmTxnPassword}
                              name="confirmTxnPassword"
                              className={`text-muted ${
                                errorList.confirmTxnPassword
                                  ? "form-input-invalid"
                                  : ""
                              }`}
                              onChange={(e) =>
                                setTxnPasswordForm((prev) => ({
                                  ...prev,
                                  confirmTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Confirm new transaction password"
                              disabled={!isTxnPasswordEditable}
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() =>
                                setShowConfirmTxnPassword((prev) => !prev)
                              }
                            >
                              {showConfirmTxnPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="confirmTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>
                    </>
                  ) : (
                    <>
                      <Row className="mb-3">
                        <Form.Group controlId="txn_password" as={Col} md="12">
                          <Form.Label htmlFor="txn_password" className="form-sub-label">
                            Set transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showSetTxnPassword ? "text" : "password"}
                              id="txn_password"
                              value={setTxnForm.txn_password}
                              name="txn_password"
                              className={`text-muted ${
                                errorList.txn_password ? "form-input-invalid" : ""
                              }`}
                              onChange={(e) =>
                                setSetTxnForm((prev) => ({
                                  ...prev,
                                  txn_password: e.target.value,
                                }))
                              }
                              placeholder="Enter transaction password"
                              disabled={!isTxnPasswordEditable}
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() => setShowSetTxnPassword((prev) => !prev)}
                            >
                              {showSetTxnPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="txn_password" />
                          </InputGroup>
                        </Form.Group>
                      </Row>

                      <Row className="mb-3">
                        <Form.Group controlId="setConfirmTxnPassword" as={Col} md="12">
                          <Form.Label
                            htmlFor="setConfirmTxnPassword"
                            className="form-sub-label"
                          >
                            Confirm transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showSetTxnConfirmPassword ? "text" : "password"}
                              id="setConfirmTxnPassword"
                              value={setTxnForm.confirmTxnPassword}
                              name="confirmTxnPassword"
                              className={`text-muted ${
                                errorList.confirmTxnPassword
                                  ? "form-input-invalid"
                                  : ""
                              }`}
                              onChange={(e) =>
                                setSetTxnForm((prev) => ({
                                  ...prev,
                                  confirmTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Confirm transaction password"
                              disabled={!isTxnPasswordEditable}
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() =>
                                setShowSetTxnConfirmPassword((prev) => !prev)
                              }
                            >
                              {showSetTxnConfirmPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="confirmTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>
                    </>
                  )}

                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button
                      type="submit"
                      variant={null}
                      className="btn btn--theme"
                      disabled={!isTxnPasswordEditable || loadingOnChangePassword}
                    >
                      {loadingOnChangePassword ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant={null}
                      className="btn btn--danger"
                      onClick={resetTxnPasswordForm}
                      disabled={!isTxnPasswordEditable || loadingOnChangePassword}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              </Tab>
            </Tabs>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

MyAccount.propTypes = {
  adminAuth: PropTypes.object.isRequired,
  errorList: PropTypes.object.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
  getMyProfile: PropTypes.func.isRequired,
  updateMyProfile: PropTypes.func.isRequired,
  changePassword: PropTypes.func.isRequired,
  changeTxnPassword: PropTypes.func.isRequired,
  setTxnPassword: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminAuth: state.adminAuth,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
  removeAllErrors,
  getMyProfile,
  updateMyProfile,
  changePassword,
  changeTxnPassword,
  setTxnPassword,
})(MyAccount);
