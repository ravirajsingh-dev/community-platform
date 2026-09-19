import React from "react";
import { Button, Row, Col, Container } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { RiDeleteBin5Line } from "react-icons/ri";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";

import {
  getGalleryImages,
  resetComponentStore,
  deleteGalleryImage,
  deleteGalleryImagesBulk,
} from "@src/actions/adminGalleryActions";
import GalleryModal from "./GalleryModal";
import GallerySettingsPanel from "./GallerySettingsPanel";

const GalleryList = ({
  loggedInUser,
  galleryList: { data, count },
  getGalleryImages,
  loadingGalleryList,
  resetComponentStore,
  sortingParams,
  deleteGalleryImage,
  deleteGalleryImagesBulk,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [clearSelectedToggle, setClearSelectedToggle] = React.useState(false);

  const initialSortingParams = {
    limit: 24,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
  };

  const [galleryParams, setGalleryParams] = React.useState(initialSortingParams);

  const columns = [
    {
      name: "Image",
      selector: (row) => (
        <img
          src={row.imageUrl}
          alt="Gallery"
          className="slider-image-preview"
        />
      ),
      sortable: false,
      width: "120px",
      wrap: true,
    },
    {
      name: "Uploaded",
      selector: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleString()
          : "-",
      sortable: true,
      sortField: "createdAt",
      wrap: true,
    },
    {
      name: "Actions",
      width: "120px",
      cell: (row) =>
        hasPermission(loggedInAdmin, "gallery", "delete") ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setSelectedImage(row);
              setShowDeleteModal(true);
            }}
          >
            <RiDeleteBin5Line />
          </Button>
        ) : null,
    },
  ];

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getGalleryImages(galleryParams);
  }, [getGalleryImages, galleryParams, resetComponentStore, loggedInUser]);

  const refreshList = () => {
    getGalleryImages(galleryParams);
  };

  const handleConfirmDeletion = (txnPassword) => {
    if (selectedImage && txnPassword) {
      deleteGalleryImage(selectedImage._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedImage(null);
    }
  };

  const handleConfirmBulkDeletion = (txnPassword) => {
    if (selectedRows.length && txnPassword) {
      const ids = selectedRows.map((row) => row._id);
      deleteGalleryImagesBulk(ids, txnPassword);
      setShowBulkDeleteModal(false);
      setSelectedRows([]);
      setClearSelectedToggle((prev) => !prev);
    }
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    refreshList();
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Our Gallery"
        crumbs={[{ name: "Our Gallery" }]}
      />

      <GallerySettingsPanel
        canEdit={hasPermission(loggedInAdmin, "gallery", "edit")}
      />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between align-items-center g-2">
            <Col md="auto" className="d-flex flex-wrap gap-2">
              {hasPermission(loggedInAdmin, "gallery", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  Add Images
                </Button>
              )}
              {hasPermission(loggedInAdmin, "gallery", "delete") &&
              selectedRows.length > 0 ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  Delete Selected ({selectedRows.length})
                </Button>
              ) : null}
            </Col>
            <Col md="auto" className="text-muted small">
              {count} image{count === 1 ? "" : "s"} total
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={galleryParams}
          setParams={setGalleryParams}
          pagination
          responsive
          striped
          progressPending={loadingGalleryList}
          highlightOnHover
          persistTableHead
          paginationServer
          selectableRows={hasPermission(loggedInAdmin, "gallery", "delete")}
          selectableRowsHighlight
          onSelectedRowsChange={({ selectedRows: nextSelected }) =>
            setSelectedRows(nextSelected)
          }
          clearSelectedRows={clearSelectedToggle}
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedImage(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Deletion"
        body="Are you sure you want to delete this image? This action cannot be undone. Please enter your transaction password to confirm."
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showBulkDeleteModal}
        handleClose={() => setShowBulkDeleteModal(false)}
        handleConfirm={handleConfirmBulkDeletion}
        title="Confirm Bulk Deletion"
        body={`Are you sure you want to delete ${selectedRows.length} selected image(s)? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Selected"
      />

      <GalleryModal
        show={showUploadModal}
        handleClose={handleUploadModalClose}
      />
    </Container>
  );
};

GalleryList.propTypes = {
  getGalleryImages: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  galleryList: state.gallery.galleryList,
  loadingGalleryList: state.gallery.loadingGalleryList,
  sortingParams: state.gallery.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getGalleryImages,
  resetComponentStore,
  deleteGalleryImage,
  deleteGalleryImagesBulk,
})(GalleryList);
