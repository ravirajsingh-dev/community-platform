import React, { useState, useEffect } from "react";
import { Button, Card, Collapse, Container } from "react-bootstrap";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { MdOutlinePageview } from "react-icons/md";

import { getMembersList } from "@src/actions/searchMemberActions";
import { resetSearchMember } from "@src/reducers/searchMemberReducer";
import CustomDataTable from "@src/views/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MemberFilters from "./MemberFilters";
import { DEFAULT_PAGE_SIZE } from "@src/constants/index";

const SearchMember = ({
  getMembersList,
  membersList,
  count,
  loadingMembersList,
  resetComponentStore,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [userParams, setUserParams] = useState({
    limit: DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    filters: [],
    query: {},
  });

  const [onlyOnce, setOnce] = useState(true);

  useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }
  }, [resetComponentStore, onlyOnce]);

  useEffect(() => {
    if (!onlyOnce) {
      getMembersList(userParams);
    }
  }, [getMembersList, userParams, onlyOnce]);

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      sortable: true,
      sortField: "memberId",
      width: "130px",
      wrap: true,
    },
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "180px",
      wrap: true,
    },
    {
      name: "Father Name",
      selector: (row) => row.userDetails?.fatherName || "-",
      sortable: false,
      width: "180px",
      wrap: true,
    },
    {
      name: "Verified",
      selector: (row) => (row.isVerified ? "Verified" : "Not Verified"),
      sortable: true,
      sortField: "isVerified",
      width: "160px",
      wrap: true,
      cell: (row) => (
        <div className="d-flex align-items-center gap-2">
          {row.isVerified ? (
            <>
              <FaCheckCircle className="member-status--verified" size={18} />
              <span className="member-status--verified fw-semibold">
                Verified
              </span>
            </>
          ) : (
            <>
              <FaTimesCircle className="member-status--unverified" size={18} />
              <span className="member-status--unverified fw-semibold">
                Not Verified
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      name: "View",
      width: "90px",
      cell: (row) => (
        <div className="d-flex gap-2 align-items-center justify-content-center">
          <Link
            to={`/user/member-details/${row._id}`}
            title="View Details"
            aria-label={`View details for ${row.name || "member"}`}
            className="btn btn-sm btn--outline d-inline-flex align-items-center gap-1"
          >
            <MdOutlinePageview size={20} />
          </Link>
        </div>
      ),
    },
  ];

  const onFilterChange = (newParams) => {
    setUserParams((params) => ({
      ...params,
      ...newParams,
      page: 1,
    }));
  };

  return (
    <Container className="search-member-page py-3">
      <AppBreadCrumb crumbs={[{ name: "Search Member" }]} />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
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
          <MemberFilters
            filterParams={userParams}
            onFilterChange={onFilterChange}
          />
        </div>
      </Collapse>

      <Card className="common-panel-card">
        <Card.Body>
          {count > 0 && (
            <p className="text-muted mb-3">Total Members: {count}</p>
          )}
          <CustomDataTable
            columns={columns}
            data={membersList}
            count={count}
            params={userParams}
            setParams={setUserParams}
            pagination
            responsive
            striped
            progressPending={loadingMembersList}
            highlightOnHover
            persistTableHead
            paginationServer
          />
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  membersList: state.searchMember.membersList,
  count: state.searchMember.count,
  loadingMembersList: state.searchMember.loadingMembersList,
});

const mapDispatchToProps = (dispatch) => ({
  getMembersList: (params) => dispatch(getMembersList(params)),
  resetComponentStore: () => dispatch(resetSearchMember()),
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchMember);
