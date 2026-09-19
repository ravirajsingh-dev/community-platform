import React from "react";
import { Button, Card, Collapse, Container, Badge, Dropdown } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";

import { RiDeleteBin5Line } from "react-icons/ri";
import { FiPlus } from "react-icons/fi";
import { MdEdit } from "react-icons/md";
import { BsThreeDotsVertical } from "react-icons/bs";

import UserFilters from "./UserFilters";
import UserMembershipActionModal from "./UserMembershipActionModal";
import UserReferralsModal from "./UserReferralsModal";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";

import {
  getUsersList,
  getUserReferrals,
  deleteUser,
  resetComponentStore,
  activateUserMembership,
  renewUserMembership,
  blockUserMembership,
  unblockUserMembership,
  expireUserMembership,
} from "@actions/adminUserActions";

import { UserStatuses } from "@src/constants/CustomSelectValues";
import { hasPermission } from "@src/utils/permissions";
import { formatIndianNumber } from "@src/utils/helper";

const EMPTY_FILTERS = {
  memberId: "",
  name: "",
  fatherName: "",
  motherName: "",
  phone: "",
  email: "",
  status: "",
  fromDate: "",
  toDate: "",
  stateCode: null,
  cityId: null,
  villageId: null,
  community: null,
  vansh: null,
  kul: null,
  khamp: null,
  subKhamp: null,
  gotra: null,
  maritalStatus: null,
  education: null,
  bloodGroup: null,
  membershipPlanId: null,
  isPaid: "",
  isLifetimePaid: "",
};

const selectValue = (option) => {
  if (!option) return null;
  if (typeof option === "object") return option.value ?? null;
  return option;
};

const pushTextFilter = (nextFilters, nextQuery, key, value, type = "String") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return;
  nextFilters.push(key);
  nextQuery[key] = { value: trimmed, type };
};

const pushSelectFilter = (
  nextFilters,
  nextQuery,
  key,
  option,
  type = "String",
) => {
  const value = selectValue(option);
  if (value == null || value === "") return;
  nextFilters.push(key);
  nextQuery[key] = { value, type };
};

const UsersList = ({
  loggedInAdmin,
  usersList: { data, count },
  getUsersList,
  getUserReferrals,
  deleteUser,
  activateUserMembership,
  renewUserMembership,
  blockUserMembership,
  unblockUserMembership,
  expireUserMembership,
  loadingUsersList,
  resetComponentStore,
}) => {
  const [onlyOnce, setOnce] = React.useState(true);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [userParams, setUserParams] = React.useState({
    limit: 20,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: {},
    filters: [],
  });
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [selectedReferralUser, setSelectedReferralUser] =
    React.useState(null);
  const [membershipAction, setMembershipAction] = React.useState(null);
  const [membershipLoading, setMembershipLoading] = React.useState(false);
  const navigate = useNavigate();

  const canEditUsers = hasPermission(loggedInAdmin, "users", "edit");
  const canViewWallets = hasPermission(loggedInAdmin, "wallets", "view");

  const getPaymentSourceBadge = (row) => {
    const source = row.paymentSource;
    if (!source) {
      return <span className="text-muted">—</span>;
    }
    if (source === "Wallet") {
      return <Badge bg="info">Wallet</Badge>;
    }
    return <Badge bg="primary">Online</Badge>;
  };

  const openWalletForUser = (row) => {
    if (!row?.memberId || !canViewWallets) return;
    if (!(Number(row.walletBalance) > 0)) return;
    navigate(
      `/admin/wallets?memberId=${encodeURIComponent(row.memberId)}`,
    );
  };

  const getStatusBadge = (status) => {
    const statusOption = UserStatuses.find((s) => s.value === status);
    const statusLabel = statusOption ? statusOption.label : "Unknown";
    let bgColor = "secondary";
    if (status === 1) bgColor = "success";
    else if (status === 2) bgColor = "secondary";
    else if (status === 3) bgColor = "info";
    else if (status === 4) bgColor = "danger";
    return <Badge bg={bgColor}>{statusLabel}</Badge>;
  };

  const isActiveMembership = (row) => {
    if (!row || row.status !== 1) return false;
    if (row.isLifetimePaid) return true;
    return Boolean(row.isPaid);
  };

  const getMembershipCell = (row) => {
    if (row.status === 3) {
      return <span className="fw-semibold">Blocked</span>;
    }
    if (row.isLifetimePaid && row.status === 1) {
      return (
        <div className="fw-semibold">{row.membershipPlanName || "Lifetime"}</div>
      );
    }
    if (row.isPaid && row.status === 1) {
      return (
        <div>
          <div className="fw-semibold">{row.membershipPlanName || "Paid"}</div>
          <small className="text-muted">
            {row.renewalDate
              ? `Until ${format(parseISO(row.renewalDate), "dd/MM/yyyy")}`
              : "Active"}
          </small>
        </div>
      );
    }
    if (row.status === 2 || (row.isPaid === false && row.status !== 4)) {
      return (
        <div>
          <div className="fw-semibold">{row.membershipPlanName || "—"}</div>
          <small className="text-muted">Expired</small>
        </div>
      );
    }
    return <span className="text-muted">No plan</span>;
  };

  const openMembershipAction = (user, action) => {
    setSelectedUser(user);
    setMembershipAction(action);
  };

  const columns = [
    {
      name: "Member ID",
      selector: (row) => (row.memberId ? row.memberId : "-"),
      sortable: true,
      sortField: "memberId",
      width: "130px",
      wrap: true,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      sortField: "name",
      width: "160px",
      wrap: true,
    },
    {
      name: "Community",
      selector: (row) => row.communityName || "—",
      minWidth: "140px",
      wrap: true,
      cell: (row) => row.communityName || <span className="text-muted">—</span>,
    },
    {
      name: "Referrals",
      selector: (row) => row.referralCount || 0,
      width: "110px",
      cell: (row) => (
        <Button
          type="button"
          variant="link"
          className="p-0 fw-semibold text-decoration-none"
          onClick={() => setSelectedReferralUser(row)}
          title="View all referred users"
        >
          {row.referralCount || 0}
        </Button>
      ),
    },
    {
      name: "Status",
      selector: (row) => getStatusBadge(row.status),
      sortable: true,
      sortField: "status",
      width: "160px",
      wrap: true,
    },
    {
      name: "Membership",
      selector: (row) => getMembershipCell(row),
      width: "220px",
      wrap: true,
    },
    {
      name: "Payment",
      selector: (row) => row.paymentSource || "—",
      width: "110px",
      cell: (row) => getPaymentSourceBadge(row),
    },
    {
      name: "Wallet",
      selector: (row) => row.walletBalance || 0,
      width: "120px",
      cell: (row) => {
        const balance = Number(row.walletBalance) || 0;
        const amount = `₹${formatIndianNumber(balance)}`;
        if (!canViewWallets || !row.memberId || balance <= 0) {
          return <span className={balance <= 0 ? "text-muted" : undefined}>{amount}</span>;
        }
        return (
          <Button
            type="button"
            variant="link"
            className="p-0 fw-semibold text-decoration-none"
            onClick={() => openWalletForUser(row)}
            title="Open wallet"
          >
            {amount}
          </Button>
        );
      },
    },
    {
      name: "Created At",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: true,
      sortField: "createdAt",
      width: "200px",
      wrap: true,
    },
    {
      name: "Actions",
      width: "170px",
      cell: (row) => (
        <div className="d-flex gap-2 align-items-center justify-content-center">
          {hasPermission(loggedInAdmin, "users", "list") && (
            <Link
              to={`/admin/users/edit/${row._id}`}
              title="View/Edit User"
              className="text-primary"
            >
              <MdEdit size={20} />
            </Link>
          )}
          {canEditUsers && (
            <Dropdown align="end">
              <Dropdown.Toggle
                as={Button}
                variant="link"
                className="text-success p-0 border-0 shadow-none no-caret"
                id={`membership-actions-${row._id}`}
                title="Membership actions"
              >
                <BsThreeDotsVertical size={20} />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {row.status !== 3 && (
                  <Dropdown.Item onClick={() => openMembershipAction(row, "activate")}>
                    Activate Plan
                  </Dropdown.Item>
                )}
                {row.status !== 3 && !isActiveMembership(row) && (
                  <Dropdown.Item onClick={() => openMembershipAction(row, "renew")}>
                    Renew
                  </Dropdown.Item>
                )}
                {row.status !== 3 && (row.isPaid || row.isLifetimePaid || row.status === 1) && (
                  <Dropdown.Item onClick={() => openMembershipAction(row, "expire")}>
                    Expire Membership
                  </Dropdown.Item>
                )}
                {row.status !== 3 ? (
                  <Dropdown.Item onClick={() => openMembershipAction(row, "block")}>
                    Block User
                  </Dropdown.Item>
                ) : (
                  <Dropdown.Item onClick={() => openMembershipAction(row, "unblock")}>
                    Unblock User
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}
          {hasPermission(loggedInAdmin, "users", "delete") && (
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={() => {
                setSelectedUser(row);
                setShowDeleteModal(true);
              }}
              title="Delete User"
            >
              <RiDeleteBin5Line size={20} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInAdmin) return;

    getUsersList(userParams);
  }, [getUsersList, userParams, resetComponentStore, loggedInAdmin, onlyOnce]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const memberId = String(nextFiltersData.memberId || "").trim();
    const name = String(nextFiltersData.name || "").trim();
    const fatherName = String(nextFiltersData.fatherName || "").trim();
    const motherName = String(nextFiltersData.motherName || "").trim();
    const phone = String(nextFiltersData.phone || "").trim();
    const email = String(nextFiltersData.email || "").trim();
    const fromDate = String(nextFiltersData.fromDate || "").trim();
    const toDate = String(nextFiltersData.toDate || "").trim();
    const statusValue =
      nextFiltersData.status !== "" && nextFiltersData.status !== null
        ? Number(nextFiltersData.status)
        : null;

    pushTextFilter(nextFilters, nextQuery, "memberId", memberId);
    pushTextFilter(nextFilters, nextQuery, "name", name);
    pushTextFilter(nextFilters, nextQuery, "phone", phone);
    pushTextFilter(nextFilters, nextQuery, "email", email);

    if (statusValue !== null && !Number.isNaN(statusValue)) {
      nextFilters.push("status");
      nextQuery.status = { value: statusValue, type: "Number" };
    }
    if (fromDate && toDate) {
      nextFilters.push("createdAt");
      nextQuery.createdAt = { value: `${fromDate}|${toDate}`, type: "Date" };
    }

    if (nextFiltersData.isPaid === "1" || nextFiltersData.isPaid === "0") {
      nextFilters.push("isPaid");
      nextQuery.isPaid = { value: nextFiltersData.isPaid, type: "Boolean" };
    }
    if (
      nextFiltersData.isLifetimePaid === "1" ||
      nextFiltersData.isLifetimePaid === "0"
    ) {
      nextFilters.push("isLifetimePaid");
      nextQuery.isLifetimePaid = {
        value: nextFiltersData.isLifetimePaid,
        type: "Boolean",
      };
    }
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "membershipPlanId",
      nextFiltersData.membershipPlanId,
      "id",
    );

    pushTextFilter(
      nextFilters,
      nextQuery,
      "userDetails.fatherName",
      fatherName,
    );
    pushTextFilter(
      nextFilters,
      nextQuery,
      "userDetails.motherName",
      motherName,
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.stateCode",
      nextFiltersData.stateCode,
      "string",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.cityId",
      nextFiltersData.cityId,
      "string",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.villageId",
      nextFiltersData.villageId,
      "id",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.community",
      nextFiltersData.community,
      "id",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.vansh",
      nextFiltersData.vansh,
      "id",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.kul",
      nextFiltersData.kul,
      "id",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.khamp",
      nextFiltersData.khamp,
      "id",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.subKhamp",
      nextFiltersData.subKhamp,
      "id",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.gotra",
      nextFiltersData.gotra,
      "id",
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.maritalStatus",
      nextFiltersData.maritalStatus,
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.education",
      nextFiltersData.education,
    );
    pushSelectFilter(
      nextFilters,
      nextQuery,
      "userDetails.bloodGroup",
      nextFiltersData.bloodGroup,
    );

    setUserParams((prev) => ({
      ...prev,
      page: 1,
      filters: nextFilters,
      query: nextQuery,
    }));
  };

  const onFilterChange = (eOrPatch) => {
    if (eOrPatch?.target) {
      const { name, value } = eOrPatch.target;
      setFilters((prev) => ({ ...prev, [name]: value }));
      return;
    }
    setFilters((prev) => ({ ...prev, ...eOrPatch }));
  };

  const onSearch = () => {
    applyFilters(filters);
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    applyFilters(EMPTY_FILTERS);
  };

  const handleConfirmDelete = (txnPassword) => {
    if (selectedUser && txnPassword) {
      deleteUser(selectedUser._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const handleCloseMembershipModal = () => {
    if (membershipLoading) return;
    setMembershipAction(null);
    setSelectedUser(null);
  };

  const handleMembershipConfirm = async ({ planId, remarks, txn_password }) => {
    if (!selectedUser || !membershipAction) return;

    const actionMap = {
      activate: activateUserMembership,
      renew: renewUserMembership,
      block: blockUserMembership,
      unblock: unblockUserMembership,
      expire: expireUserMembership,
    };

    const actionFn = actionMap[membershipAction];
    if (!actionFn) return;

    setMembershipLoading(true);
    try {
      const payload = { txn_password, remarks };
      if (planId) payload.planId = planId;

      const result = await actionFn(selectedUser._id, payload);
      if (result?.status) {
        setMembershipAction(null);
        setSelectedUser(null);
        getUsersList(userParams);
      }
    } finally {
      setMembershipLoading(false);
    }
  };

  return (
    <Container>
      <AppBreadCrumb pageTitle="Users" crumbs={[{ name: "Users" }]} />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        {hasPermission(loggedInAdmin, "users", "create") && (
          <Button
            type="button"
            className="btn btn--theme"
            onClick={() => navigate("/admin/users/add")}
          >
            <FiPlus className="me-2" />
            Add User
          </Button>
        )}
      </div>

      <Collapse in={showFilters}>
        <div>
          <UserFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <Card className="common-panel-card">
        <Card.Body>
          {count > 0 && (
            <p className="text-muted mb-3">Total Users: {count}</p>
          )}
          <CustomDataTable
            columns={columns}
            data={data}
            count={count}
            params={userParams}
            setParams={setUserParams}
            pagination
            responsive
            striped
            progressPending={loadingUsersList}
            highlightOnHover
            persistTableHead
            paginationServer
          />
        </Card.Body>
      </Card>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={handleCloseDeleteModal}
        handleConfirm={handleConfirmDelete}
        title="Delete User"
        body={`Are you sure you want to delete user "${selectedUser?.name || ""}" (${selectedUser?.memberId || ""})? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <UserMembershipActionModal
        show={Boolean(membershipAction && selectedUser)}
        onHide={handleCloseMembershipModal}
        onConfirm={handleMembershipConfirm}
        action={membershipAction}
        user={selectedUser}
        loading={membershipLoading}
      />

      <UserReferralsModal
        show={Boolean(selectedReferralUser)}
        onHide={() => setSelectedReferralUser(null)}
        user={selectedReferralUser}
        getUserReferrals={getUserReferrals}
      />
    </Container>
  );
};

UsersList.propTypes = {
  getUsersList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  usersList: state.adminUsers.usersList,
  loadingUsersList: state.adminUsers.loadingUsersList,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getUsersList,
  getUserReferrals,
  deleteUser,
  resetComponentStore,
  activateUserMembership,
  renewUserMembership,
  blockUserMembership,
  unblockUserMembership,
  expireUserMembership,
})(UsersList);
