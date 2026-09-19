import React from "react";
import { Container } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import { hasPermission } from "@src/utils/permissions";
import HowItWorksSettingsPanel from "./HowItWorksSettingsPanel";

const HowItWorksManagement = ({ loggedInUser }) => {
  const loggedInAdmin = loggedInUser;

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="How Our Platform Works"
        crumbs={[{ name: "How Our Platform Works" }]}
      />

      <HowItWorksSettingsPanel
        canEdit={hasPermission(loggedInAdmin, "how-it-works", "edit")}
      />
    </Container>
  );
};

HowItWorksManagement.propTypes = {
  loggedInUser: PropTypes.object,
};

const mapStateToProps = (state) => ({
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps)(HowItWorksManagement);
