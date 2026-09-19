import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import { changePassword, removeAllErrors, setErrors } from "@src/actions/auth";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import ChangePasswordLogoutModal from "@src/views/Common/Modal/ChangePasswordLogoutModal";
import AccountEditHeader from "../components/AccountEditHeader";

const MyAccountPasswordTab = ({
  errorList,
  setErrors,
  changePassword,
  removeAllErrors,
  auth: { loadingOnChangePassword, showChangePassModal },
}) => {
  const initialFormData = {
    oldPassword: "",
    password: "",
    confirmPassword: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { oldPassword, password, confirmPassword } = formData;

  useEffect(() => {
    removeAllErrors();
  }, [removeAllErrors]);

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (name === "password" || name === "confirmPassword") {
      setPasswordMatch(newFormData.password === newFormData.confirmPassword);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setPasswordMatch(true);
    removeAllErrors();
    setIsEditing(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    removeAllErrors();

    const validationRules = [
      {
        path: "oldPassword",
        msg: "Please provide a valid login password.",
      },
      {
        path: "password",
        msg: "Please provide a valid password.",
      },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    const submitData = {};
    Object.keys(formData).forEach((key) => {
      if (formData[key]) submitData[key] = formData[key];
    });

    changePassword(submitData);
    resetForm();
  };

  return (
    <>
      <AccountEditHeader
        title="Change Password"
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onPreview={resetForm}
        submitting={loadingOnChangePassword}
      />

      <Form onSubmit={onSubmit}>
        <Row className="mb-3">
          <Form.Group controlId="oldPassword" as={Col} md="12">
            <Form.Label htmlFor="oldPassword" className="form-sub-label">
              Current password
            </Form.Label>
            <InputGroup>
              <Form.Control
                type={showLoginPassword ? "text" : "password"}
                id="oldPassword"
                value={oldPassword}
                name="oldPassword"
                className={`text-muted ${
                  errorList.oldPassword ? "form-input-invalid" : ""
                }`}
                onChange={onChange}
                placeholder="Enter current password"
                disabled={!isEditing}
              />
              <InputGroup.Text
                className="show-password-icon text-muted"
                onClick={() => setShowLoginPassword((prev) => !prev)}
              >
                {showLoginPassword ? (
                  <AiOutlineEye size={20} />
                ) : (
                  <AiOutlineEyeInvisible size={20} />
                )}
              </InputGroup.Text>
              <Errors current_key="oldPassword" />
            </InputGroup>
          </Form.Group>
        </Row>

        <Row className="mb-3">
          <Form.Group controlId="password" as={Col} md="12">
            <Form.Label htmlFor="password" className="form-sub-label">
              New password
            </Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                name="password"
                className={`text-muted ${
                  errorList.password ? "form-input-invalid" : ""
                }`}
                onChange={onChange}
                placeholder="Enter new password"
                disabled={!isEditing}
              />
              <InputGroup.Text
                className="show-password-icon text-muted"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <AiOutlineEye size={20} />
                ) : (
                  <AiOutlineEyeInvisible size={20} />
                )}
              </InputGroup.Text>
              <Errors current_key="password" />
            </InputGroup>
          </Form.Group>
        </Row>

        <Row className="mb-3">
          <Form.Group controlId="confirmPassword" as={Col} md="12">
            <Form.Label htmlFor="confirmPassword" className="form-sub-label">
              Confirm password
            </Form.Label>
            <InputGroup className="input-group-password">
              <Form.Control
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                name="confirmPassword"
                className={`text-muted ${
                  errorList.confirmPassword || !passwordMatch
                    ? "form-input-invalid"
                    : ""
                }`}
                onChange={onChange}
                placeholder="Confirm new password"
                isInvalid={!passwordMatch}
                disabled={!isEditing}
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
              <Form.Control.Feedback type="invalid">
                {passwordMatch
                  ? "Please provide a valid password."
                  : "Passwords do not match."}
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>
        </Row>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button
            type="submit"
            variant={null}
            className="btn btn--theme"
            disabled={!isEditing || loadingOnChangePassword}
          >
            {loadingOnChangePassword ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant={null}
            className="btn btn--danger"
            onClick={resetForm}
            disabled={!isEditing || loadingOnChangePassword}
          >
            Cancel
          </Button>
        </div>
      </Form>

      <ChangePasswordLogoutModal show={showChangePassModal} />
    </>
  );
};

MyAccountPasswordTab.propTypes = {
  changePassword: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired,
  errorList: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  auth: state.auth,
});

export default connect(mapStateToProps, {
  setErrors,
  changePassword,
  removeAllErrors,
})(MyAccountPasswordTab);
