import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Badge, Button, Card } from "react-bootstrap";
import { FaCalendarAlt, FaCrown, FaSync } from "react-icons/fa";

import {
  fetchCurrentMembership,
  fetchMembershipPayments,
} from "@src/actions/membershipActions";
import { DEFAULT_PAGE_SIZE } from "@src/constants";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import CustomDataTable from "@src/views/commonComponents/dataTable/CustomDataTable";
import AccountTabHeader from "../components/AccountTabHeader";
import {
  getDaysUntilExpiry,
  getMembershipStatusLabel,
  hasNoMembershipPlan,
  isExpiringSoon,
  isMembershipActive,
  needsPayment,
  needsRenewal,
} from "@src/utils/membershipUtils";
import { formatPlanDuration, formatPlanPrice } from "@src/utils/membershipPlanUtils";

const MyAccountMembershipTab = ({
  user,
  currentMembership,
  loadingCurrentMembership,
  membershipPayments,
  membershipPaymentsCount,
  loadingMembershipPayments,
  fetchCurrentMembership,
  fetchMembershipPayments,
  isDisabled,
}) => {
  const [paymentParams, setPaymentParams] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    orderBy: "createdAt",
    ascending: "desc",
  });

  useEffect(() => {
    fetchCurrentMembership();
  }, [fetchCurrentMembership]);

  useEffect(() => {
    fetchMembershipPayments(paymentParams);
  }, [fetchMembershipPayments, paymentParams]);

  const membership = currentMembership;
  const plan = membership?.plan;
  const showRenewCta =
    needsPayment(user) ||
    needsRenewal(user) ||
    isExpiringSoon(user) ||
    hasNoMembershipPlan(user);
  const noMembership = hasNoMembershipPlan(user);

  const paymentColumns = useMemo(
    () => [
      {
        name: "Amount",
        selector: (row) => row.amount,
        cell: (row) => <span className="fw-semibold">₹{row.amount}</span>,
        sortable: true,
        sortField: "amount",
        width: "140px",
      },
      {
        name: "Date",
        selector: (row) => row.createdAt,
        cell: (row) =>
          row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-IN")
            : "—",
        sortable: true,
        sortField: "createdAt",
        width: "160px",
      },
      {
        name: "Status",
        selector: (row) => row.status,
        cell: (row) => (
          <Badge
            bg={
              row.status === "success"
                ? "success"
                : row.status === "pending"
                  ? "warning"
                  : "danger"
            }
          >
            {row.status}
          </Badge>
        ),
        sortable: true,
        sortField: "status",
        width: "120px",
      },
    ],
    [],
  );

  if (loadingCurrentMembership && !membership) {
    return <BouncingLoader minHeight="120px" />;
  }

  const statusLabel = getMembershipStatusLabel(user, membership);
  const daysLeft = membership?.daysUntilExpiry ?? getDaysUntilExpiry(user?.renewalDate);

  return (
    <div className="my-account-membership-tab">
      <AccountTabHeader
        title="Membership"
        description="View your current plan, renewal details, and payment history."
      />

      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h3 className="h5 mb-1">Current membership</h3>
              <p className="text-muted small mb-0">
                Plan status and renewal information
              </p>
            </div>
            <Badge
              bg={
                isMembershipActive(user)
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

          <div className="row g-3">
            <div className="col-md-6">
              <div className="text-muted small">Plan</div>
              <div className="fw-semibold d-flex align-items-center gap-2">
                {user?.isLifetimePaid ? <FaCrown className="text-warning" /> : null}
                {plan?.name || "—"}
              </div>
              {plan && (
                <div className="text-muted small">
                  {formatPlanPrice(plan)} · {formatPlanDuration(plan)}
                </div>
              )}
            </div>

            <div className="col-md-6">
              <div className="text-muted small">
                {user?.isLifetimePaid ? "Validity" : "Renewal date"}
              </div>
              <div className="fw-semibold d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-muted" aria-hidden />
                {user?.isLifetimePaid
                  ? "Lifetime access"
                  : user?.renewalDate
                    ? new Date(user.renewalDate).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
              </div>
              {!user?.isLifetimePaid && daysLeft !== null && isMembershipActive(user) && (
                <div className="text-muted small">{daysLeft} day(s) remaining</div>
              )}
            </div>
          </div>

          {showRenewCta && (
            <div className="mt-4">
              <Button as={Link} to="/user/renew-membership" className="btn-common">
                <FaSync className="me-2" aria-hidden />
                {needsPayment(user)
                  ? "Complete payment"
                  : noMembership
                    ? "Choose a plan"
                    : "Renew membership"}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="mt-4">
        <h3 className="h5 mb-3">Recent payments</h3>
        <CustomDataTable
          columns={paymentColumns}
          data={membershipPayments}
          count={membershipPaymentsCount}
          params={paymentParams}
          setParams={setPaymentParams}
          pagination
          paginationServer
          responsive
          striped
          highlightOnHover
          persistTableHead
          progressPending={loadingMembershipPayments}
        />
      </div>
    </div>
  );
};

MyAccountMembershipTab.propTypes = {
  user: PropTypes.object,
  currentMembership: PropTypes.object,
  loadingCurrentMembership: PropTypes.bool,
  membershipPayments: PropTypes.array,
  membershipPaymentsCount: PropTypes.number,
  loadingMembershipPayments: PropTypes.bool,
  fetchCurrentMembership: PropTypes.func.isRequired,
  fetchMembershipPayments: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
  currentMembership: state.membership.currentMembership,
  loadingCurrentMembership: state.membership.loadingCurrentMembership,
  membershipPayments: state.membership.membershipPayments,
  membershipPaymentsCount: state.membership.membershipPaymentsCount,
  loadingMembershipPayments: state.membership.loadingMembershipPayments,
});

export default connect(mapStateToProps, {
  fetchCurrentMembership,
  fetchMembershipPayments,
})(MyAccountMembershipTab);
