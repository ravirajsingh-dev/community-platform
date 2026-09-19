import React from "react";
import PropTypes from "prop-types";
import { FaLink } from "react-icons/fa";
import CopyIcon from "@src/views/Common/CopyIcon";

const ReferralLinkBox = ({
  referralLink,
  onCopy,
  title = "Referral Link",
  subtitle,
  showIcon = true,
  compact = false,
}) => {
  if (!referralLink) return null;

  return (
    <section
      className={`referral-link-box${compact ? " referral-link-box--compact" : ""}`}
      aria-label="Referral link"
    >
      {(title || subtitle) && (
        <div className="referral-link-box__header">
          {title ? (
            <h2 className="referral-link-box__title">
              {showIcon && <FaLink aria-hidden />}
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="referral-link-box__subtitle">{subtitle}</p>
          ) : null}
        </div>
      )}

      <div className="referral-link-box__row">
        <span className="referral-link-box__url" title={referralLink}>
          {referralLink}
        </span>
        <CopyIcon
          textToCopy={referralLink}
          iconSize={compact ? 18 : 20}
          className="referral-link-box__copy"
          onCopy={onCopy}
        />
      </div>
    </section>
  );
};

ReferralLinkBox.propTypes = {
  referralLink: PropTypes.string,
  onCopy: PropTypes.func,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showIcon: PropTypes.bool,
  compact: PropTypes.bool,
};

export default ReferralLinkBox;
