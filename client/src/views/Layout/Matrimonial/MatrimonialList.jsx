import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Badge,
  Form,
} from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaHeart,
  FaArrowLeft,
  FaFilter,
  FaSearch,
  FaUser,
} from "react-icons/fa";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/views/Common/NoRecordsFound/NoRecordsFound";
import CustomSelect from "@src/views/Common/CustomSelect";
import CommunityHierarchySelects from "@src/components/CommunityHierarchySelects";
import { getMatrimonialList } from "@src/actions/matrimonialActions";
import { getUserProfile } from "@src/actions/profileActions";
import { fetchCommunities } from "@src/actions/masterDataActions";
import { INDIA_ISO2 } from "@src/utils/locationData";
import { useLocationCascade } from "@src/hooks/useLocationCascade";
import { useMasterDataCascade } from "@src/hooks/useMasterDataCascade";
import { resolveCommunityOption } from "@src/utils/communityOption";
import { EducationOptions, formatEducationLabels } from "@src/constants/educationConstants";
import {
  GenderFilterOptions,
  MaritalStatusFilterOptions,
  getOptionByValue,
} from "@src/constants/CustomSelectValues";

const EDUCATION_FILTER_OPTIONS = [
  { value: "", label: "Any" },
  ...EducationOptions,
];

const detailsFrom = (item) => {
  const ud = item.userDetails || item.userDetailsId || {};
  return {
    fatherName: ud.fatherName ?? "-",
    motherName: ud.motherName ?? "-",
    education: formatEducationLabels(ud.education) || "-",
    occupation: ud.occupation ?? "-",
    maritalStatus: ud.maritalStatus ?? "-",
    gender: ud.gender ?? "-",
    dob: ud.dob,
    community: item.community?.name ?? ud.community?.name ?? "-",
  };
};

const MatrimonialList = ({
  list,
  listPagination,
  loadingList,
  getMatrimonialList,
  userProfile,
  getUserProfile,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 12;
  const [stateCode, setStateCode] = useState(null);
  const [cityId, setCityId] = useState(null);
  const [villageId, setVillageId] = useState(null);
  const [myCommunity, setMyCommunity] = useState(null);

  const [hierarchy, setHierarchy] = useState({
    community: null,
    vansh: null,
    kul: null,
    khamp: null,
    subKhamp: null,
    gotra: null,
  });

  useEffect(() => {
    if (!userProfile) {
      getUserProfile?.();
    }
  }, [userProfile, getUserProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const option = await resolveCommunityOption(userProfile, () =>
        dispatch(fetchCommunities()),
      );
      if (cancelled || !option) return;
      setMyCommunity(option);
      setHierarchy((prev) => ({
        ...prev,
        community: option,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [userProfile, dispatch]);

  const { loadStates, loadCities, loadVillages } = useLocationCascade({
    stateCode,
    cityId,
  });
  const { applyMasterSelectChange } = useMasterDataCascade({
    ...hierarchy,
    enabled: false,
  });

  const handleStateChange = (option) => {
    setStateCode(option);
    setCityId(null);
    setVillageId(null);
  };

  const handleCityChange = (option) => {
    setCityId(option);
    setVillageId(null);
  };

  const [filters, setFilters] = useState({
    gender: "",
    maritalStatus: "",
    education: "",
    occupation: "",
    ageMin: "",
    ageMax: "",
    search: "",
  });

  const buildListParams = (p, f, hierarchyValues) => {
    const params = {
      page: p ?? page,
      limit,
      ...(f ?? filters),
      vanshId: hierarchyValues?.vansh?.value || undefined,
      kulId: hierarchyValues?.kul?.value || undefined,
      khampId: hierarchyValues?.khamp?.value || undefined,
      subKhampId: hierarchyValues?.subKhamp?.value || undefined,
      gotraId: hierarchyValues?.gotra?.value || undefined,
      countryCode: INDIA_ISO2,
      stateCode: stateCode?.value || undefined,
      cityId: cityId?.value || undefined,
      villageId: villageId?.value || undefined,
    };
    Object.keys(params).forEach((k) => {
      if (params[k] === "" || params[k] == null) delete params[k];
    });
    return params;
  };

  const fetchList = (p, f) => {
    getMatrimonialList(buildListParams(p, f, hierarchy));
  };

  useEffect(() => {
    fetchList();
  }, [page]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleHierarchyChange = (field, option) => {
    if (field === "community") return;
    setHierarchy((prev) => {
      const next = applyMasterSelectChange(field, option, {
        ...prev,
        community: prev.community || myCommunity,
      });
      return { ...next, community: next.community || myCommunity };
    });
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
    fetchList(1, filters);
  };

  const total = listPagination?.total ?? 0;
  const pages = listPagination?.pages ?? 0;
  const hasMore = page < pages;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FaHeart className="me-2" />
          Matrimonial Profiles
        </h2>
        <Button
          variant="outline-secondary"
          onClick={() => navigate("/user/matrimonial")}
        >
          <FaArrowLeft className="me-2" />
          Back
        </Button>
      </div>

      <p className="text-muted mb-3">
        Browse profiles from your community only. Use filters to narrow down.
      </p>

      <MainCard variant="panel" className="mb-4">
        <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
            <Form.Group>
              <Form.Label className="small">
                Search (name / email / phone / Member ID)
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </Form.Group>
            <Button
              variant="outline-primary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter className="me-2" />
              {showFilters ? "Hide filters" : "More filters"}
            </Button>
            <Button variant="primary" onClick={handleSearch}>
              <FaSearch className="me-2" />
              Search
            </Button>
          </div>

          {showFilters && (
            <Row className="g-2 mt-2 pt-3 border-top">
              <Col md={6} lg={2}>
                <Form.Label className="small">Gender</Form.Label>
                <CustomSelect
                  options={GenderFilterOptions}
                  value={getOptionByValue(GenderFilterOptions, filters.gender)}
                  onChange={(option) =>
                    handleFilterChange("gender", option?.value ?? "")
                  }
                  placeholder="Any"
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Marital status</Form.Label>
                <CustomSelect
                  options={MaritalStatusFilterOptions}
                  value={getOptionByValue(
                    MaritalStatusFilterOptions,
                    filters.maritalStatus,
                  )}
                  onChange={(option) =>
                    handleFilterChange("maritalStatus", option?.value ?? "")
                  }
                  placeholder="Any"
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Education</Form.Label>
                <CustomSelect
                  options={EDUCATION_FILTER_OPTIONS}
                  value={getOptionByValue(
                    EDUCATION_FILTER_OPTIONS,
                    filters.education,
                  )}
                  onChange={(option) =>
                    handleFilterChange("education", option?.value ?? "")
                  }
                  placeholder="Any"
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Occupation</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Any"
                  value={filters.occupation}
                  onChange={(e) =>
                    handleFilterChange("occupation", e.target.value)
                  }
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Age from</Form.Label>
                <Form.Control
                  type="number"
                  min={18}
                  max={100}
                  placeholder="18"
                  value={filters.ageMin}
                  onChange={(e) => handleFilterChange("ageMin", e.target.value)}
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Age to</Form.Label>
                <Form.Control
                  type="number"
                  min={18}
                  max={100}
                  placeholder="60"
                  value={filters.ageMax}
                  onChange={(e) => handleFilterChange("ageMax", e.target.value)}
                />
              </Col>
              <Col xs={12} className="mt-2">
                <h6 className="text-muted small mb-2">Location</h6>
              </Col>
              <Col md={6} lg={3}>
                <Form.Label className="small">State</Form.Label>
                <CustomSelect
                  value={stateCode}
                  onChange={handleStateChange}
                  loadOptions={loadStates}
                  placeholder="Any"
                />
              </Col>
              <Col md={6} lg={3}>
                <Form.Label className="small">City</Form.Label>
                <CustomSelect
                  value={cityId}
                  onChange={handleCityChange}
                  loadOptions={loadCities}
                  isDisabled={!stateCode}
                  placeholder="Any"
                />
              </Col>
              <Col md={6} lg={3}>
                <Form.Label className="small">Village</Form.Label>
                <CustomSelect
                  value={villageId}
                  onChange={setVillageId}
                  loadOptions={loadVillages}
                  isDisabled={!cityId}
                  placeholder="Any"
                />
              </Col>
              <Col xs={12} className="mt-2">
                <h6 className="text-muted small mb-2">Community hierarchy</h6>
              </Col>
              <Col xs={12}>
                <CommunityHierarchySelects
                  values={{
                    ...hierarchy,
                    community: hierarchy.community || myCommunity,
                  }}
                  onSelectChange={handleHierarchyChange}
                  variant="filter"
                  disabledFields={["community"]}
                  colProps={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                />
              </Col>
            </Row>
          )}
      </MainCard>

      {loadingList && list.length === 0 ? (
        <BouncingLoader minHeight="400px" />
      ) : list.length === 0 ? (
        <NoRecordsFound
          title="No matrimonial profiles found in your community. Try changing filters."
          compact
        />
      ) : (
        <>
          <Row>
            {list.map((m) => {
              const user = m.user || m.userId || {};
              const d = detailsFrom(m);
              const name = user.name ?? "-";
              const memberId = user.memberId ?? "-";
              const age = d.dob
                ? Math.floor(
                    (new Date() - new Date(d.dob)) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  )
                : null;
              return (
                <Col key={m._id} md={6} lg={4} className="mb-4">
                  <MainCard variant="panel">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="mb-0">{name}</h5>
                        {age != null && <Badge bg="secondary">{age} yrs</Badge>}
                      </div>
                      <p className="text-muted small mb-1">
                        Member ID: {memberId}
                      </p>
                      <p className="small mb-1">
                        <strong>Community:</strong> {d.community}
                      </p>
                      <p className="small mb-1">
                        <strong>Father:</strong> {d.fatherName}
                      </p>
                      <p className="small mb-1">
                        <strong>Mother:</strong> {d.motherName}
                      </p>
                      <p className="small mb-1">
                        <strong>Education:</strong> {d.education}
                      </p>
                      <p className="small mb-1">
                        <strong>Occupation:</strong> {d.occupation}
                      </p>
                      <p className="small mb-3">
                        <strong>Marital:</strong> {d.maritalStatus}
                      </p>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          navigate(`/user/matrimonial/profile/${m._id}`)
                        }
                      >
                        <FaUser className="me-2" />
                        View full profile
                      </Button>
                  </MainCard>
                </Col>
              );
            })}
          </Row>
          {pages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Page {page} of {pages} ({total} total)
              </span>
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="ms-2"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

MatrimonialList.propTypes = {
  list: PropTypes.array,
  listPagination: PropTypes.object,
  loadingList: PropTypes.bool,
  getMatrimonialList: PropTypes.func.isRequired,
  userProfile: PropTypes.object,
  getUserProfile: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  list: state.matrimonial?.list ?? [],
  listPagination: state.matrimonial?.listPagination ?? {},
  loadingList: state.matrimonial?.loadingList ?? false,
  userProfile: state.profile?.profile ?? null,
});

export default connect(mapStateToProps, {
  getMatrimonialList,
  getUserProfile,
})(MatrimonialList);
