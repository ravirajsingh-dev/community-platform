import React from "react";
import PropTypes from "prop-types";
import { Button, Col, Row } from "react-bootstrap";
import { FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";

const AccountEditHeader = ({
  title,
  isEditing,
  onEdit,
  onPreview,
  submitting,
}) => (
  <Row className="mb-3 align-items-center">
    <Col>
      <h4 className="mb-1">{title}</h4>
    </Col>
    <Col xs="auto">
      <Button
        type="button"
        variant={null}
        className={`btn btn-sm ${isEditing ? "btn--outline" : "btn--theme"}`}
        onClick={isEditing ? onPreview : onEdit}
        disabled={submitting}
      >
        {isEditing ? (
          <>
            <FaRegEye className="me-1" />
            View mode
          </>
        ) : (
          <>
            <MdEdit className="me-1" />
            Edit
          </>
        )}
      </Button>
    </Col>
  </Row>
);

AccountEditHeader.propTypes = {
  title: PropTypes.string.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
};

export default AccountEditHeader;
