import React from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { Col, Form, Row } from "react-bootstrap";
import { FaLock } from "react-icons/fa";

import Errors from "@src/notifications/Errors";
import CustomSelect from "@src/views/Common/CustomSelect";
import { createVillage } from "@src/actions/locationActions";
import AccountEditHeader from "../components/AccountEditHeader";
import EditTabActions from "../components/EditTabActions";

const MyAccountLocationTab = ({
  formData,
  onChange,
  handleSelectChange,
  isDisabled,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  submitting,
  errorList,
  loadStates,
  loadCities,
  loadVillages,
  locationDetailsLocked,
  sectionComplete,
}) => {
  const dispatch = useDispatch();

  return (
    <>
      <AccountEditHeader
        title="Location Details"
        isEditing={isEditing}
        onEdit={onEdit}
        onPreview={onCancel}
        submitting={submitting}
      />

      {!sectionComplete && !locationDetailsLocked && (
        <p className="text-muted small mb-3">
          Location details are optional until you start filling them. Once saved,
          state, city, and address become required and cannot be cleared.
        </p>
      )}

      <Row className="row-gap-3 mb-3">
        <Col xs={12}>
          <Form.Group controlId="address">
            <Form.Label className="form-sub-label">
              Current Address <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              className={`text-muted ${errorList.address ? "form-input-invalid" : ""}`}
              as="textarea"
              rows={2}
              name="address"
              value={formData.address}
              onChange={onChange}
              disabled={isDisabled}
              maxLength={300}
              placeholder="Enter your address"
            />
            <Errors current_key="address" />
            <Form.Text className="text-muted">
              Minimum 5 characters, maximum 300 characters
            </Form.Text>
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="country">
            <Form.Label className="form-sub-label">Country</Form.Label>
            <Form.Control
              type="text"
              value="India"
              disabled
              readOnly
              className="text-muted"
            />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="stateCode">
            <Form.Label className="form-sub-label">
              State <span className="text-danger">*</span>
              {locationDetailsLocked && (
                <FaLock
                  size={14}
                  className="ms-2 text-muted"
                  title="This field is locked after first save"
                />
              )}
            </Form.Label>
            <CustomSelect
              key={`state-${formData.stateCode?.meta?.stateId || formData.stateCode?.value || "none"}`}
              value={formData.stateCode}
              onChange={(option) => handleSelectChange("stateCode", option)}
              loadOptions={loadStates}
              isDisabled={isDisabled || locationDetailsLocked}
              placeholder="Select state"
            />
            <Errors current_key="stateCode" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="cityId">
            <Form.Label className="form-sub-label">
              City <span className="text-danger">*</span>
              {locationDetailsLocked && (
                <FaLock
                  size={14}
                  className="ms-2 text-muted"
                  title="This field is locked after first save"
                />
              )}
            </Form.Label>
            <CustomSelect
              key={`city-${formData.stateCode?.meta?.stateId || formData.stateCode?.value || "none"}`}
              value={formData.cityId}
              onChange={(option) => handleSelectChange("cityId", option)}
              loadOptions={loadCities}
              isDisabled={
                isDisabled ||
                !formData.stateCode?.value ||
                locationDetailsLocked
              }
              placeholder="Select city"
            />
            <Errors current_key="cityId" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="villageId">
            <Form.Label className="form-sub-label">
              Native Village
              {locationDetailsLocked && (
                <FaLock
                  size={14}
                  className="ms-2 text-muted"
                  title="This field is locked after first save"
                />
              )}
            </Form.Label>
            <CustomSelect
              key={`village-${formData.cityId?.value || "none"}`}
              value={formData.villageId}
              onChange={(option) => handleSelectChange("villageId", option)}
              loadOptions={loadVillages}
              isCreatable={
                isEditing &&
                formData.cityId?.value &&
                !locationDetailsLocked
              }
              isDisabled={
                isDisabled ||
                !formData.cityId?.value ||
                locationDetailsLocked
              }
              placeholder="Select native village (optional)"
              onInputChange={async (inputValue, actionMeta) => {
                if (
                  actionMeta?.action === "create-option" &&
                  inputValue &&
                  isEditing &&
                  formData.cityId?.value
                ) {
                  const result = await dispatch(
                    createVillage(formData.cityId, inputValue.toUpperCase()),
                  );
                  if (result?.status === true && result.response) {
                    handleSelectChange("villageId", {
                      value: result.response.value,
                      label: result.response.label,
                    });
                  }
                }
              }}
            />
            <Errors current_key="villageId" />
          </Form.Group>
        </Col>
      </Row>

      <EditTabActions
        isEditing={isEditing}
        onSave={onSave}
        onCancel={onCancel}
        submitting={submitting}
      />
    </>
  );
};

MyAccountLocationTab.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  handleSelectChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  errorList: PropTypes.object.isRequired,
  loadStates: PropTypes.func.isRequired,
  loadCities: PropTypes.func.isRequired,
  loadVillages: PropTypes.func.isRequired,
  locationDetailsLocked: PropTypes.bool.isRequired,
  sectionComplete: PropTypes.bool.isRequired,
};

export default React.memo(MyAccountLocationTab);
