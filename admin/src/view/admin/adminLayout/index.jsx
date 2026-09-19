import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";

import AdminRoutes from "@src/view/routing/AdminRoutes";
import { isAdminOrSubAdmin, isAdmin } from "@src/utils/helper";
import { canAccessRoute, getFirstAllowedRoute } from "@src/utils/permissions";
import ShowAlert from "@src/notifications/ShowAlert";
import Header from "../layout/Header";
import Sidebar from "../layout/Sidebar";
import DefaultFooter from "../layout/DefaultFooter";
import { useMediaQuery } from "@src/hooks/useMediaQuery";

const AdminLayout = ({ adminAuth: { admin } }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLgUp = useMediaQuery("(min-width: 1200px)");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      if (admin) {
        const firstRoute = getFirstAllowedRoute(admin, AdminRoutes);
        if (firstRoute) {
          navigate(firstRoute, { replace: true });
        } else {
          navigate("/admin/no-access", { replace: true });
        }
      }
    }
  }, [location.pathname, admin, navigate]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isLgUp) setMobileSidebarOpen(false);
  }, [isLgUp]);

  return (
    <div className="portal-shell d-flex flex-column">
      <Header
        showMobileSidebarControl={!isLgUp}
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileSidebarToggle={() => setMobileSidebarOpen((open) => !open)}
      />
      <ShowAlert />
      <div className="portal-body flex-grow-1 d-flex min-vh-0">
        <Sidebar
          isLgUp={isLgUp}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="portal-body__main flex-grow-1 min-vw-0 min-vh-0 overflow-auto py-3 px-3">
          <Routes>
            {AdminRoutes.map((route, i) => {
              if (route.path === "no-access") {
                return <Route path={route.path} element={route.element} key={i} />;
              }

              if (route.path === "my-account" || route.path === "change-password") {
                if (isAdminOrSubAdmin(admin)) {
                  return <Route path={route.path} element={route.element} key={i} />;
                }
                return null;
              }

              if (route.path.startsWith("sub-admins")) {
                if (isAdmin(admin)) {
                  return <Route path={route.path} element={route.element} key={i} />;
                }
                return null;
              }

              const routePathForMatch = route.path.replace(/\/\*$/, "");
              const fullPath = `/admin/${routePathForMatch}`;
              if (isAdminOrSubAdmin(admin) && canAccessRoute(fullPath, admin)) {
                return <Route path={route.path} element={route.element} key={i} />;
              }
              return null;
            })}
            {admin && isAdminOrSubAdmin(admin) && (
              <Route
                path="*"
                element={
                  <Navigate
                    to={getFirstAllowedRoute(admin, AdminRoutes) || "/admin/no-access"}
                    replace
                  />
                }
              />
            )}
          </Routes>
        </main>
      </div>
      <DefaultFooter />
    </div>
  );
};

AdminLayout.propTypes = {
  adminAuth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  adminAuth: state.adminAuth,
});

export default connect(mapStateToProps, {})(AdminLayout);
