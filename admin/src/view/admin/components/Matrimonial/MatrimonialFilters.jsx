import { useCallback } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const visibilityOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getOptionByValue = (options, value) =>
  options.find((item) => String(item.value) === String(value)) || null;

const MatrimonialFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadGenderOptions = useCallback(() => genderOptions, []);
  const loadVisibilityOptions = useCallback(() => visibilityOptions, []);

  const isFilterValid = true;

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-start">
          <Col md={6} lg={4}>
            <Form.Group controlId="gender">
              <Form.Label>Gender</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getOptionByValue(genderOptions, values.gender)}
                onChange={(option) =>
                  onChange({
                    target: { name: "gender", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadGenderOptions}
                placeholder="All genders"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="visible">
              <Form.Label>Visible</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getOptionByValue(visibilityOptions, values.isActive)}
                onChange={(option) =>
                  onChange({
                    target: { name: "isActive", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadVisibilityOptions}
                placeholder="All"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="search">
              <Form.Label>Search</Form.Label>
              <Form.Control
                name="search"
                value={values.search}
                onChange={onChange}
                placeholder="Name / Email / Phone / Member ID"
                maxLength={120}
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="communityId">
              <Form.Label>Community ID</Form.Label>
              <Form.Control
                name="communityId"
                value={values.communityId}
                onChange={onChange}
                placeholder="ObjectId"
                maxLength={24}
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

export default MatrimonialFilters;
