import React from "react";
import {
  Button,
  Container,
  Badge,
  Collapse,
} from "react-bootstrap";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import { PropTypes } from "prop-types";
import { useSearchParams } from "react-router-dom";

import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import SimpleConfirmModal from "../../modals/SimpleConfirmModal";
import PendingApprovalsFilters from "./PendingApprovalsFilters";
import { FILTER_CASCADE_RESETS } from "./HierarchyEntityFilters";
import { hasPermission } from "@src/utils/permissions";
import { sanitizeName } from "@src/utils/inputValidation";
import {
  getPendingApprovalsList,
  approvePendingItem,
  rejectPendingItem,
  bulkApprovePendingItems,
  resetComponentStore,
} from "@src/actions/adminHierarchyPendingActions";

const EMPTY_FILTERS = {
  name: "",
  level: "",
  communityId: "",
  vanshId: "",
  kulId: "",
  khampId: "",
  subKhampId: "",
};

const buildInitialListParams = (overrides = {}) => ({
  limit: 10,
  page: 1,
  orderBy: "createdAt",
  ascending: "desc",
  search: "",
  level: "",
  communityId: "",
  vanshId: "",
  kulId: "",
  khampId: "",
  subKhampId: "",
  ...overrides,
});

const PendingApprovalsList = ({
  loggedInUser,
  pendingList,
  loadingPendingList,
  getPendingApprovalsList,
  approvePendingItem,
  rejectPendingItem,
  bulkApprovePendingItems,
  resetComponentStore,
}) => {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight") || "";
  const initialLevel = searchParams.get("level") || "";

  const [onlyOnce, setOnce] = React.useState(true);
  const [showFilters, setShowFilters] = React.useState(Boolean(initialLevel));
  const [filters, setFilters] = React.useState(() => ({
    ...EMPTY_FILTERS,
    level: initialLevel,
  }));
  const [listParams, setListParams] = React.useState(() =>
    buildInitialListParams({ level: initialLevel }),
  );
  const [selectedRow, setSelectedRow] = React.useState(null);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [clearSelectedToggle, setClearSelectedToggle] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [showBulkApproveModal, setShowBulkApproveModal] = React.useState(false);

  const data = pendingList?.data || [];
  const count = pendingList?.count || 0;

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }
    if (!loggedInUser) return;
    getPendingApprovalsList(listParams);
  }, [
    getPendingApprovalsList,
    listParams,
    resetComponentStore,
    loggedInUser,
    onlyOnce,
  ]);

  const refreshList = () => {
    getPendingApprovalsList(listParams);
  };

  const closeModals = () => {
    setShowApproveModal(false);
    setShowRejectModal(false);
    setShowBulkApproveModal(false);
    setSelectedRow(null);
  };

  const applyFilters = (nextFilters) => {
    const name = sanitizeName(nextFilters.name || "").trim();
    const nextParams = {
      ...listParams,
      page: 1,
      search: name,
      level: nextFilters.level || "",
      communityId: nextFilters.communityId || "",
      vanshId: nextFilters.vanshId || "",
      kulId: nextFilters.kulId || "",
      khampId: nextFilters.khampId || "",
      subKhampId: nextFilters.subKhampId || "",
    };
    setListParams(nextParams);
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onParentFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      const resets = FILTER_CASCADE_RESETS[field] || [];
      resets.forEach((key) => {
        next[key] = "";
      });
      return next;
    });
  };

  const onSearch = () => {
    applyFilters(filters);
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    applyFilters(EMPTY_FILTERS);
  };

  const canEditRow = (row) =>
    hasPermission(loggedInUser, row.permissionModule, "edit");

  const approvableSelectedRows = selectedRows.filter((row) => canEditRow(row));

  const columns = [
    {
      name: "Level",
      selector: (row) => row.levelLabel || row.level,
      sortable: false,
      width: "10%",
      wrap: true,
    },
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "16%",
      wrap: true,
    },
    {
      name: "Parent Chain",
      selector: (row) => row.chainLabel || row.name || "-",
      sortable: false,
      width: "28%",
      wrap: true,
    },
    {
      name: "Created By",
      selector: (row) => {
        if (!row.createdBy) return "Admin";
        const parts = [row.createdBy.name];
        if (row.createdBy.memberId) {
          parts.push(`(${row.createdBy.memberId})`);
        }
        return parts.join(" ");
      },
      sortable: false,
      width: "14%",
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
      width: "14%",
      wrap: true,
    },
    {
      name: "Actions",
      width: "10%",
      cell: (row) =>
        canEditRow(row) ? (
          <div className="d-flex gap-2">
            <Button
              variant="link"
              className="text-success p-0"
              onClick={() => {
                setSelectedRow(row);
                setShowApproveModal(true);
              }}
              title={`Approve ${row.levelLabel}`}
            >
              <FaCheckCircle size={18} />
            </Button>
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={() => {
                setSelectedRow(row);
                setShowRejectModal(true);
              }}
              title={`Reject ${row.levelLabel}`}
            >
              <FaTimesCircle size={18} />
            </Button>
          </div>
        ) : (
          <Badge bg="secondary">No access</Badge>
        ),
    },
  ];

  const conditionalRowStyles = highlightId
    ? [
        {
          when: (row) => String(row.id) === String(highlightId),
          style: {
            backgroundColor: "rgba(255, 193, 7, 0.18)",
          },
        },
      ]
    : [];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Pending Approvals"
        crumbs={[
          { name: "Community Management" },
          { name: "Pending Approvals" },
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
        {approvableSelectedRows.length > 0 && (
          <Button
            type="button"
            variant="success"
            onClick={() => setShowBulkApproveModal(true)}
          >
            Approve Selected ({approvableSelectedRows.length})
          </Button>
        )}
      </div>

      <Collapse in={showFilters}>
        <div>
          <PendingApprovalsFilters
            values={filters}
            onChange={onFilterChange}
            onParentChange={onParentFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <MainCard>
        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={listParams}
          setParams={setListParams}
          pagination
          responsive
          striped
          progressPending={loadingPendingList}
          highlightOnHover
          persistTableHead
          paginationServer
          selectableRows
          selectableRowsHighlight
          selectableRowDisabled={(row) => !canEditRow(row)}
          onSelectedRowsChange={({ selectedRows: nextSelected }) =>
            setSelectedRows(nextSelected)
          }
          clearSelectedRows={clearSelectedToggle}
          conditionalRowStyles={conditionalRowStyles}
        />
      </MainCard>

      <SimpleConfirmModal
        show={showApproveModal}
        onHide={closeModals}
        onConfirm={async () => {
          if (!selectedRow) return;
          await approvePendingItem(selectedRow.level, selectedRow.id);
          closeModals();
          refreshList();
        }}
        title={`Approve ${selectedRow?.levelLabel || "Item"}`}
        body={`Approve "${selectedRow?.name}"? Pending parents in the chain will be auto-approved.`}
        confirmLabel="Approve"
      />

      <SimpleConfirmModal
        show={showRejectModal}
        onHide={closeModals}
        onConfirm={async () => {
          if (!selectedRow) return;
          await rejectPendingItem(selectedRow.level, selectedRow.id);
          closeModals();
          refreshList();
        }}
        title={`Reject ${selectedRow?.levelLabel || "Item"}`}
        body={`Are you sure you want to reject "${selectedRow?.name}"?`}
        confirmLabel="Reject"
      />

      <SimpleConfirmModal
        show={showBulkApproveModal}
        onHide={closeModals}
        onConfirm={async () => {
          const items = approvableSelectedRows.map((row) => ({
            level: row.level,
            id: row.id,
          }));
          if (!items.length) return;
          const result = await bulkApprovePendingItems(items);
          closeModals();
          setSelectedRows([]);
          setClearSelectedToggle((prev) => !prev);
          if (result?.status !== false) {
            refreshList();
          }
        }}
        title="Approve Selected Items"
        body={`Approve ${approvableSelectedRows.length} selected pending item(s)? Parents in each chain will be auto-approved where needed.`}
        confirmLabel="Approve All"
      />
    </Container>
  );
};

PendingApprovalsList.propTypes = {
  getPendingApprovalsList: PropTypes.func.isRequired,
  approvePendingItem: PropTypes.func.isRequired,
  rejectPendingItem: PropTypes.func.isRequired,
  bulkApprovePendingItems: PropTypes.func.isRequired,
  resetComponentStore: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  pendingList: state.adminHierarchyPending.pendingList,
  loadingPendingList: state.adminHierarchyPending.loadingPendingList,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getPendingApprovalsList,
  approvePendingItem,
  rejectPendingItem,
  bulkApprovePendingItems,
  resetComponentStore,
})(PendingApprovalsList);
