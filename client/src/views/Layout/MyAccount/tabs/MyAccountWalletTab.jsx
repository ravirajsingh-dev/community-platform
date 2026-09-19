import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Badge, Button, Card, Tab, Tabs } from "react-bootstrap";
import { FaSync, FaUserPlus, FaWallet } from "react-icons/fa";

import {
  fetchWallet,
  fetchDirectReferrals,
  createUserFromWallet,
} from "@src/actions/walletActions";
import { fetchMembershipPlans } from "@src/actions/membershipActions";
import { setAlert } from "@src/actions/alert";
import { DEFAULT_PAGE_SIZE } from "@src/constants";
import { format, parseISO } from "date-fns";
import { formatIndianNumber } from "@src/utils/helper";
import { buildReferralLink } from "@src/utils/referralLink";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import ReferralLinkBox from "@src/views/Common/ReferralLinkBox";
import CustomDataTable from "@src/views/commonComponents/dataTable/CustomDataTable";
import AccountTabHeader from "../components/AccountTabHeader";
import CreateUserFromWalletModal from "../components/CreateUserFromWalletModal";

const WALLET_SUBTAB = {
  transactions: "transactions",
  referrals: "referrals",
};

const SOURCE_LABELS = {
  referral_commission: "Referral commission",
  admin_adjust: "Admin adjustment",
  membership_create: "Membership create",
};

const getSourceLabel = (transaction) => {
  if (transaction.source === "membership_create") {
    return "Membership create";
  }
  if (transaction.donationRequestId) return "Donation commission";
  if (transaction.paymentHistoryId) return "Registration commission";
  return SOURCE_LABELS[transaction.source] || transaction.source || "—";
};

const getRemarks = (transaction) => {
  if (transaction.source === "membership_create") {
    return transaction.remarks || "User created from wallet.";
  }

  const donation = transaction.donationRequestId;
  if (donation && typeof donation === "object") {
    const donorName = donation.donorName || donation.userId?.name || "Donor";
    const memberId = donation.userId?.memberId;
    const identity = memberId
      ? `${donorName} (Member ID: ${memberId})`
      : `${donorName} (Guest donor)`;

    return `Donation commission credited for a donation of ₹${formatIndianNumber(
      donation.amount || 0,
    )} by ${identity}.`;
  }

  if (
    transaction.paymentHistoryId &&
    transaction.fromUserId &&
    typeof transaction.fromUserId === "object"
  ) {
    const member = transaction.fromUserId;
    return `Registration commission credited for ${
      member.name || "member"
    } (Member ID: ${member.memberId || "N/A"}).`;
  }

  return transaction.remarks || "—";
};

const STATUS_LABELS = {
  1: { label: "Active", bg: "success" },
  2: { label: "Inactive", bg: "secondary" },
  3: { label: "Blocked", bg: "danger" },
  4: { label: "New", bg: "info" },
};

const MyAccountWalletTab = ({
  memberId,
  userName,
  balance,
  transactions,
  transactionsCount,
  loadingWallet,
  walletError,
  referrals,
  referralsCount,
  loadingReferrals,
  referralsError,
  plans,
  loadingPlans,
  fetchWallet,
  fetchDirectReferrals,
  fetchMembershipPlans,
  createUserFromWallet,
  setAlert,
}) => {
  const [params, setParams] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });
  const [referralParams, setReferralParams] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState(WALLET_SUBTAB.transactions);

  useEffect(() => {
    fetchWallet(params);
  }, [fetchWallet, params]);

  useEffect(() => {
    fetchDirectReferrals(referralParams);
  }, [fetchDirectReferrals, referralParams]);

  useEffect(() => {
    fetchMembershipPlans();
  }, [fetchMembershipPlans]);

  const referralLink = useMemo(
    () => buildReferralLink(memberId),
    [memberId],
  );

  const canCreateFromWallet = useMemo(() => {
    const bal = Number(balance) || 0;
    if (bal <= 0) return false;
    return (plans || []).some(
      (plan) => Number(plan.price) > 0 && bal >= Number(plan.price),
    );
  }, [balance, plans]);

  const columns = useMemo(
    () => [
      {
        name: "Source",
        selector: (row) => row.source,
        cell: (row) => getSourceLabel(row),
        minWidth: "200px",
      },
      {
        name: "Type",
        selector: (row) => row.type,
        cell: (row) => (
          <Badge bg={row.type === "credit" ? "success" : "danger"}>
            {row.type}
          </Badge>
        ),
        width: "100px",
      },
      {
        name: "Amount",
        selector: (row) => row.amount,
        cell: (row) => (
          <span className="fw-semibold">
            {row.type === "debit" ? "−" : "+"}₹
            {formatIndianNumber(row.amount)}
          </span>
        ),
        width: "120px",
      },
      {
        name: "Remarks",
        selector: (row) => row.remarks,
        cell: (row) => getRemarks(row),
        wrap: true,
        minWidth: "360px",
      },
      {
        name: "Date",
        selector: (row) => row.createdAt,
        cell: (row) =>
          row.createdAt
            ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
            : "—",
        minWidth: "180px",
      },
    ],
    [],
  );

  const referralColumns = useMemo(
    () => [
      {
        name: "Member ID",
        selector: (row) => row.memberId,
        minWidth: "150px",
      },
      {
        name: "Name",
        selector: (row) => row.name,
        cell: (row) => row.name || "—",
        minWidth: "180px",
      },
      {
        name: "Status",
        selector: (row) => row.status,
        cell: (row) => {
          const status = STATUS_LABELS[row.status] || {
            label: "Unknown",
            bg: "secondary",
          };
          return <Badge bg={status.bg}>{status.label}</Badge>;
        },
        width: "110px",
      },
      {
        name: "Membership",
        selector: (row) => row.isPaid,
        cell: (row) => (
          <Badge bg={row.isPaid ? "success" : "secondary"}>
            {row.isPaid ? "Paid" : "Unpaid"}
          </Badge>
        ),
        width: "120px",
      },
      {
        name: "Referred on",
        selector: (row) => row.createdAt,
        cell: (row) =>
          row.createdAt
            ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
            : "—",
        minWidth: "180px",
      },
    ],
    [],
  );

  const handleCreateSubmit = async (payload) => {
    setCreatingUser(true);
    try {
      const result = await createUserFromWallet(payload);
      if (result?.status) {
        setAlert(
          result.message ||
            "User created and membership activated from wallet.",
          "success",
        );
        return result;
      }
      return result;
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCreateModalClose = (wasSuccessful) => {
    setShowCreateModal(false);
    if (wasSuccessful) {
      fetchWallet(params);
      fetchDirectReferrals(referralParams);
    }
  };

  if (loadingWallet && !memberId && transactions.length === 0) {
    return <BouncingLoader minHeight="120px" />;
  }

  return (
    <div className="my-account-wallet-tab">
      <AccountTabHeader
        title="Wallet"
        description="Your referral wallet balance and transaction history. Share your Member ID so others can use it as a referral."
      />

      {walletError ? (
        <div className="alert alert-danger" role="alert">
          {walletError}
        </div>
      ) : null}
      {referralsError ? (
        <div className="alert alert-danger" role="alert">
          {referralsError}
        </div>
      ) : null}

      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h3 className="h5 mb-1 d-flex align-items-center gap-2">
                <FaWallet aria-hidden /> Balance
              </h3>
              <p className="text-muted small mb-0">
                Credits from referral commissions and admin adjustments
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {canCreateFromWallet ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <FaUserPlus className="me-1" /> Create user
                </Button>
              ) : null}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => fetchWallet(params)}
                disabled={loadingWallet}
              >
                <FaSync className="me-1" /> Refresh
              </Button>
            </div>
          </div>

          <div className="wallet-balance-row">
            <div className="wallet-balance-row__balance">
              <div className="text-muted small">Available balance</div>
              <div className="fs-4 fw-semibold">
                ₹{formatIndianNumber(balance || 0)}
              </div>
              {canCreateFromWallet ? (
                <p className="text-muted small mb-0 mt-1">
                  You can create a new member using your wallet balance.
                </p>
              ) : null}
            </div>
            <div className="wallet-balance-row__referral">
              {referralLink ? (
                <ReferralLinkBox
                  referralLink={referralLink}
                  title="Referral Link"
                  showIcon={false}
                  compact
                  onCopy={() =>
                    setAlert("Referral link copied to clipboard", "success")
                  }
                />
              ) : (
                <>
                  <div className="text-muted small">Referral Link</div>
                  <div className="fw-semibold">—</div>
                </>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="wallet-history-card">
        <Card.Body>
          <Tabs
            activeKey={walletSubTab}
            onSelect={(key) => key && setWalletSubTab(key)}
            className="wallet-sub-tabs mb-3"
            id="wallet-history-tabs"
          >
            <Tab
              eventKey={WALLET_SUBTAB.transactions}
              title="Transaction history"
            >
              <CustomDataTable
                columns={columns}
                data={transactions}
                count={transactionsCount}
                params={{ page: params.page, limit: params.limit }}
                setParams={(next) =>
                  setParams((prev) => ({
                    ...prev,
                    page: next.page,
                    limit: next.limit,
                  }))
                }
                paginationServer
                responsive
                striped
                progressPending={loadingWallet}
                highlightOnHover
                persistTableHead
                noDataComponent={
                  <div className="text-muted py-4">
                    No wallet transactions yet.
                  </div>
                }
              />
            </Tab>
            <Tab eventKey={WALLET_SUBTAB.referrals} title="Your referrals">
              <CustomDataTable
                columns={referralColumns}
                data={referrals}
                count={referralsCount}
                params={{
                  page: referralParams.page,
                  limit: referralParams.limit,
                }}
                setParams={(next) =>
                  setReferralParams((prev) => ({
                    ...prev,
                    page: next.page,
                    limit: next.limit,
                  }))
                }
                paginationServer
                responsive
                striped
                progressPending={loadingReferrals}
                highlightOnHover
                persistTableHead
                noDataComponent={
                  <div className="text-muted py-4">
                    No one has used your Member ID yet.
                  </div>
                }
              />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <CreateUserFromWalletModal
        show={showCreateModal}
        onHide={handleCreateModalClose}
        balance={balance || 0}
        plans={plans}
        loadingPlans={loadingPlans}
        creating={creatingUser}
        onSubmit={handleCreateSubmit}
        onCopy={(message) => setAlert(message, "success")}
        referralMemberId={memberId}
        referralName={userName}
      />
    </div>
  );
};

MyAccountWalletTab.propTypes = {
  memberId: PropTypes.string,
  userName: PropTypes.string,
  balance: PropTypes.number,
  transactions: PropTypes.array,
  transactionsCount: PropTypes.number,
  loadingWallet: PropTypes.bool,
  walletError: PropTypes.string,
  referrals: PropTypes.array,
  referralsCount: PropTypes.number,
  loadingReferrals: PropTypes.bool,
  referralsError: PropTypes.string,
  plans: PropTypes.array,
  loadingPlans: PropTypes.bool,
  fetchWallet: PropTypes.func.isRequired,
  fetchDirectReferrals: PropTypes.func.isRequired,
  fetchMembershipPlans: PropTypes.func.isRequired,
  createUserFromWallet: PropTypes.func.isRequired,
  setAlert: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  memberId: state.wallet.memberId || state.auth.user?.memberId || "",
  userName: state.auth.user?.name || "",
  balance: state.wallet.balance,
  transactions: state.wallet.transactions,
  transactionsCount: state.wallet.transactionsCount,
  loadingWallet: state.wallet.loadingWallet,
  walletError: state.wallet.walletError,
  referrals: state.wallet.referrals,
  referralsCount: state.wallet.referralsCount,
  loadingReferrals: state.wallet.loadingReferrals,
  referralsError: state.wallet.referralsError,
  plans: state.membership?.plans || [],
  loadingPlans: state.membership?.loadingPlans || false,
});

export default connect(mapStateToProps, {
  fetchWallet,
  fetchDirectReferrals,
  fetchMembershipPlans,
  createUserFromWallet,
  setAlert,
})(MyAccountWalletTab);
