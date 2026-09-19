import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaHandHoldingHeart,
  FaExclamationTriangle,
} from "react-icons/fa";
import PropTypes from "prop-types";
import PortalItems from "@src/views/Routing/PortalItems";
import { connect } from "react-redux";
import { logout } from "@src/actions/auth";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import { requiresMembershipAction } from "@src/utils/membershipUtils";
import { buildClientMenuItems } from "@src/utils/comingSoonMenu";

const Sidebar = ({
  logout,
  isOpen,
  onClose,
  isAuthenticated,
  user,
  registerEnabled = true,
  commonSettings,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  const toggleLogoutModal = useCallback(() => {
    setShowLogoutModal((p) => !p);
  }, []);

  const toggleDropdown = useCallback((label) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  }, []);

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!isOpen || !drawerRef.current) return;
      if (!drawerRef.current.contains(event.target)) onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, onClose]);

  const menuItems = useMemo(
    () =>
      buildClientMenuItems({
        isAuthenticated,
        user,
        commonSettings,
        portalItems: PortalItems,
        requiresMembershipAction,
      }),
    [isAuthenticated, user, commonSettings],
  );

  const goDonate = useCallback(() => {
    onClose();
    if (location.pathname === "/") {
      // Wait a tick so drawer close doesn't fight the scroll
      window.requestAnimationFrame(() => {
        document
          .getElementById("donation")
          ?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }
    navigate({ pathname: "/", hash: "donation" });
  }, [location.pathname, navigate, onClose]);

  const goRegister = useCallback(() => {
    navigate("/register");
    onClose();
  }, [navigate, onClose]);

  const goLogin = useCallback(() => {
    navigate("/login");
    onClose();
  }, [navigate, onClose]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      onClose();
      if (window.location.pathname.startsWith("/user/")) {
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setShowLogoutModal(false);
      onClose();
      if (window.location.pathname.startsWith("/user/")) {
        window.location.href = "/login";
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, navigate, onClose]);

  return (
    <>
      <div
        className={`site-drawer__backdrop${isOpen ? " site-drawer__backdrop--open" : ""}`}
        aria-hidden={!isOpen}
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        id="site-navigation-drawer"
        className={`site-drawer${isOpen ? " site-drawer--open" : ""}`}
        aria-hidden={!isOpen}
        aria-label="Mobile navigation"
      >
        <header className="site-drawer__head">
          <div className="site-drawer__brand">
            {commonSettings?.logoUrl ? (
              <img
                src={commonSettings.logoUrl}
                alt=""
                className="site-drawer__brand-logo"
              />
            ) : null}
            <span className="site-drawer__title">MENU</span>
          </div>
          <button
            type="button"
            className="site-drawer__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </header>

        <nav className="site-drawer__body" aria-label="Site navigation">
          <ul className="site-drawer__list">
            {menuItems.map((item, index) => {
              const childActive = item.children?.some(
                (c) =>
                  location.pathname === c.path ||
                  location.pathname.startsWith(`${c.path}/`),
              );
              const linkActive = (() => {
                if (item.children || !item.path) return false;
                const [basePath, search] = item.path.split("?");
                if (location.pathname !== basePath) return false;
                if (!search) return true;
                return location.search === `?${search}`;
              })();

              const itemOpen = openDropdown === item.label;
              const hasBranch = Boolean(item.children);
              const modifiers = [
                hasBranch && "site-drawer__item--branch",
                itemOpen && "site-drawer__item--open",
                childActive && "site-drawer__item--child-active",
                linkActive && "site-drawer__item--active",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li
                  key={item.path || item.label || index}
                  className={`site-drawer__item ${modifiers}`.trim()}
                >
                  {hasBranch ? (
                    <button
                      type="button"
                      className="site-drawer__parent"
                      aria-expanded={itemOpen}
                      onClick={() => toggleDropdown(item.label)}
                    >
                      <span className="site-drawer__parent-label">
                        {item.label}
                      </span>
                    </button>
                  ) : (
                    <Link
                      className="site-drawer__link"
                      to={item.path || "#"}
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>
                  )}

                  {item.children && (
                    <ul className="site-drawer__sub">
                      {item.children.map((child, childIndex) => {
                        const showIcon = child.iconKey || child.icon;
                        const subActive = location.pathname === child.path;

                        return (
                          <li key={child.path || childIndex}>
                            <Link
                              to={child.path}
                              className={`site-drawer__sub-link${showIcon ? " site-drawer__sub-link--media" : ""}${subActive ? " site-drawer__sub-link--active" : ""}`}
                              onClick={onClose}
                            >
                              {showIcon && !child.iconKey && child.icon && (
                                <span className="site-drawer__sub-icon">
                                  {child.icon}
                                </span>
                              )}
                              <span className="site-drawer__sub-text">
                                <span className="site-drawer__sub-label">
                                  {child.label}
                                </span>
                                {child.subtitle && (
                                  <span className="site-drawer__sub-desc">
                                    {child.subtitle}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="site-drawer__foot">
          {isAuthenticated ? (
            <div className="site-drawer__foot-row">
              <button
                type="button"
                className="btn btn--theme site-drawer__foot-btn"
                onClick={goDonate}
                aria-label="Donate"
              >
                <FaHandHoldingHeart aria-hidden />
                <span className="site-drawer__foot-label">Donate</span>
              </button>
              <button
                type="button"
                className="btn btn--outline site-drawer__foot-btn"
                onClick={toggleLogoutModal}
                aria-label="Logout"
              >
                <FaSignOutAlt aria-hidden />
                <span className="site-drawer__foot-label">Logout</span>
              </button>
            </div>
          ) : (
            <div className="site-drawer__foot-row">
              {registerEnabled && (
                <button
                  type="button"
                  className="btn btn--outline site-drawer__foot-btn"
                  onClick={goRegister}
                >
                  <FaUserPlus aria-hidden />
                  <span className="site-drawer__foot-label">Register</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn--theme site-drawer__foot-btn"
                onClick={goLogin}
              >
                <FaSignInAlt aria-hidden />
                <span className="site-drawer__foot-label">Login</span>
              </button>
            </div>
          )}
        </footer>
      </aside>

      <AdvancedModal
        show={showLogoutModal}
        onHide={toggleLogoutModal}
        icon={<FaExclamationTriangle className="common-modal-icon is-danger" />}
        actions={[
          {
            label: "Close",
            onClick: toggleLogoutModal,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: isLoggingOut ? "Logging out..." : "Confirm",
            onClick: handleLogout,
            className: "btn btn--danger",
            disabled: isLoggingOut,
          },
        ]}
      >
        Do you want to log out?
      </AdvancedModal>
    </>
  );
};

Sidebar.propTypes = {
  logout: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  user: PropTypes.object,
  registerEnabled: PropTypes.bool,
  commonSettings: PropTypes.object,
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  user: state.auth.user,
  registerEnabled: state.common?.commonSettings?.registerEnabled !== false,
  commonSettings: state.common?.commonSettings || {},
});

export default connect(mapStateToProps, { logout })(Sidebar);
