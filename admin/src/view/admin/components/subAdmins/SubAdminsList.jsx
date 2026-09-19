import React from "react";
import { Button, Card, Collapse, Container, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";

// icons
import { RiDeleteBin5Line } from "react-icons/ri";
import { FiPlus } from "react-icons/fi";
import { MdEdit, MdToggleOn, MdToggleOff } from "react-icons/md";

// custom imports
import SubAdminFilters from "./SubAdminFilters";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";

import {
  getSubAdminsList,
  deleteSubAdmin,
  toggleSubAdminStatus,
  resetComponentStore,
} from "@actions/adminSubAdminActions";

import { isAdmin } from "@src/utils/helper";

const EMPTY_FILTERS = {
  name: "",
  adminId: "",
  email: "",
  role: "",
  status: "",
  isActive: "",
  fromDate: "",
  toDate: "",
};

const SubAdminsList = ({
  loggedInAdmin,
  subAdminsList: { data, count },
  getSubAdminsList,
  deleteSubAdmin,
  toggleSubAdminStatus,
  loadingSubAdminsList,
  resetComponentStore,
}) => {
  const [onlyOnce, setOnce] = React.useState(true);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [subAdminParams, setSubAdminParams] = React.useState({
    limit: 20,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: {},
    filters: [],
  });
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showStatusModal, setShowStatusModal] = React.useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = React.useState(null);
  const navigate = useNavigate();

  const getStatusBadge = (status, isActive) => {
    if (!isActive || status === 2) {
      return <Badge bg="secondary">Inactive</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      sub_admin: "primary",
      staff: "info",
      manager: "warning",
    };
    const roleLabels = {
      sub_admin: "Sub Admin",
      staff: "Staff",
      manager: "Manager",
    };
    return (
      <Badge bg={roleColors[role] || "secondary"}>
        {roleLabels[role] || role}
      </Badge>
    );
  };

  const columns = [
    {
      name: "Admin ID",
      selector: (row) => row.admin_id || "-",
      sortable: true,
      sortField: "admin_id",
      width: "130px",
      wrap: true,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      sortField: "name",
      width: "180px",
      wrap: true,
    },
    {
      name: "Email",
      selector: (row) => row.email || "-",
      sortable: true,
      sortField: "email",
      width: "200px",
      wrap: true,
    },
    {
      name: "Plain Password (Admin Only)",
      selector: (row) => (
        <div className="d-flex align-items-center gap-2">
          <span className="font-monospace small">{row.passCopy || "-"}</span>
          {row.passCopy && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-primary"
              onClick={() => {
                navigator.clipboard.writeText(row.passCopy);
              }}
              title="Copy password"
            >
              📋
            </Button>
          )}
        </div>
      ),
      width: "200px",
      wrap: true,
    },
    {
      name: "Plain Txn Password (Admin Only)",
      selector: (row) => (
        <div className="d-flex align-items-center gap-2">
          <span className="font-monospace small">{row.txnPassCopy || "-"}</span>
          {row.txnPassCopy && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-primary"
              onClick={() => {
                navigator.clipboard.writeText(row.txnPassCopy);
              }}
              title="Copy transaction password"
            >
              📋
            </Button>
          )}
        </div>
      ),
      width: "200px",
      wrap: true,
    },
    {
      name: "Role",
      selector: (row) => getRoleBadge(row.role),
      sortable: true,
      sortField: "role",
      width: "120px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => getStatusBadge(row.status, row.isActive),
      sortable: true,
      sortField: "status",
      width: "120px",
      wrap: true,
    },
    {
      name: "Created By",
      selector: (row) =>
        row.createdBy?.name
          ? `${row.createdBy.name} (${row.createdBy.admin_id})`
          : "-",
      width: "200px",
      wrap: true,
    },
    {
      name: "Last Login",
      selector: (row) =>
        row.last_login
          ? format(parseISO(row.last_login), "dd/MM/yyyy, hh:mm a")
          : "Never",
      sortable: true,
      sortField: "last_login",
      width: "170px",
      wrap: true,
    },
    {
      name: "Created At",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: true,
      sortField: "createdAt",
      width: "170px",
      wrap: true,
    },
    {
      name: "Actions",
      width: "200px",
      cell: (row) => (
        <div className="d-flex gap-2 align-items-center justify-content-center">
          <Link
            to={`/admin/sub-admins/edit/${row._id}`}
            title="View/Edit Sub-Admin"
            className="text-primary"
          >
            <MdEdit size={20} />
          </Link>
          <Button
            variant="link"
            className="text-primary p-0"
            onClick={() => {
              setSelectedSubAdmin(row);
              setShowStatusModal(true);
            }}
            title={row.isActive ? "Deactivate" : "Activate"}
          >
            {row.isActive ? (
              <MdToggleOn size={24} />
            ) : (
              <MdToggleOff size={24} />
            )}
          </Button>
          <Button
            variant="link"
            className="text-danger p-0"
            onClick={() => {
              setSelectedSubAdmin(row);
              setShowDeleteModal(true);
            }}
            title="Delete Sub-Admin"
          >
            <RiDeleteBin5Line size={20} />
          </Button>
        </div>
      ),
    },
  ];

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInAdmin || !isAdmin(loggedInAdmin)) return;

    getSubAdminsList(subAdminParams);
  }, [getSubAdminsList, subAdminParams, resetComponentStore, loggedInAdmin, onlyOnce]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const adminId = String(nextFiltersData.adminId || "").trim();
    const email = String(nextFiltersData.email || "").trim();
    const role = String(nextFiltersData.role || "").trim();
    const fromDate = String(nextFiltersData.fromDate || "").trim();
    const toDate = String(nextFiltersData.toDate || "").trim();
    const statusValue =
      nextFiltersData.status !== "" && nextFiltersData.status !== null
        ? Number(nextFiltersData.status)
        : null;
    const isActiveValue = nextFiltersData.isActive;

    if (name) {
      nextFilters.push("search");
      if (!nextQuery.search) nextQuery.search = {};
      nextQuery.search.name = { value: name, type: "String" };
    }
    if (adminId) {
      nextFilters.push("search");
      if (!nextQuery.search) nextQuery.search = {};
      nextQuery.search.admin_id = { value: adminId, type: "String" };
    }
    if (email) {
      nextFilters.push("search");
      if (!nextQuery.search) nextQuery.search = {};
      nextQuery.search.email = { value: email, type: "String" };
    }
    if (role) {
      nextFilters.push("role");
      nextQuery.role = { value: role, type: "String" };
    }
    if (statusValue !== null && !Number.isNaN(statusValue)) {
      nextFilters.push("status");
      nextQuery.status = { value: statusValue, type: "Number" };
    }
    if (isActiveValue !== "" && isActiveValue !== null) {
      nextFilters.push("isActive");
      nextQuery.isActive = {
        value: isActiveValue === "true" ? "1" : "0",
        type: "Boolean",
      };
    }
    if (fromDate && toDate) {
      nextFilters.push("createdAt");
      nextQuery.createdAt = { value: `${fromDate}|${toDate}`, type: "Date" };
    }

    setSubAdminParams((prev) => ({
      ...prev,
      page: 1,
      filters: nextFilters,
      query: nextQuery,
      name: name || null,
      adminId: adminId || null,
      email: email || null,
      role: role || null,
      status: statusValue ?? null,
      isActive: isActiveValue || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
    }));
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    applyFilters(filters);
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    applyFilters(EMPTY_FILTERS);
  };

  const handleConfirmDelete = (txnPassword) => {
    if (selectedSubAdmin && txnPassword) {
      deleteSubAdmin(selectedSubAdmin._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedSubAdmin(null);
    }
  };

  const handleConfirmStatusToggle = (txnPassword) => {
    if (selectedSubAdmin && txnPassword) {
      toggleSubAdminStatus(selectedSubAdmin._id, txnPassword);
      setShowStatusModal(false);
      setSelectedSubAdmin(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedSubAdmin(null);
  };

  // Only admins can access this page
  if (!loggedInAdmin || !isAdmin(loggedInAdmin)) {
    return (
      <Container>
        <Card className="common-panel-card">
          <Card.Body>
            <div className="text-center py-5">
              <h5>Access Denied</h5>
              <p className="text-muted">
                Only full admins can manage sub-admins.
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Sub-Admins"
        crumbs={[{ name: "Sub-Admins" }]}
      />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        <Button
          type="button"
          className="btn btn--theme"
          onClick={() => navigate("/admin/sub-admins/create")}
        >
          <FiPlus className="me-2" />
          Add Sub-Admin
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <SubAdminFilters
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
            <p className="text-muted mb-3">Total Sub-Admins: {count}</p>
          )}
          <CustomDataTable
            columns={columns}
            data={data}
            count={count}
            params={subAdminParams}
            setParams={setSubAdminParams}
            pagination
            responsive
            striped
            progressPending={loadingSubAdminsList}
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
        title="Delete Sub-Admin"
        body={`Are you sure you want to delete sub-admin "${selectedSubAdmin?.name || ""}" (${selectedSubAdmin?.admin_id || ""})? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showStatusModal}
        handleClose={() => {
          setShowStatusModal(false);
          setSelectedSubAdmin(null);
        }}
        handleConfirm={handleConfirmStatusToggle}
        title={selectedSubAdmin?.isActive ? "Deactivate Sub-Admin" : "Activate Sub-Admin"}
        body={`Are you sure you want to ${selectedSubAdmin?.isActive ? "deactivate" : "activate"} sub-admin "${selectedSubAdmin?.name || ""}" (${selectedSubAdmin?.admin_id || ""})? Please enter your transaction password to confirm.`}
        submitBtnText={selectedSubAdmin?.isActive ? "Deactivate" : "Activate"}
      />
    </Container>
  );
};

SubAdminsList.propTypes = {
  getSubAdminsList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  subAdminsList: state.adminSubAdmins.subAdminsList,
  loadingSubAdminsList: state.adminSubAdmins.loadingSubAdminsList,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getSubAdminsList,
  deleteSubAdmin,
  toggleSubAdminStatus,
  resetComponentStore,
})(SubAdminsList);
