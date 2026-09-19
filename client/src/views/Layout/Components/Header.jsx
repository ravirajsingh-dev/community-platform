import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaHandHoldingHeart,
  FaExclamationTriangle,
} from "react-icons/fa";
import PortalItems from "@src/views/Routing/PortalItems";
import { BiSolidChevronDown } from "react-icons/bi";
import Sidebar from "./Sidebar";
import { connect } from "react-redux";
import { logout } from "@src/actions/auth";
import { getCommonSettings } from "@src/actions/commonActions";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import CommonSpinner from "@src/views/Common/Loaders/CommonSpinner";
import { requiresMembershipAction } from "@src/utils/membershipUtils";
import { buildClientMenuItems } from "@src/utils/comingSoonMenu";

const Header = ({
  logout,
  isAuthenticated,
  user,
  commonSettings,
  loadingCommonSettings,
  getCommonSettings,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const headerRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Treat null (auth still loading) as guest so the hamburger never flashes
  const isLoggedIn = Boolean(isAuthenticated);
  const registerEnabled = commonSettings?.registerEnabled !== false;

  const toggleSidebar = useCallback(() => setIsSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleLogoutModal = useCallback(
    () => setShowLogoutModal((p) => !p),
    [],
  );

  const goDonate = useCallback(() => {
    if (location.pathname === "/") {
      document
        .getElementById("donation")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate({ pathname: "/", hash: "donation" });
  }, [location.pathname, navigate]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      if (window.location.pathname.startsWith("/user/")) {
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setShowLogoutModal(false);
      if (window.location.pathname.startsWith("/user/")) {
        window.location.href = "/login";
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, navigate]);

  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoggedIn) setIsSidebarOpen(false);
  }, [isLoggedIn]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const isNavItemActive = useCallback(
    (item) => {
      if (item.path) {
        const [basePath, search] = item.path.split("?");
        if (location.pathname !== basePath) return false;
        if (!search) return true;
        return location.search === `?${search}`;
      }
      if (item.children) {
        return item.children.some(
          (c) =>
            location.pathname === c.path ||
            location.pathname.startsWith(`${c.path}/`),
        );
      }
      return false;
    },
    [location.pathname, location.search],
  );

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  const logoUrl = commonSettings?.logoUrl;
  const loadingLogo = loadingCommonSettings;
  const brandLabel =
    commonSettings?.abbreviation || commonSettings?.name || "RSF";

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

  useEffect(() => {
    const stickyEnterThreshold = 345;
    const stickyExitThreshold = 305;
    let rafId = null;
    let stickyState = false;

    const clearSticky = () => {
      const header = headerRef.current;
      if (!header) return;
      const wrapper = header.closest("#top-menu");
      wrapper?.classList.remove("site-header--offset");
      header.classList.remove("site-header__bar--sticky");
      stickyState = false;
    };

    const updateHeaderStickyState = () => {
      const header = headerRef.current;
      if (!header) return;

      const scroll = window.scrollY || document.documentElement.scrollTop;
      const maxScrollableDistance =
        document.documentElement.scrollHeight - window.innerHeight;
      const canReachStickyThreshold =
        maxScrollableDistance > stickyEnterThreshold;

      let shouldStick = stickyState;
      if (!canReachStickyThreshold) {
        shouldStick = false;
      } else if (!stickyState && scroll >= stickyEnterThreshold) {
        shouldStick = true;
      } else if (stickyState && scroll <= stickyExitThreshold) {
        shouldStick = false;
      }

      const wrapper = header.closest("#top-menu");
      if (wrapper) {
        wrapper.style.setProperty(
          "--layout-header-height",
          `${header.offsetHeight}px`,
        );
        wrapper.classList.toggle("site-header--offset", shouldStick);
      }

      header.classList.toggle("site-header__bar--sticky", shouldStick);
      stickyState = shouldStick;
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateHeaderStickyState();
        rafId = null;
      });
    };

    clearSticky();
    updateHeaderStickyState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateHeaderStickyState);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeaderStickyState);
      if (rafId) window.cancelAnimationFrame(rafId);
      clearSticky();
    };
  }, [location.pathname]);

  return (
    <header id="top-menu" className="site-header">
      <div className="site-header__bar" ref={headerRef}>
        <div className="site-header__shell site-header__row">
          <Link className="site-header__brand" to="/" title="Home">
            {loadingLogo ? (
              <CommonSpinner size="sm" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="Application logo"
                width={80}
                height={80}
              />
            ) : (
              <span className="site-header__brand-text">{brandLabel}</span>
            )}
          </Link>

          <nav
            className="site-header__nav"
            ref={navRef}
            aria-label="Primary navigation"
          >
            <ul className="site-header__menu">
              {menuItems.map((item, i) => {
                const isOpen = openDropdown === item.label;

                return (
                  <li
                    key={item.path || item.label || i}
                    className={`site-header__item${isOpen ? " site-header__item--open" : ""}`}
                  >
                    {item.children ? (
                      <button
                        type="button"
                        className={`site-header__trigger${isNavItemActive(item) ? " active" : ""}`}
                        aria-expanded={isOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(
                            openDropdown === item.label ? null : item.label,
                          );
                        }}
                      >
                        {item.label}
                        <BiSolidChevronDown
                          className={`site-header__chevron${isOpen ? " site-header__chevron--open" : ""}`}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <Link
                        to={item.path || "#"}
                        className={`site-header__link${isNavItemActive(item) ? " active" : ""}`}
                      >
                        {item.label}
                      </Link>
                    )}

                    {item.children && (
                      <ul className="site-header__dropdown">
                        {item.children.map((subItem, j) => (
                          <li key={subItem.path || j}>
                            <Link
                              to={subItem.path}
                              className={`site-header__dropdown-link${subItem.iconKey || subItem.icon ? " site-header__dropdown-link--media" : ""}${location.pathname === subItem.path ? " active" : ""}`}
                              onClick={() => setOpenDropdown(null)}
                            >
                              {!subItem.iconKey && subItem.icon && (
                                <span className="site-header__dropdown-icon">
                                  {subItem.icon}
                                </span>
                              )}
                              <span className="site-header__dropdown-text">
                                <span className="site-header__dropdown-label">
                                  {subItem.label}
                                </span>
                                {subItem.subtitle && (
                                  <span className="site-header__dropdown-desc">
                                    {subItem.subtitle}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div
            className={`site-header__actions${isLoggedIn ? " site-header__actions--member" : " site-header__actions--guest"}`}
          >
            <div className="site-header__auth btn-group-inline">
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm btn--icon"
                    onClick={goDonate}
                    aria-label="Donate"
                  >
                    <FaHandHoldingHeart aria-hidden />
                    <span className="site-header__auth-label">Donate</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm btn--icon"
                    onClick={toggleLogoutModal}
                    aria-label="Logout"
                  >
                    <FaSignOutAlt aria-hidden />
                    <span className="site-header__auth-label">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm btn--icon"
                    onClick={goDonate}
                    aria-label="Donate"
                  >
                    <FaHandHoldingHeart aria-hidden />
                    <span className="site-header__auth-label">Donate</span>
                  </button>
                  {registerEnabled && (
                    <button
                      type="button"
                      className="btn btn--outline btn--sm btn--icon"
                      onClick={() => navigate("/register")}
                      aria-label="Register"
                    >
                      <FaUserPlus aria-hidden />
                      <span className="site-header__auth-label">Register</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--theme btn--sm btn--icon"
                    onClick={() => navigate("/login")}
                    aria-label="Login"
                  >
                    <FaSignInAlt aria-hidden />
                    <span className="site-header__auth-label">Login</span>
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm btn--icon site-header__menu-toggle"
              onClick={toggleSidebar}
              aria-label="Open menu"
              aria-expanded={isSidebarOpen}
              aria-controls="site-navigation-drawer"
            >
              <FaBars aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

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
    </header>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  user: state.auth.user,
  commonSettings: state.common?.commonSettings || {},
  loadingCommonSettings: state.common?.loadingCommonSettings || false,
});

export default connect(mapStateToProps, {
  logout,
  getCommonSettings,
})(Header);
