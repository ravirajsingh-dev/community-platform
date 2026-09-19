import React, { useState } from "react";
import {
  InputGroup,
  Form,
  Row,
  Col,
  Alert,
} from "react-bootstrap";

import { connect } from "react-redux";
import PropTypes from "prop-types";
import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import { useNavigate } from "react-router-dom";
import CustomModal from "@src/components/common/Modal/CustomModal";

import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";

import {
  removeAllErrors,
  setErrors,
  setTxnPassword,
} from "@src/actions/adminAuth";

const SetTxnPasswordModal = ({
  errorList,
  setErrors,
  removeAllErrors,
  setTxnPassword,
  auth: { loadingOnChangePassword },
  show,
  handleClose,
}) => {
  const initialFormData = {
    txn_password: "",
    confirmTxnPassword: "",
  };

  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { txn_password, confirmTxnPassword } = formData;

  const onChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (name === "txn_password" || name === "confirmTxnPassword") {
      setPasswordMatch(
        newFormData.txn_password === newFormData.confirmTxnPassword,
      );
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const onSubmit = () => {
    removeAllErrors();

    setValidated(true);

    const validationRules = [
      {
        path: "txn_password",
        msg: "Please provide a valid transaction password.",
      },
      {
        path: "confirmTxnPassword",
        msg: "Please confirm your transaction password.",
      },
    ];

    const errors = validateForm(formData, validationRules);

    if (txn_password.length < 4) {
      errors.push({
        path: "txn_password",
        msg: "Password must be at least 4 characters long, including 1 digit and 1 letter.",
      });
    }

    if (errors.length || !passwordMatch) {
      setErrors(errors);
      return;
    }

    const submitData = {
      txn_password: formData.txn_password,
    };

    setTxnPassword(submitData, navigate).finally(() => {
      handleClose();
    });
  };

  return (
    <CustomModal
      show={show}
      onHide={handleClose}
      title="Set Transaction Password"
      size="md"
      closeButton
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: "Close",
          onClick: handleClose,
          className: "btn btn--outline",
          colSize: 5,
          disabled: loadingOnChangePassword,
        },
        {
          label: loadingOnChangePassword ? "Loading..." : "Save Txn Password",
          onClick: onSubmit,
          className: "btn btn--theme",
          colSize: 7,
          disabled: loadingOnChangePassword,
        },
      ]}
    >
      <Form
        noValidate
        validated={validated}
        className="registration-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <Row>
          <Col xs={12}>
            <Alert variant="danger">
              Transaction password is compulsory before adding credentials.
            </Alert>
          </Col>

          <Col xs={12}>
            <Row className="mb-4">
              <Form.Group controlId="txn_password" as={Col} md="12">
                <Form.Label htmlFor="txn_password">
                  Transaction Password
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    required
                    type={showPassword ? "text" : "password"}
                    id="txn_password"
                    value={txn_password}
                    name="txn_password"
                    className={`text-muted ${
                      errorList.txn_password ? "is-invalid" : ""
                    }`}
                    onChange={onChange}
                    placeholder="Transaction Password"
                  />
                  <InputGroup.Text
                    className="show-password-icon text-muted"
                    onClick={toggleShowPassword}
                  >
                    {showPassword ? (
                      <AiOutlineEye size={20} />
                    ) : (
                      <AiOutlineEyeInvisible size={20} />
                    )}
                  </InputGroup.Text>
                  <Errors current_key="txn_password" key="txn_password" />
                </InputGroup>
              </Form.Group>
            </Row>

            <Row className="mb-4">
              <Form.Group controlId="confirmTxnPassword" as={Col} md="12">
                <Form.Label htmlFor="confirmTxnPassword">
                  Confirm Transaction Password
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmTxnPassword"
                    value={confirmTxnPassword}
                    name="confirmTxnPassword"
                    className={`text-muted ${
                      errorList.confirmTxnPassword || !passwordMatch
                        ? "is-invalid"
                        : ""
                    }`}
                    onChange={onChange}
                    placeholder="Confirm Transaction Password"
                    isInvalid={!passwordMatch}
                  />
                  <InputGroup.Text
                    className="show-password-icon text-muted"
                    onClick={toggleShowConfirmPassword}
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
          </Col>
        </Row>
      </Form>
    </CustomModal>
  );
};

SetTxnPasswordModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  auth: state.adminAuth,
});

export default connect(mapStateToProps, {
  setTxnPassword,
  setErrors,
  removeAllErrors,
})(SetTxnPasswordModal);
