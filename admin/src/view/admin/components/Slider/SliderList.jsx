import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

// icons
import { RiDeleteBin5Line, RiEditLine } from "react-icons/ri";

// custom imports
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";

import {
  getSliderBanners,
  resetComponentStore,
  deleteSliderBanner,
} from "@src/actions/adminSliderActions";
import SliderModal from "./SliderModal";
import HeroSettingsPanel from "./HeroSettingsPanel";

const SliderList = ({
  loggedInUser,
  sliderList: { data, count, nextOrder = 1 },
  getSliderBanners,
  loadingSliderList,
  resetComponentStore,
  sortingParams,
  deleteSliderBanner,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedSlider, setSelectedSlider] = React.useState(null);

  const { page, limit } = sortingParams;

  const initialSortingParams = {
    limit: 10,
    page: 1,
    orderBy: "order",
    ascending: "asc",
    query: "",
  };

  const [sliderParams, setSliderParams] = React.useState(initialSortingParams);

  const columns = [
    {
      name: "Image",
      selector: (row) => (
        <img
          src={row.imageUrl}
          alt={row.title || "Slider"}
          className="slider-image-preview"
        />
      ),
      sortable: false,
      width: "15%",
      wrap: true,
    },
    {
      name: "Title",
      selector: (row) => row.title || "-",
      sortable: false,
      width: "30%",
      wrap: true,
    },
    {
      name: "Order",
      selector: (row) => row.order,
      sortable: true,
      sortField: "order",
      width: "15%",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => (
        <Badge bg={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      sortable: false,
      width: "10%",
      wrap: true,
    },
    {
      name: "Actions",
      width: "20%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {hasPermission(loggedInAdmin, "slider", "edit") && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedSlider(row);
                setShowEditModal(true);
              }}
            >
              <RiEditLine />
            </Button>
          )}
          {hasPermission(loggedInAdmin, "slider", "delete") && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setSelectedSlider(row);
                setShowModal(true);
              }}
            >
              <RiDeleteBin5Line />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getSliderBanners(sliderParams);
  }, [getSliderBanners, sliderParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = (txnPassword) => {
    if (selectedSlider && txnPassword) {
      deleteSliderBanner(selectedSlider._id, txnPassword);
      setShowModal(false);
      setSelectedSlider(null);
    }
  };

  const handleCreateSliderClick = (e) => {
    e.preventDefault();
    setSelectedSlider(null);
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    setSelectedSlider(null);
    // Refresh list
    getSliderBanners(sliderParams);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Slider Banners"
        crumbs={[{ name: "Slider Banners" }]}
      />

      {hasPermission(loggedInAdmin, "slider", "list") && (
        <HeroSettingsPanel canEdit={hasPermission(loggedInAdmin, "slider", "edit")} />
      )}

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "slider", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateSliderClick}
                >
                  Add Slider Banner
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={sliderParams}
          setParams={setSliderParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingSliderList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showModal}
        handleClose={() => {
          setShowModal(false);
          setSelectedSlider(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Deletion"
        body={`Are you sure you want to delete this slider banner? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <SliderModal
        show={showEditModal}
        handleClose={handleModalClose}
        slider={selectedSlider}
        nextOrder={nextOrder}
      />
    </Container>
  );
};

SliderList.propTypes = {
  getSliderBanners: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  sliderList: state.slider.sliderList,
  loadingSliderList: state.slider.loadingSliderList,
  sortingParams: state.slider.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getSliderBanners,
  resetComponentStore,
  deleteSliderBanner,
})(SliderList);

