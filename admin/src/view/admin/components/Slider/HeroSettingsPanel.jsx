import React, { useEffect, useState } from "react";
import { Card, Col, Form, Row, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { FaPlus, FaTrash, FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import Errors from "@src/notifications/Errors";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  getHeroSettings,
  updateHeroSettings,
  removeSliderErrors,
} from "@src/actions/adminSliderActions";
import { setErrors } from "@src/actions/adminAuth";
import { validateForm } from "@src/utils/validation";

const BUTTON_VARIANTS = [
  { value: "primary", label: "Primary" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
];

const createButton = (index = 0) => ({
  id: `hero_btn_${Date.now()}_${index}`,
  label: "",
  path: "",
  variant: "ghost",
  order: index + 1,
});

const buildFormDataFromSettings = (heroSettings = {}) => ({
  title: heroSettings.title || "",
  tagline: heroSettings.tagline || "",
  buttons: Array.isArray(heroSettings.buttons) ? heroSettings.buttons : [],
});

const HeroSettingsPanel = ({
  getHeroSettings,
  updateHeroSettings,
  removeSliderErrors,
  setErrors,
  heroSettings,
  loadingHeroSettings,
  savingHeroSettings,
  canEdit = false,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    tagline: "",
    buttons: [],
  });
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toggleEdit = () => setDisabled((prev) => !prev);
  const isReadOnly = isDisabled || !canEdit;

  useEffect(() => {
    getHeroSettings();
  }, [getHeroSettings]);

  useEffect(() => {
    if (!loadingHeroSettings && heroSettings) {
      setFormData(buildFormDataFromSettings(heroSettings));
    }
  }, [heroSettings, loadingHeroSettings]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onButtonChange = (index, field, value) => {
    setFormData((prev) => {
      const buttons = [...prev.buttons];
      buttons[index] = { ...buttons[index], [field]: value };
      return { ...prev, buttons };
    });
  };

  const addButton = () => {
    setFormData((prev) => ({
      ...prev,
      buttons: [...prev.buttons, createButton(prev.buttons.length)],
    }));
  };

  const removeButton = (index) => {
    setFormData((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  };

  const onSaveClick = () => {
    removeSliderErrors();

    const validationRules = [
      { path: "title", msg: "Hero title is required" },
      { path: "tagline", msg: "Hero tagline is required" },
    ];

    const errors = validateForm(formData, validationRules);
    const buttonErrors = formData.buttons
      .map((btn, index) => {
        if (!btn.label?.trim()) {
          return { path: `heroButton_${index}_label`, msg: "Button label is required" };
        }
        if (!btn.path?.trim()) {
          return { path: `heroButton_${index}_path`, msg: "Button path is required" };
        }
        return null;
      })
      .filter(Boolean);

    if (errors.length || buttonErrors.length) {
      setErrors([...errors, ...buttonErrors]);
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
      tagline: formData.tagline.replace(/\r\n/g, "\n"),
      buttons: formData.buttons.map((btn, index) => ({
        ...btn,
        label: btn.label.trim(),
        path: btn.path.trim(),
        order: index + 1,
      })),
      txn_password: txnPassword,
    };

    updateHeroSettings(payload, () => {
      setShowConfirmModal(false);
      setDisabled(true);
    });
  };

  const onClickCancel = () => {
    setFormData(buildFormDataFromSettings(heroSettings));
    removeSliderErrors();
    setDisabled(true);
  };

  return (
    <>
      <Card className="common-panel-card mb-4">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Hero Overlay Content</span>
          {canEdit ? (
            <Button
              type="button"
              variant={null}
              className={`btn btn-sm ${isDisabled ? "btn--theme" : "btn--outline"}`}
              onClick={toggleEdit}
              disabled={loadingHeroSettings || savingHeroSettings}
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
            This title, tagline, and button navigation is shared across all slider
            banners on the homepage.
          </p>

          <Row className="g-3">
            <Col md={12}>
              <Form.Group controlId="heroTitle">
                <Form.Label>Hero Title</Form.Label>
                <Form.Control
                  name="title"
                  value={formData.title}
                  onChange={onFieldChange}
                  placeholder="Enter hero title"
                  disabled={isReadOnly || loadingHeroSettings || savingHeroSettings}
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="heroTagline">
                <Form.Label>Hero Tagline</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="tagline"
                  value={formData.tagline}
                  onChange={onFieldChange}
                  placeholder="Enter hero tagline"
                  disabled={isReadOnly || loadingHeroSettings || savingHeroSettings}
                />
                <Errors current_key="tagline" />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4 mb-3">
            <span className="fw-semibold">Action Buttons</span>
            {!isReadOnly ? (
              <Button
                type="button"
                variant={null}
                className="btn btn--outline btn-sm"
                onClick={addButton}
                disabled={loadingHeroSettings || savingHeroSettings}
              >
                <FaPlus className="me-1" />
                Add Button
              </Button>
            ) : null}
          </div>

          {formData.buttons.length === 0 ? (
            <p className="text-muted small mb-0">No action buttons configured.</p>
          ) : null}

          {formData.buttons.map((btn, index) => (
            <div key={btn.id || index} className="border rounded p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Button {index + 1}</span>
                {!isReadOnly ? (
                  <Button
                    type="button"
                    variant={null}
                    className="btn btn--danger btn-sm"
                    onClick={() => removeButton(index)}
                    disabled={loadingHeroSettings || savingHeroSettings}
                  >
                    <FaTrash />
                  </Button>
                ) : null}
              </div>

              <Row className="g-2">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Label</Form.Label>
                    <Form.Control
                      value={btn.label}
                      onChange={(e) => onButtonChange(index, "label", e.target.value)}
                      placeholder="Button label"
                      disabled={isReadOnly || loadingHeroSettings || savingHeroSettings}
                    />
                    <Errors current_key={`heroButton_${index}_label`} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Navigation Path</Form.Label>
                    <Form.Control
                      value={btn.path}
                      onChange={(e) => onButtonChange(index, "path", e.target.value)}
                      placeholder="/register or #donation"
                      disabled={isReadOnly || loadingHeroSettings || savingHeroSettings}
                    />
                    <Errors current_key={`heroButton_${index}_path`} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Style</Form.Label>
                    <Form.Select
                      value={btn.variant}
                      onChange={(e) => onButtonChange(index, "variant", e.target.value)}
                      disabled={isReadOnly || loadingHeroSettings || savingHeroSettings}
                    >
                      {BUTTON_VARIANTS.map((variant) => (
                        <option key={variant.value} value={variant.value}>
                          {variant.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          ))}

          {canEdit ? (
            <div className="d-flex justify-content-end gap-2">
              <Button
                type="button"
                className="btn btn--theme"
                onClick={onSaveClick}
                disabled={isDisabled || loadingHeroSettings || savingHeroSettings}
              >
                {savingHeroSettings ? "Saving..." : "Save Hero Content"}
              </Button>
              <Button
                type="button"
                className="btn btn--danger"
                onClick={onClickCancel}
                disabled={isDisabled || loadingHeroSettings || savingHeroSettings}
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
        title="Confirm Hero Settings Update"
        body="Please enter your transaction password to save hero overlay content."
        submitBtnText="Save"
      />
    </>
  );
};

HeroSettingsPanel.propTypes = {
  getHeroSettings: PropTypes.func.isRequired,
  updateHeroSettings: PropTypes.func.isRequired,
  removeSliderErrors: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  heroSettings: PropTypes.object,
  loadingHeroSettings: PropTypes.bool,
  savingHeroSettings: PropTypes.bool,
  canEdit: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  heroSettings: state.slider.heroSettings,
  loadingHeroSettings: state.slider.loadingHeroSettings,
  savingHeroSettings: state.slider.savingHeroSettings,
});

export default connect(mapStateToProps, {
  getHeroSettings,
  updateHeroSettings,
  removeSliderErrors,
  setErrors,
})(HeroSettingsPanel);
