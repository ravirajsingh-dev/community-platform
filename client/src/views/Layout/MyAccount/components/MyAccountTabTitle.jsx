import React from "react";
import PropTypes from "prop-types";
import { Badge } from "react-bootstrap";

const MyAccountTabTitle = ({ label, missingCount = 0 }) => (
  <span className="user-profile-tab-title">
    {label}
    {missingCount > 0 && (
      <Badge className="user-profile-tab-badge">{missingCount}</Badge>
    )}
  </span>
);

MyAccountTabTitle.propTypes = {
  label: PropTypes.string.isRequired,
  missingCount: PropTypes.number,
};

export default MyAccountTabTitle;
