import React from "react";
import PropTypes from "prop-types";
import { Col, Form, Row } from "react-bootstrap";

import Errors from "@src/notifications/Errors";
import AsyncCustomSelect from "@src/view/commonComponents/mainCard/AsyncCustomSelect";
import EditTabActions from "./components/EditTabActions";

const EditUserCommunityTab = ({
  formData,
  handleSelectChange,
  isDisabled,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  submitting,
  errorList,
  masterDataDropdown,
  sectionComplete,
}) => (
  <>
    {!sectionComplete && (
      <p className="text-muted small mb-3">
        Community details are optional until you start filling them. Once saved,
        Community through Gotra / Sub-Khamp become required and cannot be cleared.
        Gotra depends on Kul (same for all Khamp/Sub-Khamp under that Kul). Old
        values labeled “Gotra” were migrated to Sub-Khamp.
      </p>
    )}

    <Row className="row-gap-3 mb-3">
      <Col xs={12} md={6}>
        <Form.Group controlId="community">
          <Form.Label className="form-sub-label">
            Community <span className="text-danger">*</span>
          </Form.Label>
          <AsyncCustomSelect
            value={formData.community}
            onChange={(option) => handleSelectChange("community", option)}
            options={masterDataDropdown.communities}
            isLoading={masterDataDropdown.loadingCommunities}
            isDisabled={isDisabled}
            isRequired
            placeholder="Select community"
            error={errorList.community}
          />
          <Errors current_key="community" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="vansh">
          <Form.Label className="form-sub-label">
            Vansh <span className="text-danger">*</span>
          </Form.Label>
          <AsyncCustomSelect
            value={formData.vansh}
            onChange={(option) => handleSelectChange("vansh", option)}
            options={
              formData.community?.value
                ? masterDataDropdown.vanshes[formData.community.value] || []
                : []
            }
            isLoading={
              formData.community?.value
                ? masterDataDropdown.loadingVanshes[formData.community.value] ||
                  false
                : false
            }
            isDisabled={isDisabled || !formData.community?.value}
            isRequired
            placeholder="Select vansh"
            error={errorList.vansh}
          />
          <Errors current_key="vansh" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="kul">
          <Form.Label className="form-sub-label">
            Kul <span className="text-danger">*</span>
          </Form.Label>
          <AsyncCustomSelect
            value={formData.kul}
            onChange={(option) => handleSelectChange("kul", option)}
            options={
              formData.vansh?.value
                ? masterDataDropdown.kuls[formData.vansh.value] || []
                : []
            }
            isLoading={
              formData.vansh?.value
                ? masterDataDropdown.loadingKuls[formData.vansh.value] || false
                : false
            }
            isDisabled={isDisabled || !formData.vansh?.value}
            isRequired
            placeholder="Select kul"
            error={errorList.kul}
          />
          <Errors current_key="kul" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="gotra">
          <Form.Label className="form-sub-label">
            Gotra <span className="text-danger">*</span>
          </Form.Label>
          <AsyncCustomSelect
            value={formData.gotra}
            onChange={(option) => handleSelectChange("gotra", option)}
            options={
              formData.kul?.value
                ? masterDataDropdown.gotras[formData.kul.value] || []
                : []
            }
            isLoading={
              formData.kul?.value
                ? masterDataDropdown.loadingGotras[formData.kul.value] || false
                : false
            }
            isDisabled={isDisabled || !formData.kul?.value}
            isRequired
            placeholder="Select gotra"
            error={errorList.gotra}
          />
          <Errors current_key="gotra" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="khamp">
          <Form.Label className="form-sub-label">
            Khamp <span className="text-danger">*</span>
          </Form.Label>
          <AsyncCustomSelect
            value={formData.khamp}
            onChange={(option) => handleSelectChange("khamp", option)}
            options={
              formData.kul?.value
                ? masterDataDropdown.khamps[formData.kul.value] || []
                : []
            }
            isLoading={
              formData.kul?.value
                ? masterDataDropdown.loadingKhamps[formData.kul.value] || false
                : false
            }
            isDisabled={isDisabled || !formData.kul?.value}
            isRequired
            placeholder="Select khamp"
            error={errorList.khamp}
          />
          <Errors current_key="khamp" />
        </Form.Group>
      </Col>

      <Col xs={12} md={6}>
        <Form.Group controlId="subKhamp">
          <Form.Label className="form-sub-label">
            Sub-Khamp <span className="text-danger">*</span>
          </Form.Label>
          <AsyncCustomSelect
            value={formData.subKhamp}
            onChange={(option) => handleSelectChange("subKhamp", option)}
            options={
              formData.khamp?.value
                ? masterDataDropdown.subKhamps[formData.khamp.value] || []
                : []
            }
            isLoading={
              formData.khamp?.value
                ? masterDataDropdown.loadingSubKhamps[formData.khamp.value] ||
                  false
                : false
            }
            isDisabled={isDisabled || !formData.khamp?.value}
            isRequired
            placeholder="Select sub-khamp"
            error={errorList.subKhamp}
          />
          <Errors current_key="subKhamp" />
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

EditUserCommunityTab.propTypes = {
  formData: PropTypes.object.isRequired,
  handleSelectChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  errorList: PropTypes.object.isRequired,
  masterDataDropdown: PropTypes.object.isRequired,
  sectionComplete: PropTypes.bool.isRequired,
};

export default React.memo(EditUserCommunityTab);
