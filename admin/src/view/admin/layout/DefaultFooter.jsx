import { connect } from "react-redux";
import PropTypes from "prop-types";
import DevelopedByAttribution from "./DevelopedByAttribution";

const DefaultFooter = ({ adminCommonSettings: { commonSettings } }) => {
  const name = commonSettings?.abbreviation || "";
  const developedBy = commonSettings?.developedBy?.trim() || "";

  return (
    <section
      role="contentinfo"
      aria-label="Copyright"
      className="site-footer-legal-bar"
    >
      <hr className="site-footer-section-rule" />
      <div
        className={`site-footer-legal-bar__inner${
          !developedBy ? " site-footer-legal-bar__inner--centered" : ""
        }`}
      >
        <p className="site-footer-copyright">
          © {new Date().getFullYear()}{" "}
          {name && <span className="site-footer-copyright-brand">{name}</span>}
          {name && ". "}All rights reserved.
        </p>
        <DevelopedByAttribution
          text={commonSettings?.developedBy}
          link={commonSettings?.developedByLink}
        />
      </div>
    </section>
  );
};

DefaultFooter.propTypes = {
  adminCommonSettings: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  adminCommonSettings: state.adminCommonSettings,
});

export default connect(mapStateToProps)(DefaultFooter);
