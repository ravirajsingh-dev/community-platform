import React from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { PropTypes } from "prop-types";

import CustomSelect from "@src/components/common/CustomSelect";
import {
  HierarchyLevelOptions,
  getHierarchyLevelOptionByValue,
} from "@src/utils/hierarchyStatusUtils";
import {
  fetchActiveCommunities,
  fetchActiveVanshes,
  fetchActiveKuls,
  fetchActiveKhamps,
  fetchActiveSubKhamps,
  toHierarchySelectOptions,
  getHierarchySelectOption,
} from "@src/utils/hierarchyParentFetchers";
import { isValidName, sanitizeName } from "@src/utils/inputValidation";
import { HIERARCHY_ADMIN_ENTITIES } from "@src/config/hierarchyAdminConfig";
import { FILTER_CASCADE_RESETS } from "./HierarchyEntityFilters";

const PARENT_FILTER_FIELDS = HIERARCHY_ADMIN_ENTITIES.gotra.formParents;

const PendingApprovalsFilters = ({
  values,
  onChange,
  onParentChange,
  onSearch,
  onReset,
}) => {
  const [options, setOptions] = React.useState({});

  React.useEffect(() => {
    fetchActiveCommunities().then((data) => {
      setOptions((prev) => ({ ...prev, communities: data }));
    });
  }, []);

  React.useEffect(() => {
    const communityId = values.communityId;
    if (!communityId) {
      setOptions((prev) => ({ ...prev, vanshes: [] }));
      return;
    }
    fetchActiveVanshes(communityId).then((data) => {
      setOptions((prev) => ({ ...prev, vanshes: data }));
    });
  }, [values.communityId]);

  React.useEffect(() => {
    const vanshId = values.vanshId;
    if (!vanshId) {
      setOptions((prev) => ({ ...prev, kuls: [] }));
      return;
    }
    fetchActiveKuls(vanshId).then((data) => {
      setOptions((prev) => ({ ...prev, kuls: data }));
    });
  }, [values.vanshId]);

  React.useEffect(() => {
    const kulId = values.kulId;
    if (!kulId) {
      setOptions((prev) => ({ ...prev, khamps: [] }));
      return;
    }
    fetchActiveKhamps(kulId).then((data) => {
      setOptions((prev) => ({ ...prev, khamps: data }));
    });
  }, [values.kulId]);

  React.useEffect(() => {
    const khampId = values.khampId;
    if (!khampId) {
      setOptions((prev) => ({ ...prev, subKhamps: [] }));
      return;
    }
    fetchActiveSubKhamps(khampId).then((data) => {
      setOptions((prev) => ({ ...prev, subKhamps: data }));
    });
  }, [values.khampId]);

  const loadLevelOptions = React.useCallback(() => HierarchyLevelOptions, []);

  const handleNameChange = (e) => {
    onChange({
      target: { name: "name", value: sanitizeName(e.target.value) },
    });
  };

  const filterErrors = React.useMemo(() => {
    const errors = {};
    if (values.name?.trim() && !isValidName(values.name)) {
      errors.name = "Name must be 3-50 characters and in valid format.";
    }
    return errors;
  }, [values.name]);

  const isFilterValid = Object.keys(filterErrors).length === 0;

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-start">
          <Col md={6} lg={4}>
            <Form.Group controlId="pendingFilterName">
              <Form.Label>Name</Form.Label>
              <Form.Control
                name="name"
                value={values.name || ""}
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
            <Form.Group controlId="pendingFilterLevel">
              <Form.Label>Level</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getHierarchyLevelOptionByValue(values.level)}
                onChange={(option) =>
                  onChange({
                    target: { name: "level", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadLevelOptions}
                placeholder="All levels"
              />
            </Form.Group>
          </Col>

          {PARENT_FILTER_FIELDS.map((field) => {
            const fieldItems = options[field.fetchKey] || [];
            const isDisabled = field.dependsOn && !values[field.dependsOn];

            return (
              <Col md={6} lg={4} key={field.field}>
                <Form.Group controlId={`pendingFilter-${field.field}`}>
                  <Form.Label>{field.label}</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    value={getHierarchySelectOption(
                      fieldItems,
                      values[field.field],
                    )}
                    onChange={(option) =>
                      onParentChange(field.field, option?.value ?? "")
                    }
                    options={toHierarchySelectOptions(fieldItems)}
                    placeholder={`All ${field.label}s`}
                    isDisabled={isDisabled}
                  />
                </Form.Group>
              </Col>
            );
          })}

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

PendingApprovalsFilters.propTypes = {
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onParentChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default PendingApprovalsFilters;
