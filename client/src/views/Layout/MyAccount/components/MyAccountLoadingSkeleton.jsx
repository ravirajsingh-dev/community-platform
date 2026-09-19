import React from "react";
import { Col, Row } from "react-bootstrap";

const SKELETON_FIELDS = 6;

const MyAccountLoadingSkeleton = () => (
  <div
    className="my-account-skeleton placeholder-glow"
    aria-busy="true"
    aria-label="Loading account"
  >
    <div className="d-flex flex-wrap gap-3 mb-4">
      {[1, 2, 3, 4, 5].map((tab) => (
        <span
          key={tab}
          className="placeholder rounded my-account-skeleton__tab"
        />
      ))}
    </div>

    <Row className="row-gap-3">
      {Array.from({ length: SKELETON_FIELDS }, (_, index) => (
        <Col key={index} xs={12} md={6}>
          <span className="placeholder col-4 rounded mb-2 d-block my-account-skeleton__label" />
          <span className="placeholder col-12 rounded my-account-skeleton__field" />
        </Col>
      ))}
    </Row>
  </div>
);

export default MyAccountLoadingSkeleton;
