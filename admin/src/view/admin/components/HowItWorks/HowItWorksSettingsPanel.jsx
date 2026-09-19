import React, { useEffect, useState } from "react";
import { Card, Col, Form, Row, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { FaRegEye } from "react-icons/fa";
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import Errors from "@src/notifications/Errors";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  getHowItWorksSettings,
  updateHowItWorksSettings,
  removeHowItWorksErrors,
} from "@src/actions/adminHowItWorksActions";
import { setErrors } from "@src/actions/adminAuth";
import { validateForm } from "@src/utils/validation";

const MAX_STEPS = 10;

const createEmptyStep = () => ({
  id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  heading: "",
  description: "",
});

const buildFormDataFromSettings = (settings = {}) => ({
  title: settings.title || "",
  description: settings.description || "",
  steps: Array.isArray(settings.steps)
    ? settings.steps.map((step) => ({
        id: step.id || createEmptyStep().id,
        heading: step.heading || "",
        description: step.description || "",
      }))
    : [],
});

const HowItWorksSettingsPanel = ({
  getHowItWorksSettings,
  updateHowItWorksSettings,
  removeHowItWorksErrors,
  setErrors,
  howItWorksSettings,
  loadingHowItWorksSettings,
  savingHowItWorksSettings,
  canEdit = false,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    steps: [],
  });
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toggleEdit = () => setDisabled((prev) => !prev);
  const isReadOnly = isDisabled || !canEdit;
  const steps = formData.steps || [];

  useEffect(() => {
    getHowItWorksSettings();
  }, [getHowItWorksSettings]);

  useEffect(() => {
    if (!loadingHowItWorksSettings && howItWorksSettings) {
      setFormData(buildFormDataFromSettings(howItWorksSettings));
    }
  }, [howItWorksSettings, loadingHowItWorksSettings]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onStepField = (index, field, value) => {
    setFormData((prev) => {
      const nextSteps = [...(prev.steps || [])];
      nextSteps[index] = { ...nextSteps[index], [field]: value };
      return { ...prev, steps: nextSteps };
    });
  };

  const addStep = () => {
    if (steps.length >= MAX_STEPS) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      steps: [...(prev.steps || []), createEmptyStep()],
    }));
  };

  const removeStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      steps: (prev.steps || []).filter((_, i) => i !== index),
    }));
  };

  const moveStep = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) {
      return;
    }
    setFormData((prev) => {
      const nextSteps = [...(prev.steps || [])];
      const [item] = nextSteps.splice(index, 1);
      nextSteps.splice(target, 0, item);
      return { ...prev, steps: nextSteps };
    });
  };

  const onSaveClick = () => {
    removeHowItWorksErrors();

    if (steps.length > MAX_STEPS) {
      setErrors([
        { path: "howItWorks", msg: `At most ${MAX_STEPS} steps are allowed` },
      ]);
      return;
    }

    const flatForm = {
      title: formData.title,
      description: formData.description,
    };
    const validationRules = [];

    if (steps.length > 0) {
      validationRules.push({ path: "title", msg: "Title is required" });
      validationRules.push({
        path: "description",
        msg: "Short description is required",
      });
    }

    steps.forEach((step, index) => {
      flatForm[`steps.${index}.heading`] = step.heading || "";
      flatForm[`steps.${index}.description`] = step.description || "";
      validationRules.push({
        path: `steps.${index}.heading`,
        msg: `Step ${index + 1}: heading is required`,
      });
      validationRules.push({
        path: `steps.${index}.description`,
        msg: `Step ${index + 1}: description is required`,
      });
    });

    const errors = validateForm(flatForm, validationRules);
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
      description: formData.description.replace(/\r\n/g, "\n").trim(),
      steps: steps.map((step, order) => ({
        id: step.id,
        heading: step.heading.trim(),
        description: step.description.replace(/\r\n/g, "\n").trim(),
        order,
      })),
      txn_password: txnPassword,
    };

    updateHowItWorksSettings(payload, () => {
      setShowConfirmModal(false);
      setDisabled(true);
    });
  };

  const onClickCancel = () => {
    setFormData(buildFormDataFromSettings(howItWorksSettings));
    removeHowItWorksErrors();
    setDisabled(true);
  };

  return (
    <>
      <Card className="common-panel-card mb-4">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>How Our Platform Works — Section Content</span>
          {canEdit ? (
            <Button
              type="button"
              variant={null}
              className={`btn btn-sm ${isDisabled ? "btn--theme" : "btn--outline"}`}
              onClick={toggleEdit}
              disabled={loadingHowItWorksSettings || savingHowItWorksSettings}
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
            Configure the homepage &quot;How Our Platform Works&quot; section.
            Add up to {MAX_STEPS} steps. If no steps are added, the section
            stays hidden on the homepage.
          </p>

          <Row className="g-3">
            <Col md={12}>
              <Form.Group controlId="howItWorksTitle">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  name="title"
                  value={formData.title}
                  onChange={onFieldChange}
                  placeholder="e.g. How Our Platform Works"
                  disabled={
                    isReadOnly ||
                    loadingHowItWorksSettings ||
                    savingHowItWorksSettings
                  }
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="howItWorksDescription">
                <Form.Label>Short Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={onFieldChange}
                  placeholder="Enter a short description for this section"
                  disabled={
                    isReadOnly ||
                    loadingHowItWorksSettings ||
                    savingHowItWorksSettings
                  }
                />
                <Errors current_key="description" />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mb-3 mt-4">
            <Button
              type="button"
              variant={null}
              className="btn btn--outline btn-sm"
              onClick={addStep}
              disabled={isReadOnly || steps.length >= MAX_STEPS}
            >
              <FaPlus className="me-1" />
              Add step
            </Button>
          </div>

          {steps.length === 0 ? (
            <p className="text-muted small mb-0">
              No steps yet. Click &quot;Add step&quot; to create one.
            </p>
          ) : null}

          {steps.map((step, index) => (
            <div
              key={step.id}
              className="border rounded p-3 mb-3"
              style={{ borderColor: "var(--bs-border-color)" }}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <span className="text-muted small fw-semibold">
                  Step {String(index + 1).padStart(2, "0")}
                </span>
                <div className="d-flex gap-1">
                  <Button
                    type="button"
                    variant={null}
                    className="btn btn--outline btn-sm"
                    disabled={isReadOnly || index === 0}
                    onClick={() => moveStep(index, -1)}
                    aria-label="Move up"
                  >
                    <FaArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant={null}
                    className="btn btn--outline btn-sm"
                    disabled={isReadOnly || index >= steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                    aria-label="Move down"
                  >
                    <FaArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant={null}
                    className="btn btn--danger btn-sm"
                    disabled={isReadOnly}
                    onClick={() => removeStep(index)}
                    aria-label="Remove step"
                  >
                    <FaTrash />
                  </Button>
                </div>
              </div>

              <Form.Group controlId={`step-heading-${step.id}`} className="mb-2">
                <Form.Label>Heading</Form.Label>
                <Form.Control
                  type="text"
                  value={step.heading}
                  onChange={(e) => onStepField(index, "heading", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. Join Community"
                />
                <Errors current_key={`steps.${index}.heading`} />
              </Form.Group>

              <Form.Group
                controlId={`step-description-${step.id}`}
                className="mb-0"
              >
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={step.description}
                  onChange={(e) =>
                    onStepField(index, "description", e.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Describe this step…"
                />
                <Errors current_key={`steps.${index}.description`} />
              </Form.Group>
            </div>
          ))}

          <Errors current_key="howItWorks" />

          {canEdit ? (
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                type="button"
                className="btn btn--theme"
                onClick={onSaveClick}
                disabled={
                  isDisabled ||
                  loadingHowItWorksSettings ||
                  savingHowItWorksSettings
                }
              >
                {savingHowItWorksSettings ? "Saving..." : "Save Section Content"}
              </Button>
              <Button
                type="button"
                className="btn btn--danger"
                onClick={onClickCancel}
                disabled={
                  isDisabled ||
                  loadingHowItWorksSettings ||
                  savingHowItWorksSettings
                }
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
        title="Confirm How It Works Update"
        body="Please enter your transaction password to save How Our Platform Works content."
        submitBtnText="Save"
      />
    </>
  );
};

HowItWorksSettingsPanel.propTypes = {
  getHowItWorksSettings: PropTypes.func.isRequired,
  updateHowItWorksSettings: PropTypes.func.isRequired,
  removeHowItWorksErrors: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  howItWorksSettings: PropTypes.object,
  loadingHowItWorksSettings: PropTypes.bool,
  savingHowItWorksSettings: PropTypes.bool,
  canEdit: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  howItWorksSettings: state.howItWorks.howItWorksSettings,
  loadingHowItWorksSettings: state.howItWorks.loadingHowItWorksSettings,
  savingHowItWorksSettings: state.howItWorks.savingHowItWorksSettings,
});

export default connect(mapStateToProps, {
  getHowItWorksSettings,
  updateHowItWorksSettings,
  removeHowItWorksErrors,
  setErrors,
})(HowItWorksSettingsPanel);
