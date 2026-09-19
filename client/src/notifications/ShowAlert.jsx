import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { removeAlert } from "@src/actions/alert";

const defaultToastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored", // or "dark", "light"
};

const ShowAlert = ({ alerts = [], toastOptions = {}, removeAlert }) => {
  const createAlertNotification = (message, type) => {
    const normalizedType = type === "danger" ? "error" : type;
    const toastId = `${normalizedType}:${message}`;
    const finalOptions = {
      ...defaultToastOptions,
      ...toastOptions,
      toastId,
    };

    switch (normalizedType) {
      case "info":
        return toast.info(message, finalOptions);
      case "success":
        return toast.success(message, finalOptions);
      case "warning":
        return toast.warning(message, finalOptions);
      case "error":
        return toast.error(message, finalOptions);
      default:
        return toast(message, finalOptions);
    }
  };

  useEffect(() => {
    if (!alerts?.length) {
      return;
    }

    alerts.forEach((alert) => {
      createAlertNotification(alert.msg, alert.alertType);
    });
    removeAlert();
  }, [alerts, removeAlert]);

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

export default connect(mapStateToProps, { removeAlert })(ShowAlert);
