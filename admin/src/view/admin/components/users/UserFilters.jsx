import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import MemberIdInput from "@src/components/common/MemberIdInput";
import {
  UserStatuses,
  MaritalStatusOptions,
  BloodGroupOptions,
  EducationOptions,
  getStatusOptionByValue,
  getOptionByValue,
} from "@src/constants/CustomSelectValues";
import {
  isValidEmail,
  isValidName,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
} from "@src/utils/inputValidation";
import { useLocationCascade } from "@src/hooks/useLocationCascade";
import { useMasterDataCascade } from "./editUser/hooks/useMasterDataCascade";
import {
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchSubKhamps,
  fetchGotras,
} from "@actions/masterDataDropdownActions";
import { getMembershipPlans } from "@src/actions/adminMembershipPlanActions";

const BOOLEAN_FILTER_OPTIONS = [
  { label: "Yes", value: "1" },
  { label: "No", value: "0" },
];

const formatPlanOptionLabel = (plan) => {
  if (!plan?.name) return "";
  return plan.price != null ? `${plan.name} (₹${plan.price})` : plan.name;
};

const UserFilters = ({ values, onChange, onSearch, onReset }) => {
  const dispatch = useDispatch();
  const masterDataDropdown = useSelector((state) => state.masterDataDropdown);
  const membershipPlans = useSelector(
    (state) => state.adminMembershipPlan.membershipPlans?.data || [],
  );

  useEffect(() => {
    dispatch(fetchCommunities());
    dispatch(getMembershipPlans({ limit: 100, page: 1 }));
  }, [dispatch]);

  const {
    stateOptions,
    cityOptions,
    villageOptions,
    loadingStates,
    loadingCities,
    loadingVillages,
    applyLocationSelectChange,
  } = useLocationCascade({
    stateCode: values.stateCode,
    cityId: values.cityId,
    prefetchStates: true,
    fetchVillagesEnabled: true,
  });

  const { applyMasterSelectChange } = useMasterDataCascade({
    community: values.community,
    vansh: values.vansh,
    kul: values.kul,
    khamp: values.khamp,
    fetchVanshes: (id) => dispatch(fetchVanshes(id)),
    fetchKuls: (id) => dispatch(fetchKuls(id)),
    fetchKhamps: (id) => dispatch(fetchKhamps(id)),
    fetchSubKhamps: (id) => dispatch(fetchSubKhamps(id)),
    fetchGotras: (id) => dispatch(fetchGotras(id)),
    enabled: true,
  });

  const planOptions = useMemo(
    () =>
      membershipPlans.map((plan) => ({
        label: formatPlanOptionLabel(plan),
        value: String(plan._id),
      })),
    [membershipPlans],
  );

  const loadStatusOptions = useCallback(() => UserStatuses, []);
  const loadMaritalOptions = useCallback(() => MaritalStatusOptions, []);
  const loadEducationOptions = useCallback(() => EducationOptions, []);
  const loadBloodGroupOptions = useCallback(() => BloodGroupOptions, []);
  const loadBooleanOptions = useCallback(() => BOOLEAN_FILTER_OPTIONS, []);

  const setField = (name, value) => {
    onChange({ target: { name, value } });
  };

  const patchFields = (patch) => {
    onChange(patch);
  };

  const handleNameChange = (e) => {
    setField("name", sanitizeName(e.target.value));
  };

  const handleFatherNameChange = (e) => {
    setField("fatherName", sanitizeName(e.target.value));
  };

  const handleMotherNameChange = (e) => {
    setField("motherName", sanitizeName(e.target.value));
  };

  const handlePhoneChange = (e) => {
    setField("phone", sanitizePhone(e.target.value));
  };

  const handleEmailChange = (e) => {
    setField("email", sanitizeEmail(e.target.value));
  };

  const handleLocationChange = (name, option) => {
    const next = applyLocationSelectChange(name, option, values);
    patchFields({
      stateCode: next.stateCode,
      cityId: next.cityId,
      villageId: next.villageId,
    });
  };

  const handleMasterChange = (name, option) => {
    const next = applyMasterSelectChange(name, option, values);
    patchFields({
      community: next.community,
      vansh: next.vansh,
      kul: next.kul,
      khamp: next.khamp,
      subKhamp: next.subKhamp,
      gotra: next.gotra,
    });
  };

  const filterErrors = useMemo(() => {
    const errors = {};
    if (values.name?.trim() && !isValidName(values.name)) {
      errors.name = "Name must be 3-50 characters and in valid format.";
    }
    if (
      values.phone?.trim() &&
      values.phone.trim().length > 0 &&
      values.phone.trim().length < 10
    ) {
      errors.phone = "Phone must be exactly 10 digits.";
    }
    if (values.email?.trim() && !isValidEmail(values.email)) {
      errors.email = "Please enter a valid email format.";
    }
    if (values.fromDate && values.toDate && values.fromDate > values.toDate) {
      errors.toDate = "To Date must be greater than or equal to From Date.";
    }
    return errors;
  }, [values]);

  const isFilterValid = Object.keys(filterErrors).length === 0;

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-start">
          <Col xs={12}>
            <h6 className="text-muted mb-0">Text Search</h6>
          </Col>
          <Col md={6} lg={4}>
            <MemberIdInput
              id="memberId"
              name="memberId"
              value={values.memberId}
              onChange={onChange}
            />
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                name="name"
                value={values.name}
                onChange={handleNameChange}
                placeholder="Filter by name"
                maxLength={50}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.name ? (
                  <Form.Text className="form-error-message">
                    {filterErrors.name}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="fatherName">
              <Form.Label>Father Name</Form.Label>
              <Form.Control
                name="fatherName"
                value={values.fatherName}
                onChange={handleFatherNameChange}
                placeholder="Filter by father name"
                maxLength={100}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.fatherName ? (
                  <Form.Text className="form-error-message">
                    {filterErrors.fatherName}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="motherName">
              <Form.Label>Mother Name</Form.Label>
              <Form.Control
                name="motherName"
                value={values.motherName}
                onChange={handleMotherNameChange}
                placeholder="Filter by mother name"
                maxLength={100}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.motherName ? (
                  <Form.Text className="form-error-message">
                    {filterErrors.motherName}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="phone">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                name="phone"
                value={values.phone}
                onChange={handlePhoneChange}
                placeholder="Filter by phone"
                inputMode="numeric"
                maxLength={10}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.phone ? (
                  <Form.Text className="form-error-message">
                    {filterErrors.phone}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="email"
                value={values.email}
                onChange={handleEmailChange}
                placeholder="Filter by email"
                type="email"
                maxLength={254}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.email ? (
                  <Form.Text className="form-error-message">
                    {filterErrors.email}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>

          <Col xs={12} className="mt-1">
            <h6 className="text-muted mb-0">Account & Membership</h6>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="status">
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getStatusOptionByValue(values.status)}
                onChange={(option) => setField("status", option?.value ?? "")}
                loadOptions={loadStatusOptions}
                placeholder="All statuses"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="membershipPlanId">
              <Form.Label>Membership Plan</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.membershipPlanId}
                onChange={(option) => setField("membershipPlanId", option)}
                options={planOptions}
                placeholder="All plans"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="isPaid">
              <Form.Label>Membership Paid</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getOptionByValue(BOOLEAN_FILTER_OPTIONS, values.isPaid)}
                onChange={(option) => setField("isPaid", option?.value ?? "")}
                loadOptions={loadBooleanOptions}
                placeholder="All"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="isLifetimePaid">
              <Form.Label>Lifetime Membership</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getOptionByValue(
                  BOOLEAN_FILTER_OPTIONS,
                  values.isLifetimePaid,
                )}
                onChange={(option) =>
                  setField("isLifetimePaid", option?.value ?? "")
                }
                loadOptions={loadBooleanOptions}
                placeholder="All"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="fromDate">
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                name="fromDate"
                value={values.fromDate}
                onChange={onChange}
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="toDate">
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                name="toDate"
                value={values.toDate}
                onChange={onChange}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.toDate ? (
                  <Form.Text className="form-error-message">
                    {filterErrors.toDate}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>

          <Col xs={12} className="mt-1">
            <h6 className="text-muted mb-0">Location Filters</h6>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="stateCode">
              <Form.Label>State</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.stateCode}
                onChange={(option) => handleLocationChange("stateCode", option)}
                options={stateOptions}
                isLoading={loadingStates}
                placeholder="Select state"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="cityId">
              <Form.Label>City</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.cityId}
                onChange={(option) => handleLocationChange("cityId", option)}
                options={cityOptions}
                isLoading={loadingCities}
                isDisabled={!values.stateCode?.value}
                placeholder="Select city"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="villageId">
              <Form.Label>Village</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.villageId}
                onChange={(option) => handleLocationChange("villageId", option)}
                options={villageOptions}
                isLoading={loadingVillages}
                isDisabled={!values.cityId?.value}
                placeholder="Select village"
              />
            </Form.Group>
          </Col>

          <Col xs={12} className="mt-1">
            <h6 className="text-muted mb-0">Community Filters</h6>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="community">
              <Form.Label>Community</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.community}
                onChange={(option) => handleMasterChange("community", option)}
                options={masterDataDropdown.communities}
                isLoading={masterDataDropdown.loadingCommunities}
                placeholder="Select community"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="vansh">
              <Form.Label>Vansh</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.vansh}
                onChange={(option) => handleMasterChange("vansh", option)}
                options={
                  values.community?.value
                    ? masterDataDropdown.vanshes[values.community.value] || []
                    : []
                }
                isLoading={
                  values.community?.value
                    ? masterDataDropdown.loadingVanshes[
                        values.community.value
                      ] || false
                    : false
                }
                isDisabled={!values.community?.value}
                placeholder="Select vansh"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="kul">
              <Form.Label>Kul</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.kul}
                onChange={(option) => handleMasterChange("kul", option)}
                options={
                  values.vansh?.value
                    ? masterDataDropdown.kuls[values.vansh.value] || []
                    : []
                }
                isLoading={
                  values.vansh?.value
                    ? masterDataDropdown.loadingKuls[values.vansh.value] ||
                      false
                    : false
                }
                isDisabled={!values.vansh?.value}
                placeholder="Select kul"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="gotra">
              <Form.Label>Gotra</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.gotra}
                onChange={(option) => handleMasterChange("gotra", option)}
                options={
                  values.kul?.value
                    ? masterDataDropdown.gotras[values.kul.value] || []
                    : []
                }
                isLoading={
                  values.kul?.value
                    ? masterDataDropdown.loadingGotras[values.kul.value] ||
                      false
                    : false
                }
                isDisabled={!values.kul?.value}
                placeholder="Select gotra"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="khamp">
              <Form.Label>Khamp</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.khamp}
                onChange={(option) => handleMasterChange("khamp", option)}
                options={
                  values.kul?.value
                    ? masterDataDropdown.khamps[values.kul.value] || []
                    : []
                }
                isLoading={
                  values.kul?.value
                    ? masterDataDropdown.loadingKhamps[values.kul.value] ||
                      false
                    : false
                }
                isDisabled={!values.kul?.value}
                placeholder="Select khamp"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="subKhamp">
              <Form.Label>Sub-Khamp</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.subKhamp}
                onChange={(option) => handleMasterChange("subKhamp", option)}
                options={
                  values.khamp?.value
                    ? masterDataDropdown.subKhamps[values.khamp.value] || []
                    : []
                }
                isLoading={
                  values.khamp?.value
                    ? masterDataDropdown.loadingSubKhamps[
                        values.khamp.value
                      ] || false
                    : false
                }
                isDisabled={!values.khamp?.value}
                placeholder="Select sub-khamp"
              />
            </Form.Group>
          </Col>

          <Col xs={12} className="mt-1">
            <h6 className="text-muted mb-0">Other Filters</h6>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="maritalStatus">
              <Form.Label>Marital Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.maritalStatus}
                onChange={(option) => setField("maritalStatus", option)}
                loadOptions={loadMaritalOptions}
                placeholder="All"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="education">
              <Form.Label>Education</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.education}
                onChange={(option) => setField("education", option)}
                loadOptions={loadEducationOptions}
                placeholder="All"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="bloodGroup">
              <Form.Label>Blood Group</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={values.bloodGroup}
                onChange={(option) => setField("bloodGroup", option)}
                loadOptions={loadBloodGroupOptions}
                placeholder="All"
              />
            </Form.Group>
          </Col>

          <Col xs={12} className="d-flex justify-content-end gap-2 mt-3">
            <Button
              type="button"
              className="btn btn--outline"
              onClick={onReset}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="btn btn--theme btn--disabled-theme"
              onClick={onSearch}
              disabled={!isFilterValid}
            >
              Search
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default UserFilters;
