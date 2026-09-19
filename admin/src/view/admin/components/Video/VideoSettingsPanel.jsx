import React, { useEffect, useState } from "react";
import { Card, Col, Form, Row, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import Errors from "@src/notifications/Errors";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  getVideoSettings,
  updateVideoSettings,
  removeVideoErrors,
} from "@src/actions/adminVideoActions";
import { setErrors } from "@src/actions/adminAuth";
import { validateForm } from "@src/utils/validation";

const buildFormDataFromSettings = (videoSettings = {}) => ({
  title: videoSettings.title || "",
  description: videoSettings.description || "",
});

const VideoSettingsPanel = ({
  getVideoSettings,
  updateVideoSettings,
  removeVideoErrors,
  setErrors,
  videoSettings,
  loadingVideoSettings,
  savingVideoSettings,
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
    getVideoSettings();
  }, [getVideoSettings]);

  useEffect(() => {
    if (!loadingVideoSettings && videoSettings) {
      setFormData(buildFormDataFromSettings(videoSettings));
    }
  }, [videoSettings, loadingVideoSettings]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSaveClick = () => {
    removeVideoErrors();

    const validationRules = [
      { path: "title", msg: "Video title is required" },
      { path: "description", msg: "Video description is required" },
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

    updateVideoSettings(payload, () => {
      setShowConfirmModal(false);
      setDisabled(true);
    });
  };

  const onClickCancel = () => {
    setFormData(buildFormDataFromSettings(videoSettings));
    removeVideoErrors();
    setDisabled(true);
  };

  return (
    <>
      <Card className="common-panel-card mb-4">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Our Videos — Section Content</span>
          {canEdit ? (
            <Button
              type="button"
              variant={null}
              className={`btn btn-sm ${isDisabled ? "btn--theme" : "btn--outline"}`}
              onClick={toggleEdit}
              disabled={loadingVideoSettings || savingVideoSettings}
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
            This title and short description appear on the homepage videos section
            for all visitors.
          </p>

          <Row className="g-3">
            <Col md={12}>
              <Form.Group controlId="videoTitle">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  name="title"
                  value={formData.title}
                  onChange={onFieldChange}
                  placeholder="Enter video section title"
                  disabled={isReadOnly || loadingVideoSettings || savingVideoSettings}
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="videoDescription">
                <Form.Label>Short Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={onFieldChange}
                  placeholder="Enter a short description for the videos section"
                  disabled={isReadOnly || loadingVideoSettings || savingVideoSettings}
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
                disabled={isDisabled || loadingVideoSettings || savingVideoSettings}
              >
                {savingVideoSettings ? "Saving..." : "Save Section Content"}
              </Button>
              <Button
                type="button"
                className="btn btn--danger"
                onClick={onClickCancel}
                disabled={isDisabled || loadingVideoSettings || savingVideoSettings}
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
        title="Confirm Video Settings Update"
        body="Please enter your transaction password to save video section content."
        submitBtnText="Save"
      />
    </>
  );
};

VideoSettingsPanel.propTypes = {
  getVideoSettings: PropTypes.func.isRequired,
  updateVideoSettings: PropTypes.func.isRequired,
  removeVideoErrors: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  videoSettings: PropTypes.object,
  loadingVideoSettings: PropTypes.bool,
  savingVideoSettings: PropTypes.bool,
  canEdit: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  videoSettings: state.video.videoSettings,
  loadingVideoSettings: state.video.loadingVideoSettings,
  savingVideoSettings: state.video.savingVideoSettings,
});

export default connect(mapStateToProps, {
  getVideoSettings,
  updateVideoSettings,
  removeVideoErrors,
  setErrors,
})(VideoSettingsPanel);
