import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

const AuthShell = ({
  title,
  subtitle,
  wide = false,
  loading = false,
  loadingMessage = "Loading...",
  footer,
  children,
}) => (
  <div className="auth-page">
    <div className="auth-page__glow auth-page__glow--one" aria-hidden />
    <div className="auth-page__glow auth-page__glow--two" aria-hidden />

    <div
      className={`auth-page__card ${wide ? "auth-page__card--wide" : "auth-page__card--narrow"}`}
    >
      <header className="auth-page__header">
        <Link to="/" className="auth-page__back">
          <FaHome aria-hidden />
          <span>Back to Home</span>
        </Link>

        <h1 className="auth-page__title">{title}</h1>
        {subtitle ? <p className="auth-page__subtitle">{subtitle}</p> : null}
      </header>

      <div className="auth-page__body">
        {loading ? (
          <BouncingLoader minHeight="140px" message={loadingMessage} />
        ) : (
          children
        )}
      </div>

      {footer ? <footer className="auth-page__footer">{footer}</footer> : null}
    </div>
  </div>
);

AuthShell.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  wide: PropTypes.bool,
  loading: PropTypes.bool,
  loadingMessage: PropTypes.string,
  footer: PropTypes.node,
  children: PropTypes.node,
};

export default AuthShell;
