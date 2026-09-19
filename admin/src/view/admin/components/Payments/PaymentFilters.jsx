import { useMemo } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";
import MemberIdInput from "@src/components/common/MemberIdInput";
import { PaymentStatusOptions, getOptionByValue } from "@src/constants/CustomSelectValues";
import { isValidName, sanitizeName } from "@src/utils/inputValidation";

const PaymentFilters = ({ values, onChange, onSearch, onReset, planOptions = [] }) => {
  const handleNameChange = (e) => {
    onChange({
      target: { name: "name", value: sanitizeName(e.target.value) },
    });
  };

  const filterErrors = useMemo(() => {
    const errors = {};
    if (values.name?.trim() && !isValidName(values.name)) {
      errors.name = "Name must be 3-50 characters and in valid format.";
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
          <Col md={6} lg={3}>
            <MemberIdInput
              id="memberId"
              name="memberId"
              value={values.memberId}
              onChange={onChange}
            />
          </Col>
          <Col md={6} lg={3}>
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
                  <Form.Text className="form-error-message">{filterErrors.name}</Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                options={PaymentStatusOptions}
                value={getOptionByValue(PaymentStatusOptions, values.status)}
                onChange={(option) =>
                  onChange({ target: { name: "status", value: option?.value ?? "" } })
                }
                placeholder="All statuses"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Plan</Form.Label>
              <CustomSelect
                className="entity-form__select"
                options={planOptions}
                value={getOptionByValue(planOptions, values.planId)}
                onChange={(option) =>
                  onChange({ target: { name: "planId", value: option?.value ?? "" } })
                }
                placeholder="All plans"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>From Date</Form.Label>
              <Form.Control type="date" name="fromDate" value={values.fromDate} onChange={onChange} />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>To Date</Form.Label>
              <Form.Control type="date" name="toDate" value={values.toDate} onChange={onChange} />
              {filterErrors.toDate ? (
                <Form.Text className="form-error-message">{filterErrors.toDate}</Form.Text>
              ) : null}
            </Form.Group>
          </Col>
          <Col xs={12} className="d-flex justify-content-end gap-2 mt-2">
            <Button type="button" className="btn btn--outline" onClick={onReset}>
              Reset
            </Button>
            <Button
              type="button"
              className="btn btn--theme"
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

export default PaymentFilters;
