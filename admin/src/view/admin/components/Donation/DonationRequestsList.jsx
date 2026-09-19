import React, { useState, useEffect } from "react";
import { Card, Collapse, Container, Badge, Button } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { FaSync } from "react-icons/fa";
import { format, parseISO } from "date-fns";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import DonationFilters from "./DonationFilters";
import DonationApproveModal from "./DonationApproveModal";
import DonationRejectModal from "./DonationRejectModal";
import { hasPermission } from "@src/utils/permissions";

import {
  getDonationRequests,
  approveDonationRequest,
  rejectDonationRequest,
} from "@src/actions/adminDonationActions";
import { formatIndianNumber } from "@src/utils/helper";

const EMPTY_FILTERS = {
  status: "",
  phone: "",
  email: "",
  amount: "",
  search: "",
  fromDate: "",
  toDate: "",
};

const EMPTY_PARAMS = {
  page: 1,
  limit: 20,
  status: "",
  phone: "",
  email: "",
  amount: "",
  search: "",
  fromDate: "",
  toDate: "",
};

const DonationRequestsList = ({
  donationRequests,
  getDonationRequests,
  approveDonationRequest,
  rejectDonationRequest,
  loadingDonationRequests,
  loggedInAdmin,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [params, setParams] = useState(EMPTY_PARAMS);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const canManageRequests = hasPermission(loggedInAdmin, "donation", "requests");

  useEffect(() => {
    getDonationRequests(params);
  }, [getDonationRequests, params]);

  const applyFilters = (nextFiltersData) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      status: String(nextFiltersData.status || "").trim(),
      phone: String(nextFiltersData.phone || "").trim(),
      email: String(nextFiltersData.email || "").trim(),
      amount: String(nextFiltersData.amount || "").trim(),
      search: String(nextFiltersData.search || "").trim(),
      fromDate: String(nextFiltersData.fromDate || "").trim(),
      toDate: String(nextFiltersData.toDate || "").trim(),
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

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedRequest && txnPassword) {
      const result = await approveDonationRequest(selectedRequest._id, txnPassword);
      if (result?.status) {
        setShowApproveModal(false);
        setSelectedRequest(null);
        getDonationRequests(params);
      }
    }
  };

  const handleConfirmReject = async (txnPassword, rejectionReason) => {
    if (selectedRequest && txnPassword && rejectionReason) {
      const result = await rejectDonationRequest(
        selectedRequest._id,
        txnPassword,
        rejectionReason,
      );
      if (result?.status) {
        setShowRejectModal(false);
        setSelectedRequest(null);
        getDonationRequests(params);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { bg: "success", text: "Approved" },
      rejected: { bg: "danger", text: "Rejected" },
      pending: { bg: "warning", text: "Pending" },
    };
    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const columns = [
    {
      name: "Donor Name",
      selector: (row) => row.donorName || "Guest User",
      sortable: false,
      minWidth: "150px",
      wrap: true,
    },
    {
      name: "Email",
      selector: (row) => row.email || "N/A",
      sortable: false,
      minWidth: "200px",
      wrap: true,
    },
    {
      name: "Mobile",
      selector: (row) => row.phone || "N/A",
      sortable: false,
      minWidth: "120px",
      wrap: true,
    },
    {
      name: "Amount",
      cell: (row) => `₹${formatIndianNumber(row.amount) || 0}`,
      sortable: true,
      minWidth: "120px",
      wrap: true,
    },
    {
      name: "Status",
      cell: (row) => getStatusBadge(row.status),
      sortable: false,
      minWidth: "120px",
      wrap: true,
    },
    {
      name: "Payment Mode",
      cell: (row) => (
        <Badge bg={row.paymentMode === "UPI" ? "info" : "secondary"}>
          {row.paymentMode || "N/A"}
        </Badge>
      ),
      sortable: false,
      minWidth: "160px",
      wrap: true,
    },
    {
      name: "UTR Number",
      selector: (row) => row.utrNumber || "N/A",
      sortable: false,
      minWidth: "160px",
      wrap: true,
    },
    {
      name: "Referral Member ID",
      selector: (row) => row.referralId || "—",
      sortable: false,
      minWidth: "160px",
      wrap: true,
    },
    {
      name: "Rejection Reason",
      cell: (row) =>
        row.status === "rejected" && row.rejectionReason ? (
          <span title={row.rejectionReason}>{row.rejectionReason}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
      sortable: false,
      minWidth: "220px",
      wrap: true,
    },
    {
      name: "Date & Time",
      cell: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "N/A",
      sortable: true,
      minWidth: "180px",
      wrap: true,
    },
    {
      name: "Actions",
      minWidth: "220px",
      cell: (row) =>
        row.status === "pending" && canManageRequests ? (
          <div className="d-flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="btn btn--theme"
              onClick={() => handleApproveClick(row)}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              className="btn btn--reject"
              onClick={() => handleRejectClick(row)}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const tableCustomStyles = {
    headCells: {
      style: {
        whiteSpace: "normal",
        overflow: "visible",
        textOverflow: "unset",
        wordBreak: "keep-all",
        lineHeight: "1.25",
      },
    },
  };

  const data = donationRequests?.data || [];
  const pagination = donationRequests?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  };

  const handlePageChange = (page) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }));
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Donation Requests"
        crumbs={[{ name: "Donations" }]}
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
          className="btn btn--outline"
          onClick={() => getDonationRequests(params)}
          disabled={loadingDonationRequests}
        >
          <FaSync className="me-2" />
          Refresh
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <DonationFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <Card className="common-panel-card">
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={data}
            count={pagination.total}
            customStyles={tableCustomStyles}
            params={{
              page: pagination.page,
              limit: pagination.limit,
            }}
            setParams={(newParams) => {
              if (newParams.page !== undefined) handlePageChange(newParams.page);
              if (newParams.limit !== undefined)
                handleLimitChange(newParams.limit);
            }}
            pagination
            responsive
            striped
            progressPending={loadingDonationRequests}
            highlightOnHover
            persistTableHead
            paginationServer
          />
        </Card.Body>
      </Card>

      <DonationApproveModal
        show={showApproveModal}
        onHide={() => {
          setShowApproveModal(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleConfirmApprove}
        request={selectedRequest}
      />

      <DonationRejectModal
        show={showRejectModal}
        onHide={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleConfirmReject}
        request={selectedRequest}
      />
    </Container>
  );
};

DonationRequestsList.propTypes = {
  getDonationRequests: PropTypes.func.isRequired,
  approveDonationRequest: PropTypes.func.isRequired,
  rejectDonationRequest: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  donationRequests: state.adminDonation.donationRequests,
  loadingDonationRequests: state.adminDonation.loadingDonationRequests,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getDonationRequests,
  approveDonationRequest,
  rejectDonationRequest,
})(DonationRequestsList);
