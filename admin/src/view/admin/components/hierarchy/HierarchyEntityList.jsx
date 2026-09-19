import React from "react";
import { Button, Container, Badge, Collapse } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";

import { RiDeleteBin5Line } from "react-icons/ri";
import { VscEdit } from "react-icons/vsc";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import SimpleConfirmModal from "../../modals/SimpleConfirmModal";
import HierarchyEntityFilters, {
  FILTER_CASCADE_RESETS,
} from "./HierarchyEntityFilters";
import { hasPermission, hasAnyHierarchyEditPermission } from "@src/utils/permissions";
import { getHierarchyStatusBadge } from "@src/utils/hierarchyStatusUtils";
import { sanitizeName } from "@src/utils/inputValidation";

function buildEmptyFilters(formParents = []) {
  const filters = { name: "", status: "" };
  for (const parent of formParents) {
    filters[parent.field] = "";
  }
  return filters;
}

function buildInitialListParams(formParents = []) {
  const params = {
    limit: 10,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    search: "",
    status: "",
  };
  for (const parent of formParents) {
    params[parent.field] = "";
  }
  return params;
}

function getDisplayStatus(row) {
  if (row.status === "active" && row.isActive === false) {
    return "inactive";
  }
  return row.status || "active";
}

const HierarchyEntityList = ({
  config,
  entityList,
  loadingList,
  loggedInUser,
  fetchList,
  resetComponentStore,
  hardDeleteEntity,
}) => {
  const navigate = useNavigate();
  const [onlyOnce, setOnce] = React.useState(true);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState(null);

  const [filters, setFilters] = React.useState(() =>
    buildEmptyFilters(config.formParents),
  );
  const [listParams, setListParams] = React.useState(() =>
    buildInitialListParams(config.formParents),
  );

  const data = entityList?.data || [];
  const count = entityList?.count || 0;

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }
    if (!loggedInUser) return;
    fetchList(listParams);
  }, [fetchList, listParams, resetComponentStore, loggedInUser, onlyOnce]);

  const refreshList = () => {
    fetchList(listParams);
  };

  const closeModals = () => {
    setShowHardDeleteModal(false);
    setSelectedRow(null);
  };

  const applyFilters = (nextFilters) => {
    const name = sanitizeName(nextFilters.name || "").trim();
    const nextParams = {
      ...listParams,
      page: 1,
      search: name,
      status: nextFilters.status || "",
    };

    for (const parent of config.formParents || []) {
      nextParams[parent.field] = nextFilters[parent.field] || "";
    }

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
    const emptyFilters = buildEmptyFilters(config.formParents);
    setFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  const goToPendingApproval = (row) => {
    navigate(
      `/admin/community-management/pending?level=${config.key}&highlight=${row._id}`,
    );
  };

  const renderStatusCell = (row) => {
    const displayStatus = getDisplayStatus(row);

    if (
      displayStatus === "pending" &&
      hasAnyHierarchyEditPermission(loggedInUser)
    ) {
      return (
        <Badge
          bg="warning"
          role="button"
          className="hierarchy-status-badge--pending"
          onClick={() => goToPendingApproval(row)}
          title="Open in Pending Approvals"
        >
          Pending
        </Badge>
      );
    }

    const { bg, label } = getHierarchyStatusBadge(displayStatus);
    return <Badge bg={bg}>{label}</Badge>;
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      minWidth: "160px",
      wrap: true,
    },
    ...config.parentColumns.map((col) => ({
      name: col.label,
      selector: (row) => col.accessor(row),
      sortable: false,
      minWidth: "140px",
      wrap: true,
    })),
    {
      name: "Description",
      selector: (row) => {
        const desc = row.description || "-";
        return desc.length > 80 ? `${desc.substring(0, 80)}...` : desc;
      },
      sortable: false,
      minWidth: "220px",
      wrap: true,
    },
    {
      name: "Status",
      cell: (row) => renderStatusCell(row),
      sortable: false,
      minWidth: "120px",
      wrap: true,
    },
    {
      name: "Actions",
      minWidth: "120px",
      cell: (row) => (
        <div className="d-flex gap-2 align-items-center">
          {hasPermission(loggedInUser, config.permissionModule, "edit") && (
            <Button
              variant="link"
              className="text-primary p-0"
              onClick={() =>
                navigate(`${config.listRoute}/edit/${row._id}`)
              }
              title={`Edit ${config.label}`}
            >
              <VscEdit size={20} />
            </Button>
          )}
          {hasPermission(loggedInUser, config.permissionModule, "delete") && (
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(row);
                setShowHardDeleteModal(true);
              }}
              title="Delete Permanently"
            >
              <RiDeleteBin5Line size={20} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={config.labelPlural}
        crumbs={[
          { name: "Community Management" },
          { name: config.labelPlural },
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
        {hasPermission(loggedInUser, config.permissionModule, "create") && (
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(`${config.listRoute}/add`)}
          >
            Add {config.label}
          </Button>
        )}
      </div>

      <Collapse in={showFilters}>
        <div>
          <HierarchyEntityFilters
            filterFields={config.formParents}
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
          progressPending={loadingList}
          highlightOnHover
          persistTableHead
          paginationServer
        />
      </MainCard>

      <SimpleConfirmModal
        show={showHardDeleteModal}
        onHide={closeModals}
        onConfirm={async () => {
          if (!selectedRow) return;
          await hardDeleteEntity(selectedRow._id);
          closeModals();
          refreshList();
        }}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedRow?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
      />
    </Container>
  );
};

export function createConnectedHierarchyList(config, actions) {
  const mapStateToProps = (state) => ({
    config,
    entityList: state[config.reduxSlice][config.listStateKey] || {
      data: [],
      count: 0,
    },
    loadingList: state[config.reduxSlice][config.loadingListKey] || false,
    loggedInUser: state.adminAuth.admin,
  });

  return connect(mapStateToProps, {
    fetchList: actions[config.exportNames.list],
    resetComponentStore: actions[config.exportNames.resetStore],
    hardDeleteEntity: actions[config.exportNames.hardDelete],
  })(HierarchyEntityList);
}
