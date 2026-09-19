import React, { useEffect, useState } from "react";
import { Button, Collapse, Container } from "react-bootstrap";
import { connect } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { FaHistory } from "react-icons/fa";
import { format, parseISO } from "date-fns";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import WalletFilters from "./WalletFilters";
import WalletHistoryModal from "./WalletHistoryModal";
import {
  getWallets,
  getWalletTransactions,
} from "@src/actions/adminWalletActions";
import { hasPermission } from "@src/utils/permissions";
import { formatIndianNumber } from "@src/utils/helper";

const EMPTY_FILTERS = {
  memberId: "",
  name: "",
  phone: "",
};

const EMPTY_PARAMS = {
  page: 1,
  limit: 20,
  ...EMPTY_FILTERS,
};

const WalletsList = ({
  loggedInAdmin,
  wallets,
  transactions,
  getWallets,
  getWalletTransactions,
  loadingWallets,
  loadingTransactions,
}) => {
  const [searchParams] = useSearchParams();
  const initialMemberId = String(searchParams.get("memberId") || "").trim();
  const [showFilters, setShowFilters] = useState(Boolean(initialMemberId));
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    memberId: initialMemberId,
  });
  const [params, setParams] = useState({
    ...EMPTY_PARAMS,
    memberId: initialMemberId,
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [autoOpenedMemberId, setAutoOpenedMemberId] = useState(null);

  const canView = hasPermission(loggedInAdmin, "wallets", "view");

  useEffect(() => {
    const memberId = String(searchParams.get("memberId") || "").trim();
    setFilters((prev) =>
      prev.memberId === memberId ? prev : { ...EMPTY_FILTERS, memberId },
    );
    setParams((prev) =>
      prev.memberId === memberId && prev.page === 1
        ? prev
        : { ...EMPTY_PARAMS, memberId },
    );
    if (memberId) {
      setShowFilters(true);
    }
  }, [searchParams]);

  useEffect(() => {
    getWallets(params);
  }, [getWallets, params]);

  useEffect(() => {
    const memberId = String(searchParams.get("memberId") || "").trim();
    if (!canView || !memberId || loadingWallets) return;
    if (autoOpenedMemberId === memberId) return;
    const match = (wallets?.data || []).find(
      (row) => row.user?.memberId === memberId,
    );
    if (!match) return;
    setAutoOpenedMemberId(memberId);
    setSelectedRow(match);
    setShowHistoryModal(true);
    getWalletTransactions(match.userId || match.user?._id, {
      page: 1,
      limit: 20,
    });
  }, [
    autoOpenedMemberId,
    canView,
    getWalletTransactions,
    loadingWallets,
    searchParams,
    wallets?.data,
  ]);

  const applyFilters = (nextFilters) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      memberId: String(nextFilters.memberId || "").trim(),
      name: String(nextFilters.name || "").trim(),
      phone: String(nextFilters.phone || "").trim(),
    }));
  };

  const handleViewHistory = async (row) => {
    if (!canView) return;
    setSelectedRow(row);
    setShowHistoryModal(true);
    await getWalletTransactions(row.userId || row.user?._id, {
      page: 1,
      limit: 20,
    });
  };

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.user?.memberId || "—",
      minWidth: "130px",
    },
    {
      name: "Name",
      selector: (row) => row.user?.name || "—",
      minWidth: "140px",
      wrap: true,
    },
    {
      name: "Phone",
      selector: (row) => row.user?.phone || "—",
      minWidth: "110px",
    },
    {
      name: "Balance",
      cell: (row) => `₹${formatIndianNumber(row.balance || 0)}`,
      minWidth: "110px",
    },
    {
      name: "Updated",
      cell: (row) => {
        try {
          return format(parseISO(row.updatedAt), "dd MMM yyyy, hh:mm a");
        } catch {
          return "—";
        }
      },
      minWidth: "170px",
    },
    {
      name: "Actions",
      minWidth: "120px",
      cell: (row) => (
        <div className="d-flex gap-2">
          {canView && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleViewHistory(row)}
              title="History"
            >
              <FaHistory size={14} className="me-1" />
              History
            </Button>
          )}
        </div>
      ),
    },
  ];

  const pagination = wallets?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Wallets"
        crumbs={[{ name: "Membership Management" }, { name: "Wallets" }]}
      />

      <div className="d-flex align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <WalletFilters
            values={filters}
            onChange={setFilters}
            onApply={applyFilters}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              applyFilters(EMPTY_FILTERS);
            }}
          />
        </div>
      </Collapse>

      <MainCard>
        <CustomDataTable
          columns={columns}
          data={wallets?.data || []}
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
          progressPending={loadingWallets}
          highlightOnHover
          persistTableHead
        />
      </MainCard>

      <WalletHistoryModal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        loading={loadingTransactions}
        transactions={transactions}
        walletRow={selectedRow}
        onFetch={(historyParams) =>
          getWalletTransactions(
            selectedRow?.userId || selectedRow?.user?._id,
            historyParams,
          )
        }
      />

    </Container>
  );
};

const mapStateToProps = (state) => ({
  wallets: state.adminWallets.wallets,
  transactions: state.adminWallets.transactions,
  loadingWallets: state.adminWallets.loadingWallets,
  loadingTransactions: state.adminWallets.loadingTransactions,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getWallets,
  getWalletTransactions,
})(WalletsList);
