import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Badge, Button, Card } from "react-bootstrap";
import {
  FaCalendarAlt,
  FaCrown,
  FaIdCard,
  FaSync,
} from "react-icons/fa";

import { fetchCurrentMembership } from "@src/actions/membershipActions";
import { formatPlanDuration } from "@src/utils/membershipPlanUtils";
import {
  getDaysUntilExpiry,
  getMembershipStatusLabel,
  hasNoMembershipPlan,
  isExpiringSoon,
  isMembershipActive,
  needsPayment,
  needsRenewal,
} from "@src/utils/membershipUtils";

const DashboardMembershipCard = ({
  user,
  currentMembership,
  loadingCurrentMembership,
  fetchCurrentMembership,
}) => {
  useEffect(() => {
    fetchCurrentMembership();
  }, [fetchCurrentMembership]);

  if (!user) {
    return null;
  }

  const plan = currentMembership?.plan;
  const statusLabel = getMembershipStatusLabel(user, currentMembership);
  const daysLeft =
    currentMembership?.daysUntilExpiry ?? getDaysUntilExpiry(user.renewalDate);
  const showRenewCta =
    needsPayment(user) ||
    needsRenewal(user) ||
    isExpiringSoon(user) ||
    hasNoMembershipPlan(user);
  const isActive = isMembershipActive(user);
  const noMembership = hasNoMembershipPlan(user);

  return (
    <section className="dashboard-membership" aria-label="Membership status">
      <Card className="dashboard-membership__card">
        <Card.Body>
          <div className="dashboard-membership__header">
            <div>
              <h2 className="dashboard-membership__title">Membership</h2>
              <p className="dashboard-membership__subtitle">
                {plan?.name || "No active plan"}
                {plan ? ` · ${formatPlanDuration(plan)}` : ""}
              </p>
            </div>
            <Badge
              bg={
                isActive
                  ? isExpiringSoon(user)
                    ? "warning"
                    : "success"
                  : noMembership
                    ? "warning"
                    : "danger"
              }
            >
              {statusLabel}
            </Badge>
          </div>

          <div className="dashboard-membership__details">
            <div className="dashboard-membership__detail">
              <FaIdCard aria-hidden />
              <span>{user.memberId}</span>
            </div>

            {user.isLifetimePaid ? (
              <div className="dashboard-membership__detail">
                <FaCrown className="text-warning" aria-hidden />
                <span>Lifetime access</span>
              </div>
            ) : user.renewalDate ? (
              <div className="dashboard-membership__detail">
                <FaCalendarAlt aria-hidden />
                <span>
                  {isActive ? "Renews" : "Expired"}{" "}
                  {new Date(user.renewalDate).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ) : null}

            {!user.isLifetimePaid && isActive && daysLeft !== null && (
              <div className="dashboard-membership__detail dashboard-membership__detail--muted">
                {daysLeft} day{daysLeft === 1 ? "" : "s"} remaining
              </div>
            )}
          </div>

          <div className="dashboard-membership__actions">
            {showRenewCta ? (
              <Button
                as={Link}
                to="/user/renew-membership"
                variant={needsRenewal(user) || needsPayment(user) ? "primary" : "outline-primary"}
                size="sm"
              >
                <FaSync className="me-2" aria-hidden />
                {needsPayment(user)
                  ? "Complete payment"
                  : noMembership
                    ? "Choose a plan"
                    : "Renew membership"}
              </Button>
            ) : null}
            <Button
              as={Link}
              to="/user/my-account?tab=membership"
              variant="link"
              size="sm"
              className="dashboard-membership__link"
            >
              View details
            </Button>
          </div>

          {loadingCurrentMembership && !currentMembership && (
            <div className="dashboard-membership__loading text-muted small mt-2">
              Loading membership details...
            </div>
          )}
        </Card.Body>
      </Card>
    </section>
  );
};

DashboardMembershipCard.propTypes = {
  user: PropTypes.object,
  currentMembership: PropTypes.object,
  loadingCurrentMembership: PropTypes.bool,
  fetchCurrentMembership: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
  currentMembership: state.membership.currentMembership,
  loadingCurrentMembership: state.membership.loadingCurrentMembership,
});

export default connect(mapStateToProps, { fetchCurrentMembership })(
  DashboardMembershipCard,
);
