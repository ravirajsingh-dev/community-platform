import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import { RiDeleteBin5Line } from "react-icons/ri";
import { VscEdit } from "react-icons/vsc";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import SimpleConfirmModal from "../../modals/SimpleConfirmModal";
import { hasPermission } from "@src/utils/permissions";

import {
  getVillages,
  resetComponentStore,
  hardDeleteVillage,
  approveVillage,
  rejectVillage,
} from "@src/actions/adminVillageActions";

const VillageList = ({
  loggedInUser,
  villageList: { data, count },
  getVillages,
  loadingVillagesList,
  hardDeleteVillage,
  approveVillage,
  rejectVillage,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedVillage, setSelectedVillage] = React.useState(null);

  const initialSortingParams = {
    limit: 10,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    search: "",
  };

  const [villageParams, setVillageParams] = React.useState(initialSortingParams);

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getVillages(villageParams);
  }, [getVillages, villageParams, resetComponentStore, loggedInUser]);

  const refreshList = () => {
    getVillages(villageParams);
  };

  const closeModals = () => {
    setShowHardDeleteModal(false);
    setShowApproveModal(false);
    setShowRejectModal(false);
    setSelectedVillage(null);
  };

  const handleConfirmHardDeletion = async () => {
    if (!selectedVillage) return;
    await hardDeleteVillage(selectedVillage._id);
    closeModals();
    refreshList();
  };

  const handleConfirmApprove = async () => {
    if (!selectedVillage) return;
    await approveVillage(selectedVillage._id);
    closeModals();
    refreshList();
  };

  const handleConfirmReject = async () => {
    if (!selectedVillage) return;
    await rejectVillage(selectedVillage._id);
    closeModals();
    refreshList();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge bg="success">Active</Badge>;
      case "inactive":
        return <Badge bg="secondary">Inactive</Badge>;
      case "pending":
        return <Badge bg="warning">Pending</Badge>;
      case "rejected":
        return <Badge bg="danger">Rejected</Badge>;
      default:
        return <Badge bg="secondary">{status || "Unknown"}</Badge>;
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "30%",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => getStatusBadge(row.status),
      sortable: false,
      width: "20%",
      wrap: true,
    },
    {
      name: "City",
      selector: (row) => {
        if (row.cityName && row.stateCode) {
          return `${row.cityName} (${row.stateCode})`;
        }
        if (row.cityName) return row.cityName;
        return "-";
      },
      sortable: false,
      width: "20%",
    },
    {
      name: "Actions",
      width: "25%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {row.status === "pending" && hasPermission(loggedInAdmin, "villages", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => {
                  setSelectedVillage(row);
                  setShowApproveModal(true);
                }}
                title="Approve Village"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => {
                  setSelectedVillage(row);
                  setShowRejectModal(true);
                }}
                title="Reject Village"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "villages", "edit") && (
            <Button
              variant="link"
              className="text-primary p-0"
              onClick={() => navigate(`/admin/villages/edit/${row._id}`)}
              title="Edit Village"
            >
              <VscEdit size={20} />
            </Button>
          )}
          {hasPermission(loggedInAdmin, "villages", "delete") && (
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedVillage(row);
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
      <AppBreadCrumb pageTitle="Villages" crumbs={[{ name: "Villages" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "villages", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/villages/add")}
                >
                  Add Village
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={villageParams}
          setParams={setVillageParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingVillagesList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <SimpleConfirmModal
        show={showHardDeleteModal}
        onHide={closeModals}
        onConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedVillage?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmClassName="btn btn--theme"
      />

      <SimpleConfirmModal
        show={showApproveModal}
        onHide={closeModals}
        onConfirm={handleConfirmApprove}
        title="Approve Village"
        body={`Are you sure you want to approve "${selectedVillage?.name}"? This will set its status to active.`}
        confirmLabel="Approve"
        confirmClassName="btn btn--theme"
      />

      <SimpleConfirmModal
        show={showRejectModal}
        onHide={closeModals}
        onConfirm={handleConfirmReject}
        title="Reject Village"
        body={`Are you sure you want to reject "${selectedVillage?.name}"? This will set its status to rejected.`}
        confirmLabel="Reject"
        confirmClassName="btn btn--theme"
      />
    </Container>
  );
};

VillageList.propTypes = {
  getVillages: PropTypes.func.isRequired,
};

const mapVillageToProps = (village) => ({
  villageList: village.village.villageList || { data: [], count: 0 },
  loadingVillagesList: village.village.loadingVillagesList || false,
  sortingParams: village.village.sortingParams,
  loggedInUser: village.adminAuth.admin,
});

export default connect(mapVillageToProps, {
  getVillages,
  resetComponentStore,
  hardDeleteVillage,
  approveVillage,
  rejectVillage,
})(VillageList);
