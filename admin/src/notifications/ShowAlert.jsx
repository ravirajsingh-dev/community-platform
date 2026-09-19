import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ShowAlert = ({ alerts = [], toastOptions = {} }) => {
  const createAlertNotification = (message, type) => {
    if (!type || !message) {
      return; // Don't show alerts without a valid type or message
    }
    switch (type) {
      case "info":
        return toast.info(message, toastOptions);
      case "success":
        return toast.success(message, toastOptions);
      case "warning":
        return toast.warning(message, toastOptions);
      case "error":
      case "danger":
        return toast.error(message, toastOptions);
      default:
        // Don't show alerts with unknown types
        return;
    }
  };

  useEffect(() => {
    alerts &&
      alerts.length > 0 &&
      alerts.forEach((alert) => {
        createAlertNotification(alert.msg, alert.alertType);
      });
  }, [alerts]);

  return <ToastContainer />;
};

ShowAlert.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      alertType: PropTypes.string.isRequired,
      msg: PropTypes.string.isRequired,
    })
  ),
  toastOptions: PropTypes.object,
};

const mapStateToProps = (state) => ({
  alerts: state.alert,
});

export default connect(mapStateToProps)(ShowAlert);
