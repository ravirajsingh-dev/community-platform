import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSignOutAlt,
  FaSignInAlt,
  FaExclamationTriangle,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { connect } from "react-redux";
import { adminLogout } from "@src/actions/adminAuth";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";

const Header = ({
  adminLogout,
  adminAuth: { isAdminAuthenticated, admin },
  adminCommonSettings: { commonSettings, loadingCommonSettings },
  showMobileSidebarControl = false,
  mobileSidebarOpen = false,
  onMobileSidebarToggle,
}) => {
  const navigate = useNavigate();
  const headerRef = useRef(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  const isAuthenticated = Boolean(isAdminAuthenticated && admin);

  const toggleLogoutModal = useCallback(
    () => setShowLogoutModal((p) => !p),
    [],
  );

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await adminLogout();
      setShowLogoutModal(false);
      navigate("/", { replace: true });
    } catch (_error) {
      setShowLogoutModal(false);
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, adminLogout, navigate]);

  const logoUrl = commonSettings?.logoUrl;
  const loadingLogo = loadingCommonSettings || !logoUrl;

  useEffect(() => {
    const stickyEnterThreshold = 345;
    const stickyExitThreshold = 305;
    let rafId = null;
    let stickyState = false;

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
        const totalHeaderPx = `${wrapper.offsetHeight}px`;
        wrapper.style.setProperty("--layout-header-height", totalHeaderPx);
        document.documentElement.style.setProperty(
          "--layout-header-height",
          totalHeaderPx,
        );
      }

      header.classList.toggle("site-header__bar--sticky", shouldStick);
      stickyState = shouldStick;
      setIsHeaderSticky((prev) => (prev === shouldStick ? prev : shouldStick));
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateHeaderStickyState();
        rafId = null;
      });
    };

    updateHeaderStickyState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateHeaderStickyState);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeaderStickyState);
      document.documentElement.style.removeProperty("--layout-header-height");
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const adminDisplayName =
    admin?.admin_id ||
    admin?.name ||
    admin?.email ||
    "Admin";

  const portalTitle =
    commonSettings?.name ||
    commonSettings?.abbreviation ||
    "Admin portal";

  const logoTargetPath = isAuthenticated ? "/admin/dashboard" : "/";

  return (
    <header
      id="top-menu"
      className={`site-header${isAuthenticated ? " site-header--admin" : ""}${isHeaderSticky ? " site-header--offset" : ""}`}
    >
      <div className="site-header__bar" ref={headerRef}>
        <div
          className={`site-header__shell site-header__row ${isAuthenticated ? "site-header__row--admin" : ""}`}
        >
          <div className="site-header__start">
            <Link
              className="site-header__brand"
              to={logoTargetPath}
              title={isAuthenticated ? "Dashboard" : "Login"}
            >
              {loadingLogo ? (
                <CommonSpinner size="sm" />
              ) : (
                <img
                  src={logoUrl}
                  alt="Application logo"
                  width={80}
                  height={80}
                />
              )}
            </Link>

            {isAuthenticated && (
              <div className="site-header__identity">
                <div className="site-header__identity-text">
                  <span className="site-header__identity-title">
                    {portalTitle} || {adminDisplayName}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="site-header__actions">
            {isAuthenticated && showMobileSidebarControl && (
              <button
                type="button"
                className="site-header__nav-toggle"
                id="portal-sidebar-toggle"
                aria-controls="portal-sidebar-nav"
                aria-expanded={mobileSidebarOpen}
                aria-label={
                  mobileSidebarOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
                }
                onClick={onMobileSidebarToggle}
              >
                {mobileSidebarOpen ? (
                  <FaTimes aria-hidden />
                ) : (
                  <FaBars aria-hidden />
                )}
              </button>
            )}
            <div className="site-header__auth btn-group-inline">
              {isAuthenticated ? (
                <button
                  type="button"
                  className="btn btn--outline site-header__logout-btn"
                  onClick={toggleLogoutModal}
                >
                  <FaSignOutAlt />
                  <span className="site-header__auth-label">Logout</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--theme"
                  onClick={() => navigate("/")}
                  aria-label="Login"
                >
                  <FaSignInAlt />
                  <span className="site-header__auth-label">Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
  adminAuth: state.adminAuth,
  adminCommonSettings: state.adminCommonSettings,
});

export default connect(mapStateToProps, { adminLogout })(Header);
