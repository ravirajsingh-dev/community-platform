import React from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import MemberIdInput from "@src/components/common/MemberIdInput";

const WalletFilters = ({ values, onChange, onApply, onReset }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...values, [name]: value });
  };

  return (
    <Form
      className="mb-3"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(values);
      }}
    >
      <Row className="g-3 align-items-end">
        <Col md={4}>
          <MemberIdInput
            id="memberId"
            name="memberId"
            value={values.memberId}
            onChange={handleChange}
            label="Member ID"
            showHint={false}
          />
        </Col>
        <Col md={4}>
          <Form.Group controlId="wallet-filter-name">
            <Form.Label>Name</Form.Label>
            <Form.Control
              name="name"
              value={values.name}
              onChange={handleChange}
              placeholder="Search by name"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group controlId="wallet-filter-phone">
            <Form.Label>Phone</Form.Label>
            <Form.Control
              name="phone"
              value={values.phone}
              onChange={handleChange}
              placeholder="Search by phone"
              maxLength={10}
            />
          </Form.Group>
        </Col>
        <Col xs={12} className="d-flex gap-2">
          <Button type="submit" className="btn btn--theme">
            Apply Filters
          </Button>
          <Button
            type="button"
            variant="outline-secondary"
            onClick={onReset}
          >
            Reset
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default WalletFilters;
