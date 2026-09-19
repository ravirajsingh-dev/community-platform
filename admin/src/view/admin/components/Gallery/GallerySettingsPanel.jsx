import React, { useEffect, useState } from "react";
import { Card, Col, Form, Row, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import Errors from "@src/notifications/Errors";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  getGallerySettings,
  updateGallerySettings,
  removeGalleryErrors,
} from "@src/actions/adminGalleryActions";
import { setErrors } from "@src/actions/adminAuth";
import { validateForm } from "@src/utils/validation";

const buildFormDataFromSettings = (gallerySettings = {}) => ({
  title: gallerySettings.title || "",
  description: gallerySettings.description || "",
});

const GallerySettingsPanel = ({
  getGallerySettings,
  updateGallerySettings,
  removeGalleryErrors,
  setErrors,
  gallerySettings,
  loadingGallerySettings,
  savingGallerySettings,
  canEdit = false,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toggleEdit = () => setDisabled((prev) => !prev);
  const isReadOnly = isDisabled || !canEdit;

  useEffect(() => {
    getGallerySettings();
  }, [getGallerySettings]);

  useEffect(() => {
    if (!loadingGallerySettings && gallerySettings) {
      setFormData(buildFormDataFromSettings(gallerySettings));
    }
  }, [gallerySettings, loadingGallerySettings]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSaveClick = () => {
    removeGalleryErrors();

    const validationRules = [
      { path: "title", msg: "Gallery title is required" },
      { path: "description", msg: "Gallery description is required" },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSave = (txnPassword) => {
    if (!txnPassword) {
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.replace(/\r\n/g, "\n"),
      txn_password: txnPassword,
    };

    updateGallerySettings(payload, () => {
      setShowConfirmModal(false);
      setDisabled(true);
    });
  };

  const onClickCancel = () => {
    setFormData(buildFormDataFromSettings(gallerySettings));
    removeGalleryErrors();
    setDisabled(true);
  };

  return (
    <>
      <Card className="common-panel-card mb-4">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Our Gallery — Section Content</span>
          {canEdit ? (
            <Button
              type="button"
              variant={null}
              className={`btn btn-sm ${isDisabled ? "btn--theme" : "btn--outline"}`}
              onClick={toggleEdit}
              disabled={loadingGallerySettings || savingGallerySettings}
            >
              {isDisabled ? (
                <>
                  <MdEdit className="me-1" />
                  Edit
                </>
              ) : (
                <>
                  <FaRegEye className="me-1" />
                  View Mode
                </>
              )}
            </Button>
          ) : null}
        </Card.Header>
        <Card.Body>
          <p className="text-muted small mb-3">
            This title and short description appear on the homepage gallery section
            for all visitors.
          </p>

          <Row className="g-3">
            <Col md={12}>
              <Form.Group controlId="galleryTitle">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  name="title"
                  value={formData.title}
                  onChange={onFieldChange}
                  placeholder="Enter gallery title"
                  disabled={isReadOnly || loadingGallerySettings || savingGallerySettings}
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="galleryDescription">
                <Form.Label>Short Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={onFieldChange}
                  placeholder="Enter a short description for the gallery section"
                  disabled={isReadOnly || loadingGallerySettings || savingGallerySettings}
                />
                <Errors current_key="description" />
              </Form.Group>
            </Col>
          </Row>

          {canEdit ? (
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                type="button"
                className="btn btn--theme"
                onClick={onSaveClick}
                disabled={isDisabled || loadingGallerySettings || savingGallerySettings}
              >
                {savingGallerySettings ? "Saving..." : "Save Section Content"}
              </Button>
              <Button
                type="button"
                className="btn btn--danger"
                onClick={onClickCancel}
                disabled={isDisabled || loadingGallerySettings || savingGallerySettings}
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={() => setShowConfirmModal(false)}
        handleConfirm={handleConfirmSave}
        title="Confirm Gallery Settings Update"
        body="Please enter your transaction password to save gallery section content."
        submitBtnText="Save"
      />
    </>
  );
};

GallerySettingsPanel.propTypes = {
  getGallerySettings: PropTypes.func.isRequired,
  updateGallerySettings: PropTypes.func.isRequired,
  removeGalleryErrors: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  gallerySettings: PropTypes.object,
  loadingGallerySettings: PropTypes.bool,
  savingGallerySettings: PropTypes.bool,
  canEdit: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  gallerySettings: state.gallery.gallerySettings,
  loadingGallerySettings: state.gallery.loadingGallerySettings,
  savingGallerySettings: state.gallery.savingGallerySettings,
});

export default connect(mapStateToProps, {
  getGallerySettings,
  updateGallerySettings,
  removeGalleryErrors,
  setErrors,
})(GallerySettingsPanel);
