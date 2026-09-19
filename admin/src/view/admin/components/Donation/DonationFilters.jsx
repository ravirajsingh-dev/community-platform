import { useCallback, useMemo } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import {
  isValidEmail,
  sanitizeEmail,
  sanitizePhone,
} from "@src/utils/inputValidation";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const getOptionByValue = (options, value) =>
  options.find((item) => String(item.value) === String(value)) || null;

const DonationFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadStatusOptions = useCallback(() => statusOptions, []);

  const handlePhoneChange = (e) => {
    onChange({
      target: { name: "phone", value: sanitizePhone(e.target.value) },
    });
  };

  const handleEmailChange = (e) => {
    onChange({
      target: { name: "email", value: sanitizeEmail(e.target.value) },
    });
  };

  const filterErrors = useMemo(() => {
    const errors = {};
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
    if (values.amount?.trim()) {
      const amountNum = Number(values.amount);
      if (Number.isNaN(amountNum) || amountNum < 0) {
        errors.amount = "Amount must be a valid positive number.";
      }
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
            <Form.Group controlId="amount">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                value={values.amount}
                onChange={onChange}
                placeholder="Filter by amount"
                min="0"
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.amount ? (
                  <Form.Text className="form-error-message">
                    {filterErrors.amount}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="search">
              <Form.Label>Search</Form.Label>
              <Form.Control
                name="search"
                value={values.search}
                onChange={onChange}
                placeholder="Name / Email / UTR / Phone"
                maxLength={120}
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group controlId="phone">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                name="phone"
                value={values.phone}
                onChange={handlePhoneChange}
                placeholder="Search by phone"
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

export default DonationFilters;
