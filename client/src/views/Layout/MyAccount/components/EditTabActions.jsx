import React from "react";
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";

const EditTabActions = ({
  isEditing,
  onSave,
  onCancel,
  submitting,
}) => (
  <div className="d-flex justify-content-end gap-2 mt-3">
    <Button
      type="button"
      variant={null}
      className="btn btn--theme"
      onClick={onSave}
      disabled={!isEditing || submitting}
    >
      {submitting ? "Saving…" : "Save"}
    </Button>
    <Button
      type="button"
      variant={null}
      className="btn btn--danger"
      onClick={onCancel}
      disabled={!isEditing || submitting}
    >
      Cancel
    </Button>
  </div>
);

EditTabActions.propTypes = {
  isEditing: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
};

export default EditTabActions;
