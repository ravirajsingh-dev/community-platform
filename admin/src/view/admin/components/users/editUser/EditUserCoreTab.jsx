import React from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { Button, Col, Form, Row } from "react-bootstrap";
import { FaRegEye } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";

import { setAlert } from "@actions/alert";
import Errors from "@src/notifications/Errors";
import CustomSelect from "@src/components/common/CustomSelect";
import MemberIdInput from "@src/components/common/MemberIdInput";
import {
  UserStatuses,
  getStatusOptionByValue,
} from "@src/constants/CustomSelectValues";
import { formSelectFieldChange } from "./editUserUtils";
import EditTabActions from "./components/EditTabActions";

const EditUserCoreTab = ({
  currentUser,
  formData,
  onChange,
  isDisabled,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  submitting,
  errorList,
  showPasswordField,
  setShowPasswordField,
  showPasswordCopy,
  setShowPasswordCopy,
  setFormData,
}) => {
  const dispatch = useDispatch();

  return (
    <>
      <Row className="row-gap-3 mb-3">
      <Col xs={12} md={6}>
        <Form.Group controlId="member-id">
          <Form.Label className="form-sub-label">Member ID</Form.Label>
          <Form.Control
            type="text"
            value={currentUser?.memberId || "-"}
            disabled
            readOnly
            className="text-muted"
          />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="phone">
          <Form.Label className="form-sub-label">
            Phone <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            className={`text-muted ${errorList.phone ? "form-input-invalid" : ""}`}
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={onChange}
            disabled={isDisabled}
            maxLength={10}
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) e.preventDefault();
            }}
          />
          <Errors current_key="phone" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="name">
          <Form.Label className="form-sub-label">
            Name <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            className={`text-muted ${errorList.name ? "form-input-invalid" : ""}`}
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            disabled={isDisabled}
            maxLength={50}
          />
          <Errors current_key="name" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="email">
          <Form.Label className="form-sub-label">
            Email <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            className={`text-muted ${errorList.email ? "form-input-invalid" : ""}`}
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            disabled={isDisabled}
          />
          <Errors current_key="email" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="alternatePhone">
          <Form.Label className="form-sub-label">Alternate Phone</Form.Label>
          <Form.Control
            className={`text-muted ${errorList.alternatePhone ? "form-input-invalid" : ""}`}
            type="tel"
            name="alternatePhone"
            value={formData.alternatePhone}
            onChange={onChange}
            disabled={isDisabled}
            maxLength={10}
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) e.preventDefault();
            }}
          />
          <Errors current_key="alternatePhone" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <MemberIdInput
          id="referralId"
          name="referralId"
          value={formData.referralId}
          onChange={onChange}
          label="Referral Member ID (optional)"
          showHint
          disabled
          className={`text-muted ${errorList.referralId ? "form-input-invalid" : ""}`}
        />
        <Errors current_key="referralId" />
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="status">
          <Form.Label className="form-sub-label">
            Status <span className="text-danger">*</span>
          </Form.Label>
          <CustomSelect
            options={UserStatuses}
            value={getStatusOptionByValue(formData.status)}
            onChange={formSelectFieldChange("status", onChange, {
              stringify: true,
            })}
            isDisabled={isDisabled}
            isRequired
            placeholder="Select status"
            error={errorList.status}
          />
          <Errors current_key="status" />
        </Form.Group>
      </Col>
    </Row>

    <Row className="row-gap-3 mb-3">
      <Col xs={12}>
        <h6 className="text-muted mb-0">User Password (Admin Only)</h6>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="password">
          <Form.Label className="form-sub-label">Password</Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              type={showPasswordCopy ? "text" : "password"}
              value={currentUser?.passwordCopy || ""}
              disabled
              readOnly
              className="monospace-input text-muted"
            />
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setShowPasswordCopy(!showPasswordCopy)}
              title={showPasswordCopy ? "Hide Password" : "Show Password"}
            >
              <FaRegEye size={18} />
            </Button>
            <Button
              variant="outline-secondary"
              type="button"
              onClick={async () => {
                if (currentUser?.passwordCopy) {
                  try {
                    await navigator.clipboard.writeText(
                      currentUser.passwordCopy,
                    );
                    dispatch(setAlert("Password copied to clipboard!", "success"));
                  } catch {
                    dispatch(setAlert("Failed to copy password", "danger"));
                  }
                }
              }}
              title="Copy to Clipboard"
            >
              <FiCopy size={18} />
            </Button>
          </div>
          <Form.Text className="text-muted">
            Admin-only view of user password
          </Form.Text>
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="change-password">
          <Form.Label className="form-sub-label">
            Change Password{" "}
            {showPasswordField && <span className="text-danger">*</span>}
          </Form.Label>
          {showPasswordField ? (
            <div className="d-flex gap-2">
              <Form.Control
                className={`text-muted ${errorList.password ? "form-input-invalid" : ""}`}
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                disabled={isDisabled}
                placeholder="Enter new password"
                maxLength={128}
              />
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowPasswordField(false);
                  setFormData((prev) => ({ ...prev, password: "" }));
                }}
                disabled={isDisabled}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                value="Enter new password to change"
                disabled
                readOnly
                className="text-muted"
              />
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowPasswordField(true)}
                disabled={isDisabled}
              >
                Change
              </Button>
            </div>
          )}
          {showPasswordField && (
            <Form.Text className="text-warning">
              This will change the user&apos;s login password and invalidate all
              sessions.
            </Form.Text>
          )}
          <Errors current_key="password" />
        </Form.Group>
      </Col>
    </Row>

    <EditTabActions
      isEditing={isEditing}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      submitting={submitting}
    />
  </>
  );
};

EditUserCoreTab.propTypes = {
  currentUser: PropTypes.object,
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  errorList: PropTypes.object.isRequired,
  showPasswordField: PropTypes.bool.isRequired,
  setShowPasswordField: PropTypes.func.isRequired,
  showPasswordCopy: PropTypes.bool.isRequired,
  setShowPasswordCopy: PropTypes.func.isRequired,
  setFormData: PropTypes.func.isRequired,
};

export default React.memo(EditUserCoreTab);
