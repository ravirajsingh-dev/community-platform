import { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Container } from "react-bootstrap";

import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import AboutUsContent, { hasAboutUsContent } from "./AboutUsContent";

const About = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    if (!commonSettings?.aboutUs) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <section className="home-about home-about--embedded home-section-surface">
        <Container>
          <BouncingLoader minHeight="400px" />
        </Container>
      </section>
    );
  }

  const aboutUs = commonSettings?.aboutUs || {};

  if (!hasAboutUsContent(aboutUs)) {
    return null;
  }

  return <AboutUsContent aboutUs={aboutUs} embedded />;
};

About.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(About);
