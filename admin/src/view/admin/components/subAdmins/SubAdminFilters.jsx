import { useCallback, useMemo } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import {
  isValidEmail,
  isValidName,
  sanitizeEmail,
  sanitizeName,
} from "@src/utils/inputValidation";

const roleOptions = [
  { value: "sub_admin", label: "Sub Admin" },
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
];

const statusOptions = [
  { value: "1", label: "Active" },
  { value: "2", label: "Inactive" },
];

const isActiveOptions = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const getOptionByValue = (options, value) =>
  options.find((item) => String(item.value) === String(value)) || null;

const SubAdminFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadRoleOptions = useCallback(() => roleOptions, []);
  const loadStatusOptions = useCallback(() => statusOptions, []);
  const loadIsActiveOptions = useCallback(() => isActiveOptions, []);

  const handleNameChange = (e) => {
    onChange({
      target: { name: "name", value: sanitizeName(e.target.value) },
    });
  };

  const handleEmailChange = (e) => {
    onChange({
      target: { name: "email", value: sanitizeEmail(e.target.value) },
    });
  };

  const filterErrors = useMemo(() => {
    const errors = {};
    if (values.name?.trim() && !isValidName(values.name)) {
      errors.name = "Name must be 3-50 characters and in valid format.";
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
          <Col md={6} lg={4}>
            <Form.Group controlId="name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                name="name"
                value={values.name}
                onChange={handleNameChange}
                placeholder="Search by name"
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
            <Form.Group controlId="adminId">
              <Form.Label>Admin ID</Form.Label>
              <Form.Control
                name="adminId"
                value={values.adminId}
                onChange={onChange}
                placeholder="Search by admin ID"
                maxLength={30}
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="email"
                value={values.email}
                onChange={handleEmailChange}
                placeholder="Search by email"
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
          <Col md={6} lg={4}>
            <Form.Group controlId="role">
              <Form.Label>Role</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getOptionByValue(roleOptions, values.role)}
                onChange={(option) =>
                  onChange({
                    target: { name: "role", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadRoleOptions}
                placeholder="All roles"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="status">
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getOptionByValue(statusOptions, values.status)}
                onChange={(option) =>
                  onChange({
                    target: { name: "status", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadStatusOptions}
                placeholder="All statuses"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="active">
              <Form.Label>Active</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getOptionByValue(isActiveOptions, values.isActive)}
                onChange={(option) =>
                  onChange({
                    target: { name: "isActive", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadIsActiveOptions}
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

export default SubAdminFilters;
