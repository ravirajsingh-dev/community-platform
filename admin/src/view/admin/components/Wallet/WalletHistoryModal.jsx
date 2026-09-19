import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Col,
  Collapse,
  Form,
  Modal,
  Row,
} from "react-bootstrap";
import { FaWallet } from "react-icons/fa";
import { format, parseISO } from "date-fns";

import { formatIndianNumber } from "@src/utils/helper";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import CustomSelect from "@src/components/common/CustomSelect";
import { getOptionByValue } from "@src/constants/CustomSelectValues";

const DEFAULT_PARAMS = {
  page: 1,
  limit: 20,
  type: "",
  source: "",
};

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "referral_commission", label: "Referral commissions (all)" },
  { value: "admin_adjust", label: "Admin adjustment" },
  { value: "membership_create", label: "Membership create" },
];

const SOURCE_LABELS = {
  referral_commission: "Referral commission",
  admin_adjust: "Admin adjustment",
  membership_create: "Membership create",
};

const getSourceLabel = (transaction) => {
  if (transaction.source === "membership_create") return "Membership create";
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

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy, hh:mm a");
  } catch {
    return "—";
  }
};

const WalletHistoryModal = ({
  show,
  onHide,
  loading,
  transactions,
  walletRow,
  onFetch,
}) => {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [showFilters, setShowFilters] = useState(false);
  const wallet = transactions?.wallet;
  const walletSummary = walletRow || wallet;
  const rows = transactions?.data || [];
  const user = walletSummary?.user;
  const pagination = transactions?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  };

  useEffect(() => {
    if (show) {
      setParams(DEFAULT_PARAMS);
      setShowFilters(false);
    }
  }, [show, walletRow?._id]);

  const requestPage = (nextParams) => {
    const next = { ...params, ...nextParams };
    setParams(next);
    onFetch(next);
  };

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
            {row.type === "credit" ? "Credit" : "Debit"}
          </Badge>
        ),
        width: "100px",
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
        width: "125px",
      },
      {
        name: "Remarks",
        selector: (row) => row.remarks,
        cell: (row) => getRemarks(row),
        wrap: true,
        minWidth: "280px",
      },
      {
        name: "Date",
        selector: (row) => row.createdAt,
        cell: (row) => formatDate(row.createdAt),
        minWidth: "175px",
      },
    ],
    [],
  );

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaWallet aria-hidden />
          Wallet History
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {walletSummary ? (
          <div className="border rounded bg-light p-3 mb-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <div className="text-muted small">Member</div>
                <div className="fw-semibold">{user?.name || "—"}</div>
                <div className="text-muted small">
                  {user?.memberId || "—"}
                </div>
              </div>
              <div className="text-md-end">
                <div className="text-muted small">Available balance</div>
                <div className="fs-4 fw-bold text-success">
                  ₹{formatIndianNumber(walletSummary.balance || 0)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <p className="text-muted mb-3">No wallet found for this user.</p>
          )
        )}

        <div className="d-flex align-items-center gap-2 mb-3">
          <Button
            type="button"
            className="btn btn--outline"
            onClick={() => setShowFilters((current) => !current)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        <Collapse in={showFilters}>
          <div>
            <Row className="g-2 mb-3">
              <Col md={6}>
                <Form.Group controlId="walletHistoryType">
                  <Form.Label className="small mb-1">
                    Transaction type
                  </Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    options={TYPE_OPTIONS}
                    value={getOptionByValue(TYPE_OPTIONS, params.type)}
                    onChange={(option) =>
                      requestPage({
                        page: 1,
                        type: option?.value || "",
                      })
                    }
                    isRequired
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="walletHistorySource">
                  <Form.Label className="small mb-1">Source</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    options={SOURCE_OPTIONS}
                    value={getOptionByValue(SOURCE_OPTIONS, params.source)}
                    onChange={(option) =>
                      requestPage({
                        page: 1,
                        source: option?.value || "",
                      })
                    }
                    isRequired
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Collapse>

        <CustomDataTable
          columns={columns}
          data={rows}
          count={pagination.total}
          params={{ page: pagination.page, limit: pagination.limit }}
          setParams={(next) =>
            requestPage({
              page: next.page,
              limit: next.limit,
            })
          }
          paginationServer
          responsive
          striped
          progressPending={loading}
          highlightOnHover
          persistTableHead
          noDataComponent={
            <div className="text-muted py-4">No wallet transactions found.</div>
          }
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WalletHistoryModal;
