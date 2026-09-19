import React from "react";
import { Col, Row } from "react-bootstrap";

const SKELETON_FIELDS = 6;

const EditUserLoadingSkeleton = () => (
  <div
    className="edit-user-skeleton placeholder-glow"
    aria-busy="true"
    aria-label="Loading user"
  >
    <div className="d-flex flex-wrap gap-3 mb-4">
      {[1, 2, 3, 4].map((tab) => (
        <span
          key={tab}
          className="placeholder rounded edit-user-skeleton__tab"
        />
      ))}
    </div>

    <Row className="row-gap-3">
      {Array.from({ length: SKELETON_FIELDS }, (_, index) => (
        <Col key={index} xs={12} md={6}>
          <span className="placeholder col-4 rounded mb-2 d-block edit-user-skeleton__label" />
          <span className="placeholder col-12 rounded edit-user-skeleton__field" />
        </Col>
      ))}
    </Row>
  </div>
);

export default EditUserLoadingSkeleton;
