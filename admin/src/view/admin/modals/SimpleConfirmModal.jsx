import React from "react";
import PropTypes from "prop-types";

import CustomModal from "@src/components/common/Modal/CustomModal";

const SimpleConfirmModal = ({
  show,
  onHide,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  confirmClassName = "btn btn--theme",
}) => {
  return (
    <CustomModal
      show={show}
      onHide={onHide}
      title={title}
      actions={[
        { label: "Cancel", onClick: onHide, className: "btn btn--outline" },
        {
          label: confirmLabel,
          onClick: onConfirm,
          className: confirmClassName,
        },
      ]}
    >
      <p className="mb-0">{body}</p>
    </CustomModal>
  );
};

SimpleConfirmModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string,
  confirmClassName: PropTypes.string,
};

export default SimpleConfirmModal;
