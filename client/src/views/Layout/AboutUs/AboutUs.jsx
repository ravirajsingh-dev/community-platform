import { useEffect } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";

import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/views/Common/NoRecordsFound/NoRecordsFound";
import AboutUsContent, { hasAboutUsContent } from "../Components/AboutUsContent";

const AboutUs = ({
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
      <div className="about-us-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  const aboutUs = commonSettings?.aboutUs || {};

  if (!hasAboutUsContent(aboutUs)) {
    return (
      <div className="about-us-page">
        <Container>
          <NoRecordsFound
            title="About Us content is being updated. Please check back soon."
            compact
          />
        </Container>
      </div>
    );
  }

  const pageTitle = aboutUs.title?.trim() || "About Us";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <AboutUsContent aboutUs={aboutUs} />
    </>
  );
};

AboutUs.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(AboutUs);
