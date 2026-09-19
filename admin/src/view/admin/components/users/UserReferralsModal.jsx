import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Modal } from "react-bootstrap";
import { format, parseISO } from "date-fns";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";

const DEFAULT_PARAMS = { page: 1, limit: 20 };

const STATUS_MAP = {
  1: { label: "Active", bg: "success" },
  2: { label: "Inactive", bg: "secondary" },
  3: { label: "Blocked", bg: "danger" },
  4: { label: "New", bg: "info" },
};

const UserReferralsModal = ({
  show,
  onHide,
  user,
  getUserReferrals,
}) => {
  const [result, setResult] = useState({
    data: [],
    pagination: { ...DEFAULT_PARAMS, total: 0, pages: 0 },
    referrer: null,
  });
  const [loading, setLoading] = useState(false);

  const fetchReferrals = async (nextParams) => {
    if (!user?._id) return;
    setLoading(true);
    const response = await getUserReferrals(user._id, nextParams);
    if (response?.status) {
      setResult(response.response);
    } else {
      setResult({
        data: [],
        pagination: { ...nextParams, total: 0, pages: 0 },
        referrer: null,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!show || !user?._id) return;
    fetchReferrals(DEFAULT_PARAMS);
    // Fetch only when the selected user/modal changes; pagination is event-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, user?._id]);

  const columns = useMemo(
    () => [
      {
        name: "Member ID",
        selector: (row) => row.memberId || "—",
        minWidth: "145px",
      },
      {
        name: "Name",
        selector: (row) => row.name || "—",
        minWidth: "180px",
        wrap: true,
      },
      {
        name: "Status",
        selector: (row) => row.status,
        cell: (row) => {
          const status = STATUS_MAP[row.status] || {
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
        name: "Registered",
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

  const pagination = result?.pagination || {
    ...DEFAULT_PARAMS,
    total: 0,
    pages: 0,
  };
  const activeReferralCount =
    result?.referrer?.referralCount ?? user?.referralCount ?? 0;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Referred Users</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="border rounded bg-light p-3 mb-3">
          <div className="fw-semibold">{user?.name || "—"}</div>
          <div className="text-muted small">
            Referrer Member ID: {user?.memberId || "—"} · Active referrals:{" "}
            {activeReferralCount} · Listed: {pagination.total}
          </div>
        </div>

        <CustomDataTable
          columns={columns}
          data={result?.data || []}
          count={pagination.total}
          params={{ page: pagination.page, limit: pagination.limit }}
          setParams={(next) => {
            const nextParams = {
              page: next.page,
              limit: next.limit,
            };
            fetchReferrals(nextParams);
          }}
          paginationServer
          responsive
          striped
          progressPending={loading}
          highlightOnHover
          persistTableHead
          noDataComponent={
            <div className="text-muted py-4">No referred users found.</div>
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

export default UserReferralsModal;
