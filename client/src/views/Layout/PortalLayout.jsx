import React, { useEffect, useState, useLayoutEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { HelmetProvider } from "react-helmet-async";

import Header from "./Components/Header";
import DefaultFooter from "./Components/DefaultFooter";
import BouncingLoader from "../Common/Loaders/BouncingLoader";
import { getCommonSettings } from "@src/actions/commonActions";
import { getProfileRequirements } from "@src/actions/profileActions";
import {
  isMembershipAllowedPath,
  requiresMembershipAction,
} from "@src/utils/membershipUtils";
import { isPaymentReturnUrl } from "@src/utils/paymentReturnHelper";

const PortalLayout = ({
  auth: { isAuthenticated, loading, user },
  getCommonSettings,
  getProfileRequirements,
  profileRequirements,
  profileRequirementsError,
}) => {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const location = useLocation();
  const isPaymentReturn = isPaymentReturnUrl(location.search);

  useEffect(() => {
    if (!loading) {
      setIsAuthChecked(true);
    }
  }, [loading]);

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!user || profileRequirements || profileRequirementsError) return;

    if (requiresMembershipAction(user)) return;

    getProfileRequirements();
  }, [user, profileRequirements, profileRequirementsError, getProfileRequirements]);

  if ((loading || !isAuthChecked) && !isPaymentReturn) {
    return <BouncingLoader minHeight="500px" />;
  }

  if (!isAuthenticated && !isPaymentReturn) {
    return <Navigate to="/login" />;
  }

  if (
    requiresMembershipAction(user) &&
    !isMembershipAllowedPath(location.pathname)
  ) {
    return <Navigate to="/user/dashboard" replace />;
  }

  return (
    <HelmetProvider>
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <div className="flex-grow-1">
          <Outlet />
        </div>

        <DefaultFooter />
      </div>
    </HelmetProvider>
  );
};

PortalLayout.propTypes = {
  auth: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
  getProfileRequirements: PropTypes.func.isRequired,
  profileRequirements: PropTypes.object,
  profileRequirementsError: PropTypes.string,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profileRequirements: state.profile?.requirements ?? null,
  profileRequirementsError: state.profile?.requirementsError ?? null,
});

export default connect(mapStateToProps, {
  getCommonSettings,
  getProfileRequirements,
})(PortalLayout);
