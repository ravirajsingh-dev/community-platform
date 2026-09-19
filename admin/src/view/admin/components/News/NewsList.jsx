import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

// icons
import { RiDeleteBin5Line } from "react-icons/ri";
import { MdEdit } from "react-icons/md";

// custom imports
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";

import {
  getNews,
  resetComponentStore,
  deleteNews,
} from "@src/actions/adminNewsActions";
import NewsSettingsPanel from "./NewsSettingsPanel";

const NewsList = ({
  loggedInUser,
  newsList: { data, count },
  getNews,
  loadingNewsList,
  resetComponentStore,
  sortingParams,
  deleteNews,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [selectedNews, setSelectedNews] = React.useState(null);

  const { page, limit } = sortingParams;

  const initialSortingParams = {
    limit: 10,
    page: 1,
    orderBy: "displayOrder",
    ascending: "asc",
    query: "",
  };

  const [newsParams, setNewsParams] = React.useState(initialSortingParams);

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getNews(newsParams);
  }, [getNews, newsParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = (txnPassword) => {
    if (selectedNews && txnPassword) {
      deleteNews(selectedNews._id, txnPassword);
      setShowModal(false);
      setSelectedNews(null);
    }
  };

  const columns = [
    {
      name: "Title",
      selector: (row) => row.title || "-",
      sortable: false,
      width: "25%",
      wrap: true,
    },
    {
      name: "Description",
      selector: (row) => {
        const desc = row.description || "-";
        return desc.length > 100 ? `${desc.substring(0, 100)}...` : desc;
      },
      sortable: false,
      width: "30%",
      wrap: true,
    },
    {
      name: "Image",
      selector: (row) => {
        const imageCount = Array.isArray(row.images) ? row.images.length : 0;
        const thumb =
          row.imageUrl ||
          (imageCount > 0 ? row.images[0].imageUrl : null);

        return thumb ? (
          <div className="d-flex align-items-center gap-2">
            <img
              src={thumb}
              alt={row.title || "News"}
              className="news-list-thumbnail"
            />
            {imageCount > 1 ? (
              <Badge bg="info">+{imageCount - 1}</Badge>
            ) : null}
          </div>
        ) : (
          <span className="text-muted">No Image</span>
        );
      },
      sortable: false,
      width: "15%",
      wrap: true,
    },
    {
      name: "Display Order",
      selector: (row) => row.displayOrder,
      sortable: true,
      sortField: "displayOrder",
      width: "10%",
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
      width: "10%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {hasPermission(loggedInAdmin, "news", "edit") && (
            <Link
              to={`/admin/news/edit/${row._id}`}
              title="View/Edit News"
              className="text-primary"
            >
              <MdEdit size={20} />
            </Link>
          )}
          {hasPermission(loggedInAdmin, "news", "delete") && (
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={() => {
                setSelectedNews(row);
                setShowModal(true);
              }}
              title="Delete News"
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
      <AppBreadCrumb pageTitle="News" crumbs={[{ name: "News" }]} />

      <NewsSettingsPanel
        canEdit={hasPermission(loggedInAdmin, "news", "edit")}
      />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "news", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/news/add")}
                >
                  Add News
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={newsParams}
          setParams={setNewsParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingNewsList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showModal}
        handleClose={() => {
          setShowModal(false);
          setSelectedNews(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Deletion"
        body={`Are you sure you want to delete this news? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />
    </Container>
  );
};

NewsList.propTypes = {
  getNews: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  newsList: state.news.newsList,
  loadingNewsList: state.news.loadingNewsList,
  sortingParams: state.news.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getNews,
  resetComponentStore,
  deleteNews,
})(NewsList);
