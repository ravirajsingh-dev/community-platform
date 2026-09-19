import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import { TAB_LABELS } from "@src/views/Layout/MyAccount/myAccountConstants";

const FieldLinks = ({ fields, onFieldClick }) => {
  if (!fields.length) return null;

  return (
    <span className="profile-incomplete-alert__fields">
      {fields.map((field, index) => (
        <React.Fragment key={field.key}>
          {index > 0 && ", "}
          <button
            type="button"
            className="profile-incomplete-alert__field-link"
            onClick={() => onFieldClick(field.tab)}
            title={`Go to ${TAB_LABELS[field.tab] || "profile"}`}
          >
            {field.label}
          </button>
        </React.Fragment>
      ))}
    </span>
  );
};

FieldLinks.propTypes = {
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      tab: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onFieldClick: PropTypes.func.isRequired,
};

const ProfileIncompleteAlert = ({
  missingFields,
  variant = "profile",
  tone = "default",
  title,
  description,
  className = "",
  showCompleteButton = true,
  completeButtonLabel = "Complete Profile",
  completeButtonPath = "/user/my-account",
}) => {
  const navigate = useNavigate();
  const isDanger = tone === "danger";
  const HeadingIcon = isDanger ? FaExclamationTriangle : FaTimesCircle;

  if (!missingFields?.length && variant !== "profile-first") return null;

  const goToTab = (tab) => {
    const path =
      tab && tab !== "core" ? `/user/my-account?tab=${tab}` : "/user/my-account";
    navigate(path);
  };

  const rootClassName = [
    "profile-incomplete-alert",
    isDanger ? "profile-incomplete-alert--danger" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const buttonClass = isDanger ? "btn--danger" : "btn--theme";

  if (variant === "profile-first") {
    return (
      <div
        role="alert"
        aria-live={isDanger ? "assertive" : "polite"}
        className={rootClassName}
      >
        <div className="profile-incomplete-alert__heading d-flex align-items-center flex-wrap gap-2">
          <span className="d-flex align-items-center">
            <HeadingIcon className="me-2" aria-hidden />
            {title || "Profile Incomplete"}
          </span>
          {isDanger && (
            <span className="profile-incomplete-alert__required">Required</span>
          )}
        </div>
        <p className="profile-incomplete-alert__description mb-3">
          {description || "Please complete your profile first."}
        </p>
        <hr className="profile-incomplete-alert__divider" />
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className={buttonClass}
            onClick={() => navigate(completeButtonPath)}
          >
            My Account
          </button>
        </div>
      </div>
    );
  }

  const isMatrimonialExtra = variant === "matrimonial-extra";

  const defaultTitle = isMatrimonialExtra
    ? "Additional details required for Matrimonial"
    : "Profile Incomplete";

  const defaultDescription = isDanger
    ? "You must complete your profile to access all features. This is mandatory — update the missing fields now."
    : isMatrimonialExtra
      ? "These fields are optional in your general profile but required when you apply for Matrimonial. Click a field to fill it in."
      : "Please complete your profile to continue using all features. Click any missing field to open that section.";

  return (
    <div
      role="alert"
      aria-live={isDanger ? "assertive" : "polite"}
      className={rootClassName}
    >
      <div className="profile-incomplete-alert__heading d-flex align-items-center flex-wrap gap-2">
        <span className="d-flex align-items-center">
          <HeadingIcon className="me-2" aria-hidden />
          {title || defaultTitle}
        </span>
        {isDanger && (
          <span className="profile-incomplete-alert__required">Action required</span>
        )}
      </div>

      <p className="profile-incomplete-alert__description mb-2">
        {description || defaultDescription}
      </p>

      <p className="profile-incomplete-alert__section mb-3">
        <small>
          <strong>
            {isMatrimonialExtra ? "Required for Matrimonial:" : "Missing fields:"}
          </strong>{" "}
          <FieldLinks fields={missingFields} onFieldClick={goToTab} />
        </small>
      </p>

      {showCompleteButton && (
        <>
          <hr className="profile-incomplete-alert__divider" />
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className={buttonClass}
              onClick={() => goToTab(missingFields[0]?.tab)}
            >
              {completeButtonLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

ProfileIncompleteAlert.propTypes = {
  missingFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      tab: PropTypes.string.isRequired,
      scope: PropTypes.string,
    }),
  ),
  variant: PropTypes.oneOf(["profile", "profile-first", "matrimonial-extra"]),
  tone: PropTypes.oneOf(["default", "danger"]),
  title: PropTypes.string,
  description: PropTypes.string,
  className: PropTypes.string,
  showCompleteButton: PropTypes.bool,
  completeButtonLabel: PropTypes.string,
  completeButtonPath: PropTypes.string,
};

export default ProfileIncompleteAlert;
