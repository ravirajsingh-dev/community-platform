import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Col, Form, Row } from "react-bootstrap";

import Errors from "@src/notifications/Errors";
import CustomSelect from "@src/components/common/CustomSelect";
import {
  OccupationOptions,
  OccupationFieldConfig,
  EducationOptions,
  GenderOptions,
  MaritalStatusOptions,
  BloodGroupOptions,
  getOptionByValue,
  MAX_EDUCATIONS,
  getEducationSelectValues,
  toEducationArray,
} from "@src/constants/CustomSelectValues";
import { OCCUPATION_KEY_TO_FORM } from "./editUserConstants";
import {
  formSelectFieldChange,
  formMultiSelectFieldChange,
} from "./editUserUtils";
import EditTabActions from "./components/EditTabActions";

const EditUserAdditionalTab = ({
  formData,
  onChange,
  isDisabled,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  submitting,
  errorList,
}) => {
  const educationOptions = useMemo(() => {
    const selected = toEducationArray(formData.education);
    const legacy = selected.filter(
      (value) => !EducationOptions.some((o) => o.value === value),
    );
    if (legacy.length === 0) return EducationOptions;
    return [
      ...EducationOptions,
      ...legacy.map((value) => ({ label: value, value })),
    ];
  }, [formData.education]);

  const occupationOptions = useMemo(() => {
    if (
      formData.occupation &&
      !OccupationOptions.some((o) => o.value === formData.occupation)
    ) {
      return [
        ...OccupationOptions,
        { label: formData.occupation, value: formData.occupation },
      ];
    }
    return OccupationOptions;
  }, [formData.occupation]);

  return (
    <>
      <Row className="row-gap-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Group controlId="dob">
            <Form.Label className="form-sub-label">
              Date of Birth <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              className={`text-muted ${errorList.dob ? "form-input-invalid" : ""}`}
              type="date"
              name="dob"
              value={formData.dob}
              onChange={onChange}
              disabled={isDisabled}
            />
            <Errors current_key="dob" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="gender">
            <Form.Label className="form-sub-label">
              Gender <span className="text-danger">*</span>
            </Form.Label>
            <CustomSelect
              options={GenderOptions}
              value={getOptionByValue(GenderOptions, formData.gender)}
              onChange={formSelectFieldChange("gender", onChange)}
              isDisabled={isDisabled}
              isRequired
              placeholder="Select gender"
              error={errorList.gender}
            />
            <Errors current_key="gender" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="fatherName">
            <Form.Label className="form-sub-label">
              Father&apos;s Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              className={`text-muted ${errorList.fatherName ? "form-input-invalid" : ""}`}
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={onChange}
              disabled={isDisabled}
              maxLength={100}
            />
            <Errors current_key="fatherName" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="motherName">
            <Form.Label className="form-sub-label">
              Mother&apos;s Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              className={`text-muted ${errorList.motherName ? "form-input-invalid" : ""}`}
              type="text"
              name="motherName"
              value={formData.motherName}
              onChange={onChange}
              disabled={isDisabled}
              maxLength={100}
            />
            <Errors current_key="motherName" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="maritalStatus">
            <Form.Label className="form-sub-label">
              Marital Status <span className="text-danger">*</span>
            </Form.Label>
            <CustomSelect
              options={MaritalStatusOptions}
              value={getOptionByValue(MaritalStatusOptions, formData.maritalStatus)}
              onChange={formSelectFieldChange("maritalStatus", onChange)}
              isDisabled={isDisabled}
              isRequired
              placeholder="Select marital status"
              error={errorList.maritalStatus}
            />
            <Errors current_key="maritalStatus" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="height">
            <Form.Label className="form-sub-label">Height (cm)</Form.Label>
            <Form.Control
              className={`text-muted ${errorList.height ? "form-input-invalid" : ""}`}
              type="number"
              name="height"
              value={formData.height}
              onChange={onChange}
              disabled={isDisabled}
              min={0}
              max={300}
              step={1}
              placeholder="e.g. 170"
            />
            <Errors current_key="height" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="weight">
            <Form.Label className="form-sub-label">Weight (kg)</Form.Label>
            <Form.Control
              className={`text-muted ${errorList.weight ? "form-input-invalid" : ""}`}
              type="number"
              name="weight"
              value={formData.weight}
              onChange={onChange}
              disabled={isDisabled}
              min={0}
              max={500}
              step={0.1}
              placeholder="e.g. 65"
            />
            <Errors current_key="weight" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="education">
            <Form.Label className="form-sub-label">Education</Form.Label>
            <CustomSelect
              options={educationOptions}
              value={getEducationSelectValues(
                educationOptions,
                formData.education,
              )}
              onChange={(selected) => {
                const handler = formMultiSelectFieldChange("education", onChange);
                const next = Array.isArray(selected) ? selected : [];
                handler(next.slice(0, MAX_EDUCATIONS));
              }}
              isMulti
              isDisabled={isDisabled}
              placeholder="Type to search education"
              error={errorList.education}
            />
            <Form.Text className="text-muted">
              Select up to {MAX_EDUCATIONS} qualifications.
            </Form.Text>
            <Errors current_key="education" />
          </Form.Group>
        </Col>

        <Col xs={12} md={6}>
          <Form.Group controlId="occupation">
            <Form.Label className="form-sub-label">Occupation</Form.Label>
            <CustomSelect
              options={occupationOptions}
              value={getOptionByValue(occupationOptions, formData.occupation)}
              onChange={formSelectFieldChange("occupation", onChange)}
              isDisabled={isDisabled}
              placeholder="Select occupation"
              error={errorList.occupation}
            />
            <Errors current_key="occupation" />
          </Form.Group>
        </Col>

        {(OccupationFieldConfig[formData.occupation] || []).map((fieldSpec) => {
          const formKey = OCCUPATION_KEY_TO_FORM[fieldSpec.key] || fieldSpec.key;
          return (
            <Col xs={12} md={6} key={fieldSpec.key}>
              <Form.Group controlId="fieldspec-label">
                <Form.Label className="form-sub-label">
                  {fieldSpec.label}
                </Form.Label>
                <Form.Control
                  type="text"
                  name={formKey}
                  value={formData[formKey] || ""}
                  onChange={onChange}
                  disabled={isDisabled}
                  maxLength={200}
                  className="text-muted"
                />
              </Form.Group>
            </Col>
          );
        })}

        <Col xs={12} md={6}>
          <Form.Group controlId="bloodGroup">
            <Form.Label className="form-sub-label">Blood Group</Form.Label>
            <CustomSelect
              options={BloodGroupOptions}
              value={getOptionByValue(BloodGroupOptions, formData.bloodGroup)}
              onChange={formSelectFieldChange("bloodGroup", onChange)}
              isDisabled={isDisabled}
              placeholder="Select blood group"
              error={errorList.bloodGroup}
            />
            <Errors current_key="bloodGroup" />
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

EditUserAdditionalTab.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  errorList: PropTypes.object.isRequired,
};

export default React.memo(EditUserAdditionalTab);
