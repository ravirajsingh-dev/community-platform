import { Fragment, useEffect } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";

import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/views/Common/NoRecordsFound/NoRecordsFound";
import SocialIcons from "@src/views/Common/SocialIcons/SocialIcons";
import { hasSocialLinks } from "@src/views/Common/SocialIcons/socialPlatforms";
import CopyIcon from "@src/views/Common/CopyIcon";

const formatTel = (value) => String(value || "").replace(/\s/g, "");

const MultilineText = ({ text }) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  return trimmed.split("\n").map((line, i, arr) => (
    <Fragment key={i}>
      {line}
      {i < arr.length - 1 ? <br /> : null}
    </Fragment>
  ));
};

const ContactUs = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    if (!commonSettings?.contactUsPage) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <div className="contact-us-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  const contactUsPage = commonSettings?.contactUsPage || {};
  const socialMedia = commonSettings?.socialMedia || {};
  const orgName = commonSettings?.name?.trim() || "";

  const phone = contactUsPage.phone || "";
  const secondaryPhone = contactUsPage.secondaryPhone || "";
  const email = contactUsPage.email || "";
  const address = contactUsPage.address || "";
  const businessHours = contactUsPage.businessHours || "";

  const hasContent =
    phone || email || address || businessHours || secondaryPhone;

  const hasSocial = hasSocialLinks(socialMedia);

  const pageTitle = contactUsPage.title?.trim() || "Contact Us";
  const intro =
    contactUsPage.intro?.trim() ||
    "We would love to hear from you. Get in touch using the information below.";

  const renderPhone = (phoneNumber, key) => {
    const tel = formatTel(phoneNumber);
    return (
      <span key={key} className="contact-us-copy-row">
        <a
          href={tel ? `tel:${tel}` : undefined}
          className="contact-us-link contact-us-link--plain"
        >
          {phoneNumber}
        </a>
        <CopyIcon
          textToCopy={phoneNumber}
          iconSize={16}
          className="contact-us-copy-btn"
        />
      </span>
    );
  };

  if (!hasContent) {
    return (
      <div className="contact-us-page">
        <Container>
          <NoRecordsFound
            title="Contact information is being updated. Please check back soon."
            compact
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="contact-us-page">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="contact-us-hero">
        <Container>
          <div className="contact-us-hero__inner">
            <h1 className="contact-us-hero__title">{pageTitle}</h1>
            <p className="contact-us-hero__intro">{intro}</p>
          </div>
        </Container>
      </section>

      {orgName ? (
        <p className="contact-us-name">{orgName}</p>
      ) : null}

      <section className="contact-us-body">
        <Container>
          <address className="contact-us-connect">
            {phone || secondaryPhone ? (
              <div className="contact-us-row">
                <span className="contact-us-label">Phone</span>
                <div className="contact-us-phones">
                  {phone ? renderPhone(phone, "primary") : null}
                  {phone && secondaryPhone ? (
                    <span className="contact-us-phone-sep" aria-hidden="true">
                      |
                    </span>
                  ) : null}
                  {secondaryPhone ? renderPhone(secondaryPhone, "secondary") : null}
                </div>
              </div>
            ) : null}

            {email ? (
              <div className="contact-us-row">
                <span className="contact-us-label">Email</span>
                <p className="contact-us-email contact-us-copy-row">
                  <a
                    href={`mailto:${email}`}
                    className="contact-us-link contact-us-link--plain"
                  >
                    {email}
                  </a>
                  <CopyIcon
                    textToCopy={email}
                    iconSize={16}
                    className="contact-us-copy-btn"
                  />
                </p>
              </div>
            ) : null}

            {address ? (
              <div className="contact-us-row">
                <span className="contact-us-label">Address</span>
                <p className="contact-us-address contact-us-copy-row">
                  <span className="contact-us-text">
                    <MultilineText text={address} />
                  </span>
                  <CopyIcon
                    textToCopy={address.trim()}
                    iconSize={16}
                    className="contact-us-copy-btn"
                  />
                </p>
              </div>
            ) : null}

            {businessHours ? (
              <div className="contact-us-row">
                <span className="contact-us-label">Hours</span>
                <p className="contact-us-hours">
                  <span className="contact-us-text">
                    <MultilineText text={businessHours} />
                  </span>
                </p>
              </div>
            ) : null}

            {hasSocial ? (
              <div className="contact-us-social">
                <span className="contact-us-label">Follow us</span>
                <SocialIcons socialMedia={socialMedia} size="small" />
              </div>
            ) : null}
          </address>
        </Container>
      </section>
    </div>
  );
};

ContactUs.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(ContactUs);
