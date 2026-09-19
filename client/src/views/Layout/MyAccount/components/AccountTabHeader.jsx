import React from "react";
import PropTypes from "prop-types";
import { Col, Row } from "react-bootstrap";

const AccountTabHeader = ({ title, description }) => (
  <Row className="mb-3 align-items-center">
    <Col>
      <h4 className="mb-1">{title}</h4>
      {description ? (
        <p className="text-muted small mb-0">{description}</p>
      ) : null}
    </Col>
  </Row>
);

AccountTabHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
};

export default AccountTabHeader;
