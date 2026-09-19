import React, { useMemo } from "react";
import { connect } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FaArrowLeft, FaHome, FaRocket, FaSignInAlt } from "react-icons/fa";
import PropTypes from "prop-types";
import { getComingSoonPath } from "@src/utils/comingSoonMenu";

const ComingSoonPage = ({
  commonSettings,
  isAuthenticated,
  loadingCommonSettings,
}) => {
  const { slug } = useParams();
  const comingSoon = commonSettings?.comingSoon || {};
  const brandLabel =
    commonSettings?.abbreviation || commonSettings?.name || "RSF";
  const logoUrl = commonSettings?.logoUrl?.trim() || "";

  const menuItems = useMemo(() => {
    const items = Array.isArray(comingSoon.menuItems)
      ? comingSoon.menuItems
      : [];
    return items
      .filter((item) => item?.label && item?.slug)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [comingSoon.menuItems]);

  const feature = useMemo(() => {
    if (!slug) return null;
    return menuItems.find((item) => item.slug === slug) || null;
  }, [menuItems, slug]);

  const notFound = Boolean(slug) && !feature && !loadingCommonSettings;

  const title = notFound
    ? "Feature not found"
    : feature?.label || comingSoon.title || "Coming Soon";

  const description = notFound
    ? "This Coming Soon menu item is unavailable or was removed."
    : feature?.description ||
      comingSoon.description ||
      "This feature is under development and will be available soon.";

  const relatedItems = useMemo(
    () => menuItems.filter((item) => !slug || item.slug !== slug),
    [menuItems, slug],
  );

  const backTo = isAuthenticated ? "/user/dashboard" : "/";
  const backLabel = isAuthenticated ? "Back to Dashboard" : "Back to Home";
  const pageTitle = `${title} | ${brandLabel}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="coming-soon-page">
        <div className="coming-soon-page__glow" aria-hidden />
        <div
          className="coming-soon-page__glow coming-soon-page__glow--secondary"
          aria-hidden
        />

        <div className="coming-soon-page__shell">
          <section className="coming-soon-page__hero">
            <div className="coming-soon-page__orb" aria-hidden={!logoUrl}>
              <span className="coming-soon-page__orb-ring" />
              <span className="coming-soon-page__orb-ring coming-soon-page__orb-ring--delayed" />
              <span
                className={`coming-soon-page__orb-core${logoUrl ? " coming-soon-page__orb-core--logo" : ""}`}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={brandLabel}
                    className="coming-soon-page__logo"
                  />
                ) : (
                  <FaRocket aria-hidden />
                )}
              </span>
            </div>

            <p className="coming-soon-page__eyebrow">
              {notFound ? "Unavailable" : "Coming Soon"}
            </p>

            <h1 className="coming-soon-page__title">{title}</h1>

            <div className="coming-soon-page__rule" aria-hidden />

            <p className="coming-soon-page__text">{description}</p>

            {!notFound && (
              <ul
                className="coming-soon-page__status"
                aria-label="Feature status"
              >
                <li>
                  <span className="coming-soon-page__status-dot" aria-hidden />
                  In development
                </li>
                <li>
                  <span
                    className="coming-soon-page__status-dot coming-soon-page__status-dot--soft"
                    aria-hidden
                  />
                  Launching soon
                </li>
              </ul>
            )}

            <div className="coming-soon-page__actions">
              <Link to={backTo} className="btn btn--theme coming-soon-page__cta">
                {isAuthenticated ? (
                  <FaArrowLeft aria-hidden />
                ) : (
                  <FaHome aria-hidden />
                )}
                <span>{backLabel}</span>
              </Link>

              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="btn btn--outline coming-soon-page__cta coming-soon-page__cta--ghost"
                >
                  <FaSignInAlt aria-hidden />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </section>

          {relatedItems.length > 0 && (
            <section
              className="coming-soon-page__more"
              aria-labelledby="coming-soon-more-heading"
            >
              <h2
                id="coming-soon-more-heading"
                className="coming-soon-page__more-title"
              >
                More on the way
              </h2>
              <p className="coming-soon-page__more-lead">
                Explore other upcoming features from {brandLabel}.
              </p>

              <ul className="coming-soon-page__grid">
                {relatedItems.map((item) => (
                  <li key={item.id || item.slug}>
                    <Link
                      to={getComingSoonPath(item.slug, { isAuthenticated })}
                      className="coming-soon-page__card"
                    >
                      <span className="coming-soon-page__card-label">
                        {item.label}
                      </span>
                      <span className="coming-soon-page__card-meta">
                        Coming soon
                      </span>
                      {item.description ? (
                        <span className="coming-soon-page__card-desc">
                          {item.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

ComingSoonPage.propTypes = {
  commonSettings: PropTypes.object,
  isAuthenticated: PropTypes.bool,
  loadingCommonSettings: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  commonSettings: state.common?.commonSettings || {},
  isAuthenticated: Boolean(state.auth?.isAuthenticated),
  loadingCommonSettings: Boolean(state.common?.loadingCommonSettings),
});

export default connect(mapStateToProps)(ComingSoonPage);
