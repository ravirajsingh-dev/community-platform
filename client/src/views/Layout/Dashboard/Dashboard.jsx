import React, { useEffect, useMemo } from "react";
import { connect } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "react-bootstrap";
import {
  FaSearch,
  FaUsers,
  FaSitemap,
  FaHeart,
  FaUserCircle,
  FaCheckCircle,
  FaCalendarAlt,
  FaIdBadge,
  FaArrowRight,
} from "react-icons/fa";
import { loadUser } from "@src/actions/auth";
import { getUserProfile } from "@src/actions/profileActions";
import { setAlert } from "@src/actions/alert";
import ProfileIncompleteAlert from "@src/views/Common/ProfileIncompleteAlert";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import ReferralLinkBox from "@src/views/Common/ReferralLinkBox";
import DashboardMembershipCard from "@src/views/Layout/Dashboard/DashboardMembershipCard";
import MembershipRenewalSection from "@src/views/Layout/Membership/MembershipRenewalSection";
import { getMissingGeneralProfileFields } from "@src/utils/profileCompletion";
import { requiresMembershipAction } from "@src/utils/membershipUtils";
import { buildReferralLink } from "@src/utils/referralLink";
import PortalItems, { flattenPortalItems } from "@src/views/Routing/PortalItems";

const QUICK_ACTION_META = {
  "/user/search-member": {
    icon: FaSearch,
    description: "Find members across the community",
  },
  "/user/family": {
    icon: FaUsers,
    description: "Add and manage your family records",
  },
  "/user/family-tree": {
    icon: FaSitemap,
    description: "View your family lineage visually",
  },
  "/user/matrimonial": {
    icon: FaHeart,
    description: "Browse or apply for matrimonial listings",
  },
  "/user/my-account": {
    icon: FaUserCircle,
    description: "Update profile, community and location",
  },
};

const Dashboard = ({
  loggedInUser,
  loadUser,
  getUserProfile,
  profile,
  setAlert,
}) => {
  const [searchParams] = useSearchParams();
  const isPaymentReturn = searchParams.has("order_id");
  const membershipRestricted = requiresMembershipAction(loggedInUser);

  const referralLink = useMemo(
    () => buildReferralLink(loggedInUser?.memberId),
    [loggedInUser?.memberId],
  );

  useEffect(() => {
    if (!loggedInUser && !isPaymentReturn) {
      loadUser();
    }
  }, [loggedInUser, loadUser, isPaymentReturn]);

  useEffect(() => {
    if (
      loggedInUser &&
      !membershipRestricted &&
      !profile?.profile &&
      !profile?.loading &&
      !profile?.error
    ) {
      getUserProfile();
    }
  }, [
    loggedInUser,
    membershipRestricted,
    getUserProfile,
    profile?.error,
    profile?.loading,
    profile?.profile,
  ]);

  const missingFields = useMemo(() => {
    if (!profile?.profile) return [];
    return getMissingGeneralProfileFields(
      profile.profile,
      profile.profile.userDetails,
      profile.requirements,
    );
  }, [profile?.profile, profile?.requirements]);

  const quickActions = useMemo(
    () =>
      flattenPortalItems(PortalItems)
        .filter((item) => item.isAuth && item.path !== "/user/dashboard")
        .map((item) => ({
          ...item,
          ...QUICK_ACTION_META[item.path],
        })),
    [],
  );

  const firstName = loggedInUser?.name?.trim().split(/\s+/)[0] || "Member";
  const isActive = loggedInUser?.status === 1;

  if (!loggedInUser && isPaymentReturn) {
    return (
      <Container className="dashboard-page">
        <div className="dashboard-page__inner">
          <MembershipRenewalSection embedded />
        </div>
      </Container>
    );
  }

  if (!loggedInUser) {
    return <BouncingLoader minHeight="420px" />;
  }

  if (membershipRestricted || isPaymentReturn) {
    return (
      <Container className="dashboard-page">
        <div className="dashboard-page__inner">
          <MembershipRenewalSection embedded />
        </div>
      </Container>
    );
  }

  return (
    <Container className="dashboard-page">
      <div className="dashboard-page__inner">
        {!membershipRestricted && missingFields.length > 0 && (
          <ProfileIncompleteAlert
            missingFields={missingFields}
            variant="profile"
            tone="danger"
          />
        )}

        <section className="dashboard-hero">
          <div className="dashboard-hero__bar">
            <div className="dashboard-hero__greeting">
              <h1 className="dashboard-hero__title">
                Welcome back, <span>{firstName}</span>
              </h1>
              {isActive && !membershipRestricted && (
                <span
                  className="dashboard-hero__status-tick"
                  aria-label="Active account"
                  title="Active account"
                >
                  <FaCheckCircle aria-hidden />
                </span>
              )}
            </div>

            {(loggedInUser.memberId ||
              loggedInUser.referrer?.memberId ||
              (isActive && loggedInUser.renewalDate)) && (
              <div className="dashboard-hero__details">
                {loggedInUser.memberId && (
                  <span className="dashboard-hero__detail">
                    <FaIdBadge aria-hidden />
                    <span>{loggedInUser.memberId}</span>
                  </span>
                )}
                {loggedInUser.referrer?.memberId && (
                  <span className="dashboard-hero__detail dashboard-hero__detail--muted">
                    <FaUsers aria-hidden />
                    <span>
                      Referred by:{" "}
                      {loggedInUser.referrer.name
                        ? `${loggedInUser.referrer.name} (${loggedInUser.referrer.memberId})`
                        : loggedInUser.referrer.memberId}
                    </span>
                  </span>
                )}
                {isActive && loggedInUser.renewalDate && (
                  <span className="dashboard-hero__detail dashboard-hero__detail--muted">
                    <FaCalendarAlt aria-hidden />
                    <span>
                      {new Date(loggedInUser.renewalDate).toLocaleDateString(
                        "en-IN",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {referralLink && (
          <ReferralLinkBox
            referralLink={referralLink}
            subtitle="Share this link so new members join with your Member ID"
            onCopy={() =>
              setAlert("Referral link copied to clipboard", "success")
            }
          />
        )}

        <>
          <DashboardMembershipCard />

          <section className="dashboard-quick">
              <div className="dashboard-quick__header">
                <h2 className="dashboard-quick__title">Quick Actions</h2>
                <p className="dashboard-quick__subtitle">
                  Jump straight to the tools you use most
                </p>
              </div>

              <div className="dashboard-quick__grid">
                {quickActions.map((action) => {
                  const Icon = action.icon || FaArrowRight;
                  return (
                    <Link
                      key={action.path}
                      to={action.path}
                      className="dashboard-quick-card"
                    >
                      <span className="dashboard-quick-card__icon" aria-hidden>
                        <Icon />
                      </span>
                      <span className="dashboard-quick-card__content">
                        <span className="dashboard-quick-card__label">
                          {action.label}
                        </span>
                        <span className="dashboard-quick-card__desc">
                          {action.description}
                        </span>
                      </span>
                      <FaArrowRight
                        className="dashboard-quick-card__arrow"
                        aria-hidden
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
      </div>
    </Container>
  );
};

Dashboard.propTypes = {};

const mapStateToProps = (state) => ({
  loggedInUser: state.auth.user,
  profile: state.profile,
});

export default connect(mapStateToProps, {
  loadUser,
  getUserProfile,
  setAlert,
})(Dashboard);
