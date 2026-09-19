import React, { useState } from "react";
import { Form, InputGroup } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import CustomModal from "@src/components/common/Modal/CustomModal";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { setErrors } from "@src/actions/adminAuth";

const VerificationConfirmModal = ({
  show,
  handleClose,
  handleConfirm,
  title,
  body,
  submitBtnText,
  setErrors,
  errorList,
}) => {
  const initialFormData = {
    txn_password: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(false);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const onConfirm = () => {
    const validationRules = [
      { path: "txn_password", msg: "Transaction password is required." },
    ];

    const errors = validateForm(formData, validationRules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    handleConfirm(formData.txn_password);
    setFormData(initialFormData);
  };

  const onClose = () => {
    setFormData(initialFormData);
    handleClose();
  };

  return (
    <CustomModal
      show={show}
      onHide={onClose}
      title={title}
      size="md"
      className="settings-confirm-modal"
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: "Close",
          onClick: onClose,
          className: "btn btn--outline",
          colSize: 5,
        },
        {
          label: submitBtnText || "Submit",
          onClick: onConfirm,
          className: "btn btn--theme",
          colSize: 7,
        },
      ]}
    >
      <p className="mb-3">{body}</p>
      <Form.Group controlId="txn_password">
        <Form.Label htmlFor="txn_password" className="fw-bold">
          Transaction Password *
        </Form.Label>
        <InputGroup>
          <Form.Control
            required
            type={showPassword ? "text" : "password"}
            id="txn_password"
            value={formData.txn_password}
            name="txn_password"
            className={`text-muted ${
              errorList.txn_password ? "invalid" : ""
            }`}
            onChange={onChange}
            placeholder="Enter transaction password"
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
        </InputGroup>
        <Errors current_key="txn_password" />
      </Form.Group>
    </CustomModal>
  );
};

VerificationConfirmModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  body: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  submitBtnText: PropTypes.string,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
})(VerificationConfirmModal);
