import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col, Card } from "react-bootstrap";
import { useDispatch, connect } from "react-redux";
import CustomSelect from "@src/views/Common/CustomSelect";
import CommunityHierarchySelects from "@src/components/CommunityHierarchySelects";
import { useLocationCascade } from "@src/hooks/useLocationCascade";
import { useMasterDataCascade } from "@src/hooks/useMasterDataCascade";
import {
  isValidMemberIdFormat,
  formatMemberIdInput,
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";
import { validateForm } from "@src/utils/validation";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import Errors from "@src/notifications/Errors";
import { handleNumberInput } from "@src/utils/helper";
import { EducationOptions } from "@src/constants/educationConstants";
import { getUserProfile } from "@src/actions/profileActions";
import { fetchCommunities } from "@src/actions/masterDataActions";
import { resolveCommunityOption } from "@src/utils/communityOption";

const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "remarried", label: "Remarried" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
];

const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const MemberFilters = ({
  filterParams = {},
  onFilterChange,
  errorList = {},
  profile,
  getUserProfile,
}) => {
  const dispatch = useDispatch();

  const [myCommunity, setMyCommunity] = useState(null);

  const [memberId, setMemberId] = useState(filterParams.memberId || "");
  const [name, setName] = useState(filterParams.name || "");
  const [fatherName, setFatherName] = useState(filterParams.fatherName || "");
  const [motherName, setMotherName] = useState(filterParams.motherName || "");
  const [phone, setPhone] = useState(filterParams.phone || "");
  const [email, setEmail] = useState(filterParams.email || "");

  const [stateCode, setStateCode] = useState(filterParams.stateCode || null);
  const [cityId, setCityId] = useState(filterParams.cityId || null);
  const [villageId, setVillageId] = useState(filterParams.villageId || null);

  const [community, setCommunity] = useState(
    filterParams.community || null,
  );
  const [vansh, setVansh] = useState(filterParams.vansh || null);
  const [kul, setKul] = useState(filterParams.kul || null);
  const [khamp, setKhamp] = useState(filterParams.khamp || null);
  const [subKhamp, setSubKhamp] = useState(filterParams.subKhamp || null);
  const [gotra, setGotra] = useState(filterParams.gotra || null);

  useEffect(() => {
    if (!profile) {
      getUserProfile?.();
    }
  }, [profile, getUserProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const option = await resolveCommunityOption(profile, () =>
        dispatch(fetchCommunities()),
      );
      if (cancelled || !option) return;
      setMyCommunity(option);
      setCommunity(option);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, dispatch]);

  const { loadStates, loadCities, loadVillages } = useLocationCascade({
    stateCode,
    cityId,
  });

  const { applyMasterSelectChange } = useMasterDataCascade({
    community,
    vansh,
    kul,
    khamp,
    subKhamp,
    enabled: false,
  });

  const handleHierarchyChange = (field, option) => {
    if (field === "community") return;
    const next = applyMasterSelectChange(field, option, {
      community: community || myCommunity,
      vansh,
      kul,
      khamp,
      subKhamp,
      gotra,
    });
    setCommunity(next.community || myCommunity);
    setVansh(next.vansh);
    setKul(next.kul);
    setKhamp(next.khamp);
    setSubKhamp(next.subKhamp);
    setGotra(next.gotra);
  };

  const handleStateChange = (option) => {
    setStateCode(option);
    setCityId(null);
    setVillageId(null);
  };

  const handleCityChange = (option) => {
    setCityId(option);
    setVillageId(null);
  };

  const [maritalStatus, setMaritalStatus] = useState(
    filterParams.maritalStatus || null,
  );
  const [education, setEducation] = useState(filterParams.education || null);
  const [bloodGroup, setBloodGroup] = useState(filterParams.bloodGroup || null);

  const handleApplyFilters = () => {
    dispatch(removeErrors());

    const formData = {
      memberId: memberId?.trim() || "",
      phone: phone?.trim() || "",
    };
    const validationRules = [];

    if (memberId?.trim()) {
      validationRules.push({
        path: "memberId",
        msg: "Invalid Member ID format. Expected format: 10-digit-phone-2-digit-sequence (e.g., 9876543210-01)",
        validator: (value) => {
          if (!value) return true;
          return isValidMemberIdFormat(value);
        },
      });
    }

    if (phone?.trim()) {
      validationRules.push({
        path: "phone",
        msg: "Phone number must be exactly 10 digits",
        validator: (value) => {
          if (!value) return true;
          const phoneStr = String(value).trim();
          return phoneStr.length === 10 && /^\d{10}$/.test(phoneStr);
        },
      });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length > 0) {
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      return;
    }

    const filters = [];
    const query = {};

    const searchFields = {};
    if (memberId?.trim()) {
      filters.push("search");
      searchFields.memberId = { value: memberId.trim(), type: "String" };
    }
    if (name?.trim()) {
      filters.push("search");
      searchFields.name = { value: name.trim(), type: "String" };
    }
    if (phone?.trim()) {
      filters.push("search");
      searchFields.phone = { value: phone.trim(), type: "String" };
    }
    if (email?.trim()) {
      filters.push("search");
      searchFields.email = { value: email.trim(), type: "String" };
    }

    if (Object.keys(searchFields).length > 0) {
      query.search = searchFields;
    }

    if (fatherName?.trim()) {
      filters.push("userDetails.fatherName");
      query["userDetails.fatherName"] = {
        value: fatherName.trim(),
        type: "String",
      };
    }

    if (motherName?.trim()) {
      filters.push("userDetails.motherName");
      query["userDetails.motherName"] = {
        value: motherName.trim(),
        type: "String",
      };
    }

    if (stateCode) {
      filters.push("userDetails.stateCode");
      query["userDetails.stateCode"] = {
        value: stateCode.value || stateCode,
        type: "string",
      };
    }

    if (cityId) {
      filters.push("userDetails.cityId");
      query["userDetails.cityId"] = {
        value: cityId.value || cityId,
        type: "string",
      };
    }

    if (villageId) {
      filters.push("userDetails.villageId");
      query["userDetails.villageId"] = {
        value: villageId.value || villageId,
        type: "id",
      };
    }

    if (community) {
      filters.push("userDetails.community");
      query["userDetails.community"] = {
        value: community.value || community,
        type: "id",
      };
    } else if (myCommunity) {
      filters.push("userDetails.community");
      query["userDetails.community"] = {
        value: myCommunity.value,
        type: "id",
      };
    }

    if (vansh) {
      filters.push("userDetails.vansh");
      query["userDetails.vansh"] = {
        value: vansh.value || vansh,
        type: "id",
      };
    }

    if (kul) {
      filters.push("userDetails.kul");
      query["userDetails.kul"] = {
        value: kul.value || kul,
        type: "id",
      };
    }

    if (khamp) {
      filters.push("userDetails.khamp");
      query["userDetails.khamp"] = {
        value: khamp.value || khamp,
        type: "id",
      };
    }

    if (subKhamp) {
      filters.push("userDetails.subKhamp");
      query["userDetails.subKhamp"] = {
        value: subKhamp.value || subKhamp,
        type: "id",
      };
    }

    if (gotra) {
      filters.push("userDetails.gotra");
      query["userDetails.gotra"] = {
        value: gotra.value || gotra,
        type: "id",
      };
    }

    if (maritalStatus) {
      filters.push("userDetails.maritalStatus");
      query["userDetails.maritalStatus"] = {
        value: maritalStatus.value || maritalStatus,
        type: "String",
      };
    }

    if (education) {
      filters.push("userDetails.education");
      query["userDetails.education"] = {
        value: education.value || education,
        type: "String",
      };
    }

    if (bloodGroup) {
      filters.push("userDetails.bloodGroup");
      query["userDetails.bloodGroup"] = {
        value: bloodGroup.value || bloodGroup,
        type: "String",
      };
    }

    if (onFilterChange) {
      onFilterChange({
        filters: [...new Set(filters)],
        query,
        memberId: memberId || null,
        name: name || null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        phone: phone || null,
        email: email || null,
        stateCode: stateCode || null,
        cityId: cityId || null,
        villageId: villageId || null,
        community: community || null,
        vansh: vansh || null,
        kul: kul || null,
        khamp: khamp || null,
        subKhamp: subKhamp || null,
        gotra: gotra || null,
        maritalStatus: maritalStatus || null,
        education: education || null,
        bloodGroup: bloodGroup || null,
      });
    }
  };

  const handleResetFilters = () => {
    dispatch(removeErrors());

    setMemberId("");
    setName("");
    setFatherName("");
    setMotherName("");
    setPhone("");
    setEmail("");
    setStateCode(null);
    setCityId(null);
    setVillageId(null);
    setCommunity(myCommunity || null);
    setVansh(null);
    setKul(null);
    setKhamp(null);
    setSubKhamp(null);
    setGotra(null);
    setMaritalStatus(null);
    setEducation(null);
    setBloodGroup(null);

    if (onFilterChange) {
      const resetFilters = [];
      const resetQuery = {};
      if (myCommunity?.value) {
        resetFilters.push("userDetails.community");
        resetQuery["userDetails.community"] = {
          value: myCommunity.value,
          type: "id",
        };
      }
      onFilterChange({
        filters: resetFilters,
        query: resetQuery,
        memberId: null,
        name: null,
        fatherName: null,
        motherName: null,
        phone: null,
        email: null,
        stateCode: null,
        cityId: null,
        villageId: null,
        community: myCommunity || null,
        vansh: null,
        kul: null,
        khamp: null,
        subKhamp: null,
        gotra: null,
        maritalStatus: null,
        education: null,
        bloodGroup: null,
      });
    }
  };

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col xs={12}>
            <h6 className="text-muted mb-2">Text Search</h6>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Member ID</Form.Label>
              <Form.Control
                type="text"
                value={formatMemberIdInput(memberId)}
                onChange={createMemberIdChangeHandler((e) => {
                  setMemberId(e.target.value);
                  if (errorList?.memberId) {
                    dispatch(removeErrors());
                  }
                }, "memberId")}
                onPaste={createMemberIdPasteHandler()}
                onKeyDown={createMemberIdKeyDownHandler(
                  memberId,
                  (e) => {
                    setMemberId(e.target.value);
                    if (errorList?.memberId) {
                      dispatch(removeErrors());
                    }
                  },
                  "memberId",
                )}
                placeholder="Enter Member ID (9999999999-01)"
                className={errorList?.memberId ? "form-input-invalid" : ""}
                maxLength={13}
              />
              <Errors current_key="memberId" />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Name"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Father Name</Form.Label>
              <Form.Control
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="Enter Father Name"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Mother Name</Form.Label>
              <Form.Control
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="Enter Mother Name"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errorList?.phone) {
                    dispatch(removeErrors());
                  }
                }}
                onKeyDown={handleNumberInput}
                placeholder="Enter Phone"
                maxLength="10"
                minLength="10"
                inputMode="numeric"
                pattern="[0-9]*"
                className={errorList?.phone ? "form-input-invalid" : ""}
              />
              <Errors current_key="phone" />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
              />
            </Form.Group>
          </Col>

          <Col xs={12} className="mt-1">
            <h6 className="text-muted mb-2">Location Filters</h6>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>State</Form.Label>
              <CustomSelect
                value={stateCode}
                onChange={handleStateChange}
                loadOptions={loadStates}
                placeholder="Select State"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>City</Form.Label>
              <CustomSelect
                value={cityId}
                onChange={handleCityChange}
                loadOptions={loadCities}
                isDisabled={!stateCode}
                placeholder="Select city"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Village</Form.Label>
              <CustomSelect
                value={villageId}
                onChange={setVillageId}
                loadOptions={loadVillages}
                isDisabled={!cityId}
                placeholder="Select Village"
              />
            </Form.Group>
          </Col>

          <Col xs={12} className="mt-1">
            <h6 className="text-muted mb-2">Master Data Filters</h6>
          </Col>
          <Col xs={12}>
            <CommunityHierarchySelects
              values={{
                community: community || myCommunity,
                vansh,
                kul,
                khamp,
                subKhamp,
                gotra,
              }}
              onSelectChange={handleHierarchyChange}
              variant="filter"
              disabledFields={["community"]}
              colProps={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            />
          </Col>

          <Col xs={12} className="mt-1">
            <h6 className="text-muted mb-2">Other Filters</h6>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Marital Status</Form.Label>
              <CustomSelect
                value={maritalStatus}
                onChange={setMaritalStatus}
                loadOptions={() =>
                  Promise.resolve({ data: MARITAL_STATUS_OPTIONS })
                }
                placeholder="Select Marital Status"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Education</Form.Label>
              <CustomSelect
                value={education}
                onChange={setEducation}
                loadOptions={() => Promise.resolve({ data: EducationOptions })}
                placeholder="Select Education"
              />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Blood Group</Form.Label>
              <CustomSelect
                value={bloodGroup}
                onChange={setBloodGroup}
                loadOptions={() =>
                  Promise.resolve({ data: BLOOD_GROUP_OPTIONS })
                }
                placeholder="Select Blood Group"
              />
            </Form.Group>
          </Col>

          <Col xs={12} className="d-flex justify-content-end gap-2 mt-3">
            <Button
              type="button"
              className="btn btn--outline"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="btn btn--theme btn--disabled-theme"
              onClick={handleApplyFilters}
            >
              Search
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  profile: state.profile?.profile || null,
});

export default connect(mapStateToProps, { getUserProfile })(MemberFilters);
