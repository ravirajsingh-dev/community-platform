import React from "react";
import { Container, Row, Col, Image } from "react-bootstrap";

const Spinner = ({ fullViewport = false }) => {
  return (
    <Container
      className={`spinner-container${fullViewport ? " spinner-container--full-viewport" : ""}`}
    >
      <div className="spinner"></div>
    </Container>
  );
};

export default Spinner;
