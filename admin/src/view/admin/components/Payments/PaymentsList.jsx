import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Collapse, Container } from "react-bootstrap";
import { connect } from "react-redux";
import { FaSync } from "react-icons/fa";
import { MdOutlinePageview } from "react-icons/md";
import { format, parseISO } from "date-fns";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import PaymentFilters from "./PaymentFilters";
import PaymentDetailModal from "./PaymentDetailModal";
import { getPayments, getPaymentById } from "@src/actions/adminPaymentsActions";
import { getMembershipPlans } from "@src/actions/adminMembershipPlanActions";
import { hasPermission } from "@src/utils/permissions";
import { formatIndianNumber } from "@src/utils/helper";

const EMPTY_FILTERS = {
  memberId: "",
  name: "",
  status: "",
  planId: "",
  fromDate: "",
  toDate: "",
};

const EMPTY_PARAMS = {
  page: 1,
  limit: 20,
  ...EMPTY_FILTERS,
};

const PaymentsList = ({
  loggedInAdmin,
  payments,
  payment,
  getPayments,
  getPaymentById,
  getMembershipPlans,
  membershipPlans,
  loadingPayments,
  loadingPaymentDetail,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [params, setParams] = useState(EMPTY_PARAMS);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const canView = hasPermission(loggedInAdmin, "payments", "view");

  useEffect(() => {
    getPayments(params);
  }, [getPayments, params]);

  useEffect(() => {
    getMembershipPlans({ limit: 100, page: 1, isActive: "" });
  }, [getMembershipPlans]);

  const planOptions = useMemo(
    () =>
      (membershipPlans?.data || []).map((plan) => ({
        label: plan.name,
        value: plan._id,
      })),
    [membershipPlans?.data],
  );

  const applyFilters = (nextFilters) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      memberId: String(nextFilters.memberId || "").trim(),
      name: String(nextFilters.name || "").trim(),
      status: String(nextFilters.status || "").trim(),
      planId: String(nextFilters.planId || "").trim(),
      fromDate: String(nextFilters.fromDate || "").trim(),
      toDate: String(nextFilters.toDate || "").trim(),
    }));
  };

  const getStatusBadge = (status) => {
    const map = {
      success: { bg: "success", text: "Success" },
      failed: { bg: "danger", text: "Failed" },
      pending: { bg: "warning", text: "Pending" },
    };
    const config = map[status] || map.pending;
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const handleViewPayment = async (row) => {
    if (!canView) return;
    setShowDetailModal(true);
    await getPaymentById(row._id);
  };

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.userId?.memberId || "—",
      minWidth: "130px",
    },
    {
      name: "User",
      selector: (row) => row.userId?.name || row.userName || "—",
      minWidth: "140px",
      wrap: true,
    },
    {
      name: "Plan",
      selector: (row) => row.selectedPlan?.name || "—",
      minWidth: "200px",
    },
    {
      name: "Amount",
      cell: (row) => `₹${formatIndianNumber(row.amount)}`,
      minWidth: "100px",
    },
    {
      name: "Status",
      cell: (row) => getStatusBadge(row.status),
      minWidth: "100px",
    },
    {
      name: "Date",
      cell: (row) => {
        try {
          return format(parseISO(row.createdAt), "dd MMM yyyy, hh:mm a");
        } catch {
          return "—";
        }
      },
      minWidth: "170px",
    },
    {
      name: "Actions",
      width: "90px",
      cell: (row) =>
        canView ? (
          <Button variant="outline-primary" size="sm" onClick={() => handleViewPayment(row)} title="View">
            <MdOutlinePageview size={18} />
          </Button>
        ) : null,
    },
  ];

  const pagination = payments?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Payment Transactions"
        crumbs={[{ name: "Membership Management" }, { name: "Payment Transactions" }]}
      />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        <Button variant="outline-secondary" size="sm" onClick={() => getPayments(params)}>
          <FaSync className="me-1" /> Refresh
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <PaymentFilters
            values={filters}
            onChange={(e) => {
              const { name, value } = e.target;
              setFilters((prev) => ({ ...prev, [name]: value }));
            }}
            onSearch={() => applyFilters(filters)}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              applyFilters(EMPTY_FILTERS);
            }}
            planOptions={planOptions}
          />
        </div>
      </Collapse>

      <MainCard>
        <CustomDataTable
          columns={columns}
          data={payments?.data || []}
          count={pagination.total}
          params={{ page: pagination.page, limit: pagination.limit }}
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
          progressPending={loadingPayments}
          highlightOnHover
          persistTableHead
        />
      </MainCard>

      <PaymentDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        payment={payment}
        loading={loadingPaymentDetail}
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  payments: state.adminPayments.payments,
  payment: state.adminPayments.payment,
  membershipPlans: state.adminMembershipPlan.membershipPlans,
  loadingPayments: state.adminPayments.loadingPayments,
  loadingPaymentDetail: state.adminPayments.loadingPaymentDetail,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getPayments,
  getPaymentById,
  getMembershipPlans,
})(PaymentsList);
