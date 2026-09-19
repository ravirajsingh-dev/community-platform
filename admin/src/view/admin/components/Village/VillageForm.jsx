import React from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AsyncCustomSelect from "@src/view/commonComponents/mainCard/AsyncCustomSelect";
import {
  INDIA_ISO2,
  getCityOptionFromCache,
} from "@src/utils/locationData";
import { useLocationCascade } from "@src/hooks/useLocationCascade";
import {
  createVillage,
  updateVillage,
  getVillageById,
  resetComponentStore,
} from "@src/actions/adminVillageActions";

const VillageForm = ({
  loggedInUser,
  currentVillage,
  loadingVillagesList,
  locationDropdown,
  createVillage,
  updateVillage,
  getVillageById,
  resetComponentStore,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = React.useState({
    name: "",
    stateCode: null,
    cityId: null,
    status: "active",
  });

  const [onlyOnce, setOnce] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    countryId,
    citiesKey,
    stateOptions,
    cityOptions,
    loadingStates,
    loadingCities,
    applyLocationSelectChange,
  } = useLocationCascade({
    stateCode: formData.stateCode,
    cityId: formData.cityId,
    fetchVillagesEnabled: false,
  });

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (isEditMode && id) {
      getVillageById(id);
    }
  }, [isEditMode, id, getVillageById, resetComponentStore, onlyOnce]);

  React.useEffect(() => {
    if (!isEditMode || !currentVillage) return;

    const stateOption =
      stateOptions.find((s) => s.value === currentVillage.stateCode) ||
      (currentVillage.stateCode
        ? {
            value: currentVillage.stateCode,
            label: currentVillage.stateCode,
          }
        : null);

    const stateInput = currentVillage.stateCode
      ? { value: currentVillage.stateCode }
      : null;

    const cityOption =
      cityOptions.find(
        (c) => String(c.value) === String(currentVillage.cityId),
      ) ||
      getCityOptionFromCache(
        currentVillage.cityId,
        stateInput,
        locationDropdown,
      ) ||
      (currentVillage.cityId
        ? {
            value: String(currentVillage.cityId),
            label: currentVillage.cityName || String(currentVillage.cityId),
            meta: {
              cityId: currentVillage.cityId,
              cityName: currentVillage.cityName || "",
              countryCode: currentVillage.countryCode || INDIA_ISO2,
              stateCode: currentVillage.stateCode,
            },
          }
        : null);

    setFormData({
      name: currentVillage.name || "",
      stateCode: stateOption,
      cityId: cityOption,
      status: currentVillage.status || "active",
    });
  }, [isEditMode, currentVillage, stateOptions, cityOptions, locationDropdown]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "name"
            ? value.toUpperCase()
            : value,
    }));
  };

  const handleLocationChange = (name, selectedOption) => {
    setFormData((prev) => applyLocationSelectChange(name, selectedOption, prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cityId && !isEditMode) {
      alert("Please select state and city");
      return;
    }

    const submitData = {
      name: formData.name,
      countryCode: INDIA_ISO2,
      stateCode: formData.stateCode?.value || formData.stateCode,
      cityId: formData.cityId?.value || formData.cityId,
      cityName:
        formData.cityId?.meta?.cityName || formData.cityId?.label || undefined,
      status: formData.status,
    };

    setIsSubmitting(true);

    if (isEditMode) {
      await updateVillage(submitData, id, navigate);
    } else {
      await createVillage(submitData, navigate);
    }

    setIsSubmitting(false);
  };

  const stateSelectOptions =
    countryId && locationDropdown.states[countryId]
      ? locationDropdown.states[countryId]
      : stateOptions;
  const citySelectOptions =
    citiesKey && locationDropdown.cities[citiesKey]
      ? locationDropdown.cities[citiesKey]
      : cityOptions;

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit Village" : "Add Village"}
        crumbs={[
          { name: "Villages", link: "/admin/villages" },
          { name: isEditMode ? "Edit" : "Add" },
        ]}
      />

      <MainCard>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <Form.Group controlId="country" className="mb-3">
                <Form.Label>Country</Form.Label>
                <Form.Control
                  type="text"
                  value="India"
                  disabled
                  readOnly
                  className="text-muted"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="state" className="mb-3">
                <Form.Label>
                  State <span className="text-danger">*</span>
                </Form.Label>
                <AsyncCustomSelect
                  value={formData.stateCode}
                  onChange={(option) => handleLocationChange("stateCode", option)}
                  options={stateSelectOptions}
                  isLoading={loadingStates}
                  isDisabled={isEditMode}
                  placeholder="Select state"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="city" className="mb-3">
                <Form.Label>
                  City <span className="text-danger">*</span>
                </Form.Label>
                <AsyncCustomSelect
                  value={formData.cityId}
                  onChange={(option) => handleLocationChange("cityId", option)}
                  options={citySelectOptions}
                  isLoading={loadingCities}
                  isDisabled={isEditMode || !formData.stateCode?.value}
                  placeholder="Select city"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="name" className="mb-3">
                <Form.Label>
                  Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter village name"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="status" className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="status"
                  label="Active"
                  checked={formData.status === "active"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.checked ? "active" : "inactive",
                    }))
                  }
                  disabled={
                    isEditMode &&
                    (currentVillage?.status === "pending" ||
                      currentVillage?.status === "rejected")
                  }
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || loadingVillagesList}
            >
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/villages")}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </MainCard>
    </Container>
  );
};

VillageForm.propTypes = {
  createVillage: PropTypes.func.isRequired,
  updateVillage: PropTypes.func.isRequired,
  getVillageById: PropTypes.func.isRequired,
};

const mapVillageToProps = (state) => ({
  currentVillage: state.village.currentVillage,
  loadingVillagesList: state.village.loadingVillagesList,
  locationDropdown: state.locationDropdown,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapVillageToProps, {
  createVillage,
  updateVillage,
  getVillageById,
  resetComponentStore,
})(VillageForm);
