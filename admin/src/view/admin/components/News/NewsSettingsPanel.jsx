import React, { useEffect, useState } from "react";
import { Card, Col, Form, Row, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import Errors from "@src/notifications/Errors";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  getNewsSettings,
  updateNewsSettings,
  removeNewsErrors,
} from "@src/actions/adminNewsActions";
import { setErrors } from "@src/actions/adminAuth";
import { validateForm } from "@src/utils/validation";

const buildFormDataFromSettings = (newsSettings = {}) => ({
  title: newsSettings.title || "",
  description: newsSettings.description || "",
});

const NewsSettingsPanel = ({
  getNewsSettings,
  updateNewsSettings,
  removeNewsErrors,
  setErrors,
  newsSettings,
  loadingNewsSettings,
  savingNewsSettings,
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
    getNewsSettings();
  }, [getNewsSettings]);

  useEffect(() => {
    if (!loadingNewsSettings && newsSettings) {
      setFormData(buildFormDataFromSettings(newsSettings));
    }
  }, [newsSettings, loadingNewsSettings]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSaveClick = () => {
    removeNewsErrors();

    const validationRules = [
      { path: "title", msg: "News title is required" },
      { path: "description", msg: "News description is required" },
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

    updateNewsSettings(payload, () => {
      setShowConfirmModal(false);
      setDisabled(true);
    });
  };

  const onClickCancel = () => {
    setFormData(buildFormDataFromSettings(newsSettings));
    removeNewsErrors();
    setDisabled(true);
  };

  return (
    <>
      <Card className="common-panel-card mb-4">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Latest News — Section Content</span>
          {canEdit ? (
            <Button
              type="button"
              variant={null}
              className={`btn btn-sm ${isDisabled ? "btn--theme" : "btn--outline"}`}
              onClick={toggleEdit}
              disabled={loadingNewsSettings || savingNewsSettings}
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
            This title and short description appear on the homepage news section
            for all visitors.
          </p>

          <Row className="g-3">
            <Col md={12}>
              <Form.Group controlId="newsTitle">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  name="title"
                  value={formData.title}
                  onChange={onFieldChange}
                  placeholder="Enter news section title"
                  disabled={isReadOnly || loadingNewsSettings || savingNewsSettings}
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="newsDescription">
                <Form.Label>Short Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={onFieldChange}
                  placeholder="Enter a short description for the news section"
                  disabled={isReadOnly || loadingNewsSettings || savingNewsSettings}
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
                disabled={isDisabled || loadingNewsSettings || savingNewsSettings}
              >
                {savingNewsSettings ? "Saving..." : "Save Section Content"}
              </Button>
              <Button
                type="button"
                className="btn btn--danger"
                onClick={onClickCancel}
                disabled={isDisabled || loadingNewsSettings || savingNewsSettings}
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
        title="Confirm News Settings Update"
        body="Please enter your transaction password to save news section content."
        submitBtnText="Save"
      />
    </>
  );
};

NewsSettingsPanel.propTypes = {
  getNewsSettings: PropTypes.func.isRequired,
  updateNewsSettings: PropTypes.func.isRequired,
  removeNewsErrors: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  newsSettings: PropTypes.object,
  loadingNewsSettings: PropTypes.bool,
  savingNewsSettings: PropTypes.bool,
  canEdit: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  newsSettings: state.news.newsSettings,
  loadingNewsSettings: state.news.loadingNewsSettings,
  savingNewsSettings: state.news.savingNewsSettings,
});

export default connect(mapStateToProps, {
  getNewsSettings,
  updateNewsSettings,
  removeNewsErrors,
  setErrors,
})(NewsSettingsPanel);
