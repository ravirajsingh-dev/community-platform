import { useState, useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FaAngleDoubleUp } from "react-icons/fa";
import CommonSpinner from "@src/views/Common/Loaders/CommonSpinner";
import { getCommonSettings } from "@src/actions/commonActions";
import CopyIcon from "@src/views/Common/CopyIcon";
import SocialIcons from "@src/views/Common/SocialIcons/SocialIcons";

const FOOTER_LINKS = [
  { to: "/about-us", label: "About Us", shortLabel: "About" },
  { to: "/contact-us", label: "Contact Us", shortLabel: "Contact" },
  { to: "/returns-and-refunds", label: "Refunds", shortLabel: "Refunds" },
  { to: "/privacy-policy", label: "Privacy Policy", shortLabel: "Privacy" },
  { to: "/terms-and-conditions", label: "Terms & Conditions", shortLabel: "T&C" },
];

const Footer = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fullName = commonSettings?.name?.trim() || "";
  const contactUsPage = commonSettings?.contactUsPage || {};
  const email = contactUsPage.email?.trim() || "";
  const primaryPhone = contactUsPage.phone?.trim() || "";
  const secondaryPhone = contactUsPage.secondaryPhone?.trim() || "";
  const socialMedia = commonSettings?.socialMedia || {};

  if (loadingCommonSettings) {
    return (
      <footer className="site-footer site-footer--loading">
        <div
          className="site-footer__loading"
          aria-busy="true"
          aria-live="polite"
        >
          <CommonSpinner size="md" />
        </div>
      </footer>
    );
  }

  const renderPhone = (phone, key) => {
    const tel = phone.replace(/[^\d+]/g, "");
    return (
      <span key={key} className="site-footer__copy-row">
        <a
          href={tel ? `tel:${tel}` : undefined}
          className="site-footer__link site-footer__link--plain"
        >
          {phone}
        </a>
        <CopyIcon textToCopy={phone} iconSize={16} className="ms-1 align-middle" />
      </span>
    );
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <nav className="site-footer__nav" aria-label="Footer">
          <ul className="site-footer__nav-list">
            {FOOTER_LINKS.map(({ to, label, shortLabel }, index) => (
              <li key={to} className="site-footer__nav-item">
                {index > 0 ? (
                  <span className="site-footer__nav-sep" aria-hidden="true">
                    |
                  </span>
                ) : null}
                <Link
                  to={to}
                  className="site-footer__link site-footer__nav-link"
                  title={label}
                >
                  <span className="site-footer__nav-label--full">{label}</span>
                  <span className="site-footer__nav-label--short">{shortLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <address className="site-footer__connect">
          {fullName ? (
            <p className="site-footer__name">{fullName}</p>
          ) : null}

          {(primaryPhone || secondaryPhone) && (
            <div className="site-footer__phones">
              {primaryPhone ? renderPhone(primaryPhone, "primary") : null}
              {primaryPhone && secondaryPhone ? (
                <span className="site-footer__phone-sep" aria-hidden="true">
                  |
                </span>
              ) : null}
              {secondaryPhone ? renderPhone(secondaryPhone, "secondary") : null}
            </div>
          )}

          {email ? (
            <p className="site-footer__email site-footer__copy-row">
              <a
                href={`mailto:${email}`}
                className="site-footer__link site-footer__link--plain"
              >
                {email}
              </a>
              <CopyIcon
                textToCopy={email}
                iconSize={16}
                className="ms-1 align-middle"
              />
            </p>
          ) : null}

          <div className="site-footer__social">
            <SocialIcons socialMedia={socialMedia} size="small" />
          </div>
        </address>
      </div>

      {showBackToTop ? (
        <button
          type="button"
          className="site-footer__back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <FaAngleDoubleUp />
        </button>
      ) : null}
    </footer>
  );
};

Footer.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(Footer);
