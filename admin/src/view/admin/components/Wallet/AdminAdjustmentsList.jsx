import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Collapse, Col, Container, Form, Row } from "react-bootstrap";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import { FaEdit } from "react-icons/fa";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import CustomSelect from "@src/components/common/CustomSelect";
import MemberIdInput from "@src/components/common/MemberIdInput";
import { getOptionByValue } from "@src/constants/CustomSelectValues";
import WalletAdjustModal from "./WalletAdjustModal";
import {
  getAdminAdjustments,
  resolveWalletMember,
  adjustWalletBalance,
} from "@src/actions/adminWalletActions";
import { setErrors } from "@src/actions/adminAuth";
import { removeErrors } from "@reducers/errors";
import { hasPermission } from "@src/utils/permissions";
import { formatIndianNumber } from "@src/utils/helper";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "credit", label: "Credit (CR)" },
  { value: "debit", label: "Debit (DR)" },
];

const EMPTY_FILTERS = {
  memberId: "",
  name: "",
  type: "",
};

const EMPTY_PARAMS = {
  page: 1,
  limit: 20,
  ...EMPTY_FILTERS,
};

const AdminAdjustmentsList = ({
  loggedInAdmin,
  adminAdjustments,
  loadingAdminAdjustments,
  adjustingWallet,
  errorList,
  getAdminAdjustments,
  resolveWalletMember,
  adjustWalletBalance,
  setErrors,
  removeErrors,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [params, setParams] = useState(EMPTY_PARAMS);

  const canView = hasPermission(loggedInAdmin, "wallets", "view");
  const canAdjust = hasPermission(loggedInAdmin, "wallets", "adjust");

  useEffect(() => {
    if (!canView) return;
    getAdminAdjustments(params);
  }, [canView, getAdminAdjustments, params]);

  const applyFilters = (nextFilters) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      memberId: String(nextFilters.memberId || "").trim(),
      name: String(nextFilters.name || "").trim(),
      type: String(nextFilters.type || "").trim(),
    }));
  };

  const handleOpenAdjust = () => {
    if (!canAdjust) return;
    removeErrors();
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (payload) => {
    removeErrors();
    const { userId, ...adjustment } = payload;
    if (!userId) return;

    const result = await adjustWalletBalance(userId, adjustment);
    if (result?.status) {
      setShowAdjustModal(false);
      getAdminAdjustments(params);
      return;
    }

    if (result?.errors?.length) {
      setErrors(result.errors);
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "Member ID",
        selector: (row) => row.user?.memberId || "—",
        minWidth: "140px",
      },
      {
        name: "Name",
        selector: (row) => row.user?.name || "—",
        minWidth: "160px",
        wrap: true,
      },
      {
        name: "Type",
        selector: (row) => row.type,
        cell: (row) => (
          <Badge bg={row.type === "credit" ? "success" : "danger"}>
            {row.type === "credit" ? "Credit" : "Debit"}
          </Badge>
        ),
        width: "110px",
      },
      {
        name: "Amount",
        selector: (row) => row.amount,
        cell: (row) => (
          <span
            className={`fw-semibold ${
              row.type === "credit" ? "text-success" : "text-danger"
            }`}
          >
            {row.type === "debit" ? "−" : "+"}₹
            {formatIndianNumber(row.amount)}
          </span>
        ),
        width: "120px",
      },
      {
        name: "Remarks",
        selector: (row) => row.remarks,
        cell: (row) => row.remarks || "—",
        wrap: true,
        minWidth: "260px",
      },
      {
        name: "Date",
        selector: (row) => row.createdAt,
        cell: (row) => {
          try {
            return format(parseISO(row.createdAt), "dd MMM yyyy, hh:mm a");
          } catch {
            return "—";
          }
        },
        minWidth: "175px",
      },
    ],
    [],
  );

  const pagination = adminAdjustments?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  };

  if (!canView) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Wallet Adjustment History"
          crumbs={[
            { name: "Membership Management" },
            { name: "Wallet Adjustment History" },
          ]}
        />
        <div className="alert alert-warning">
          You do not have permission to view wallet adjustments.
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Wallet Adjustment History"
        crumbs={[
          { name: "Membership Management" },
          { name: "Wallet Adjustment History" },
        ]}
      />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        {canAdjust ? (
          <Button
            type="button"
            className="btn btn--theme"
            onClick={handleOpenAdjust}
          >
            <FaEdit className="me-1" /> Adjust Wallet
          </Button>
        ) : null}
      </div>

      <Collapse in={showFilters}>
        <div>
          <Form
            className="mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters(filters);
            }}
          >
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <MemberIdInput
                  id="admin-adjust-memberId"
                  name="memberId"
                  value={filters.memberId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      memberId: e.target.value,
                    }))
                  }
                  label="Member ID"
                />
              </Col>
              <Col md={4}>
                <Form.Group controlId="admin-adjust-name">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    name="name"
                    value={filters.name}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Search by name"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="admin-adjust-type">
                  <Form.Label>Type</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    options={TYPE_OPTIONS}
                    value={getOptionByValue(TYPE_OPTIONS, filters.type)}
                    onChange={(option) =>
                      setFilters((prev) => ({
                        ...prev,
                        type: option?.value || "",
                      }))
                    }
                    isRequired
                  />
                </Form.Group>
              </Col>
              <Col xs={12} className="d-flex gap-2">
                <Button type="submit" className="btn btn--theme">
                  Apply Filters
                </Button>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    applyFilters(EMPTY_FILTERS);
                  }}
                >
                  Reset
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      </Collapse>

      <MainCard>
        <CustomDataTable
          columns={columns}
          data={adminAdjustments?.data || []}
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
          progressPending={loadingAdminAdjustments}
          highlightOnHover
          persistTableHead
          noDataComponent={
            <div className="text-muted py-4">
              No wallet adjustments yet.
            </div>
          }
        />
      </MainCard>

      <WalletAdjustModal
        show={showAdjustModal}
        onHide={() => setShowAdjustModal(false)}
        submitting={adjustingWallet}
        errorList={errorList}
        resolveWalletMember={resolveWalletMember}
        onSubmit={handleAdjustSubmit}
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  loggedInAdmin: state.adminAuth.admin,
  adminAdjustments: state.adminWallets.adminAdjustments,
  loadingAdminAdjustments: state.adminWallets.loadingAdminAdjustments,
  adjustingWallet: state.adminWallets.adjustingWallet,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  getAdminAdjustments,
  resolveWalletMember,
  adjustWalletBalance,
  setErrors,
  removeErrors,
})(AdminAdjustmentsList);
