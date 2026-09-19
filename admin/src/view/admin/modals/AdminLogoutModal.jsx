import React from "react";
import { PropTypes } from "prop-types";
import { FaExclamationTriangle } from "react-icons/fa";
import { connect } from "react-redux";

import CustomModal from "@src/components/common/Modal/CustomModal";
import { adminLogout } from "@src/actions/adminAuth";

const AdminLogoutModal = ({ show, onHide, adminLogout }) => {
  const handleLogout = async () => {
    await adminLogout();
  };

  return (
    <CustomModal
      show={show}
      onHide={onHide}
      icon={<FaExclamationTriangle className="common-modal-icon is-danger" />}
      actions={[
        {
          label: "Close",
          onClick: onHide,
          className: "btn btn--outline",
          colSize: 5,
        },
        {
          label: "Confirm",
          onClick: handleLogout,
          className: "btn btn--danger",
        },
      ]}
    >
      Do you want to log out?
    </CustomModal>
  );
};

AdminLogoutModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  adminLogout: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, { adminLogout })(AdminLogoutModal);
