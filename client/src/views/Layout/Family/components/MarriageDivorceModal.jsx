import React from "react";
import PropTypes from "prop-types";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";

const MarriageDivorceModal = ({
  show,
  onHide,
  marriageDisplayName,
  onConfirm,
  loading,
}) => (
  <AdvancedModal
    show={show}
    onHide={onHide}
    title="End marriage (divorce)"
    size="md"
    closeButton
    bodyClassName="common-modal-body--start"
    actions={[
      {
        label: "Cancel",
        onClick: onHide,
        className: "btn btn--outline",
        colSize: 5,
        disabled: loading,
      },
      {
        label: loading ? "Updating…" : "Divorce",
        onClick: onConfirm,
        className: "btn btn--danger",
        colSize: 7,
        disabled: loading,
      },
    ]}
  >
    <p className="mb-0">
      Are you sure you want to mark this marriage as <strong>divorced</strong>?
      {marriageDisplayName && (
        <>
          {" "}
          <br />
          <span className="text-muted">{marriageDisplayName}</span>
        </>
      )}
    </p>
    <p className="mt-2 mb-0 small text-muted">
      The marriage will remain visible in the tree. Spouses will be able to
      remarry.
    </p>
  </AdvancedModal>
);

MarriageDivorceModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  marriageDisplayName: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default MarriageDivorceModal;
