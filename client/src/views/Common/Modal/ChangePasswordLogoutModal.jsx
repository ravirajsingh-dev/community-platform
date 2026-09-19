import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { TiWarning } from "react-icons/ti";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import { logoutAuthActions } from "@src/actions/auth";

const ChangePasswordLogoutModal = ({
  show,
  onHide = () => {},
  logoutAuthActions,
}) => {
  const handleLogout = async () => {
    await logoutAuthActions();
  };

  return (
    <AdvancedModal
      show={show}
      onHide={onHide}
      className="logout-modal"
      backdrop="static"
      keyboard={false}
      closeButton={false}
      icon={<TiWarning className="logout-icon" size={32} />}
      bodyClassName="logout-modal-body"
      actions={[
        {
          label: "Confirm",
          onClick: handleLogout,
          className: "btn-logout-confirm p-2",
        },
      ]}
    >
      Your password has been changed successfully. Please log out and log back in
      to apply the changes.
    </AdvancedModal>
  );
};

ChangePasswordLogoutModal.propTypes = {
  logoutAuthActions: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, { logoutAuthActions })(
  ChangePasswordLogoutModal,
);
