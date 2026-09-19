import React from "react";
import PropTypes from "prop-types";
import { Card, Badge } from "react-bootstrap";
import {
  formatPlanDuration,
  formatPlanPrice,
} from "@src/utils/membershipPlanUtils";

const MembershipPlanCard = ({ plan, selected, onSelect }) => {
  const isSelected = selected === plan._id;

  return (
    <Card
      className={`membership-plan-card ${isSelected ? "is-selected" : ""}`}
      onClick={() => onSelect(plan._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(plan._id);
        }
      }}
    >
      <Card.Body>
        <div className="membership-plan-card__header">
          <Card.Title className="membership-plan-card__title">
            {plan.name}
          </Card.Title>
          {isSelected && (
            <Badge bg="success" className="membership-plan-card__badge">
              Selected
            </Badge>
          )}
        </div>
        <div className="membership-plan-card__price">
          {formatPlanPrice(plan)}
        </div>
        <div className="membership-plan-card__duration">
          {formatPlanDuration(plan)}
        </div>
      </Card.Body>
    </Card>
  );
};

MembershipPlanCard.propTypes = {
  plan: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    currency: PropTypes.string,
    durationType: PropTypes.string,
    durationValue: PropTypes.number,
  }).isRequired,
  selected: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

export default MembershipPlanCard;
