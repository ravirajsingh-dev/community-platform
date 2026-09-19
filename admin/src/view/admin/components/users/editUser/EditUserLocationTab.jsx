import React from "react";
import PropTypes from "prop-types";
import { Col, Form, Row } from "react-bootstrap";

import Errors from "@src/notifications/Errors";
import AsyncCustomSelect from "@src/view/commonComponents/mainCard/AsyncCustomSelect";
import EditTabActions from "./components/EditTabActions";

const EditUserLocationTab = ({
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
  locationDropdown,
  countryId,
  citiesKey,
  sectionComplete,
}) => (
  <>
    {!sectionComplete && (
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
          />
          <Errors current_key="address" />
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
          </Form.Label>
          <AsyncCustomSelect
            value={formData.stateCode}
            onChange={(option) => handleSelectChange("stateCode", option)}
            options={countryId ? locationDropdown.states[countryId] || [] : []}
            isLoading={
              countryId
                ? locationDropdown.loadingStates[countryId] || false
                : false
            }
            isDisabled={isDisabled}
            isRequired
            placeholder="Select state"
            error={errorList.stateCode}
          />
          <Errors current_key="stateCode" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="cityId">
          <Form.Label className="form-sub-label">
            City <span className="text-danger">*</span>
          </Form.Label>
          <AsyncCustomSelect
            value={formData.cityId}
            onChange={(option) => handleSelectChange("cityId", option)}
            options={citiesKey ? locationDropdown.cities[citiesKey] || [] : []}
            isLoading={
              citiesKey
                ? locationDropdown.loadingCities[citiesKey] || false
                : false
            }
            isDisabled={isDisabled || !formData.stateCode?.value}
            isRequired
            placeholder="Select city"
            error={errorList.cityId}
          />
          <Errors current_key="cityId" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="villageId">
          <Form.Label className="form-sub-label">Native Village</Form.Label>
          <AsyncCustomSelect
            value={formData.villageId}
            onChange={(option) => handleSelectChange("villageId", option)}
            options={
              formData.cityId?.value
                ? locationDropdown.villages[formData.cityId.value] || []
                : []
            }
            isLoading={
              formData.cityId?.value
                ? locationDropdown.loadingVillages[formData.cityId.value] ||
                  false
                : false
            }
            isDisabled={
              isDisabled ||
              !formData.cityId?.value ||
              !formData.stateCode?.value
            }
            isRequired={false}
            placeholder="Select village (optional)"
            error={errorList.villageId}
          />
          <Errors current_key="villageId" />
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

EditUserLocationTab.propTypes = {
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
  locationDropdown: PropTypes.object.isRequired,
  countryId: PropTypes.string,
  citiesKey: PropTypes.string,
  sectionComplete: PropTypes.bool.isRequired,
};

export default React.memo(EditUserLocationTab);
