import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import { getMembershipPlans } from "@src/actions/adminMembershipPlanActions";
import EditTabActions from "./components/EditTabActions";

const formatPlanOptionLabel = (plan) => {
  if (!plan?.name) return "";
  return plan.price != null ? `${plan.name} (₹${plan.price})` : plan.name;
};

const EditUserMembershipTab = ({
  formData,
  onChange,
  handleSelectChange,
  isDisabled,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  submitting,
}) => {
  const dispatch = useDispatch();
  const membershipPlans = useSelector(
    (state) => state.adminMembershipPlan.membershipPlans?.data || [],
  );

  useEffect(() => {
    dispatch(getMembershipPlans({ limit: 100, page: 1 }));
  }, [dispatch]);

  const planOptions = useMemo(
    () =>
      membershipPlans.map((plan) => ({
        label: formatPlanOptionLabel(plan),
        value: String(plan._id),
      })),
    [membershipPlans],
  );

  const selectedPlan = useMemo(() => {
    const current = formData.membershipPlanId;
    if (!current?.value) return null;

    const currentId = String(current.value);
    const matched = planOptions.find(
      (plan) => String(plan.value) === currentId,
    );
    if (matched) return matched;

    if (current.label && current.label !== currentId) {
      return { value: currentId, label: current.label };
    }

    return { value: currentId, label: current.label || "Loading..." };
  }, [formData.membershipPlanId, planOptions]);

  const handlePlanChange = (option) => {
    handleSelectChange("membershipPlanId", option || null);
  };

  return (
    <>
      <Row className="row-gap-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label className="form-sub-label">Membership Plan</Form.Label>
            <CustomSelect
              className="entity-form__select"
              options={planOptions}
              value={selectedPlan}
              onChange={handlePlanChange}
              isDisabled={isDisabled}
              placeholder="Select plan"
              isClearable
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label className="form-sub-label">Subscription Start</Form.Label>
            <Form.Control
              type="date"
              name="subscriptionStartDate"
              value={formData.subscriptionStartDate || ""}
              onChange={onChange}
              disabled={isDisabled}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label className="form-sub-label">Renewal Date</Form.Label>
            <Form.Control
              type="date"
              name="renewalDate"
              value={formData.renewalDate || ""}
              onChange={onChange}
              disabled={isDisabled || formData.isLifetimePaid}
            />
            {formData.isLifetimePaid ? (
              <Form.Text className="text-muted">Not applicable for lifetime membership.</Form.Text>
            ) : null}
          </Form.Group>
        </Col>
        <Col xs={12} md={6} className="d-flex flex-column gap-3 pt-md-4">
          <Form.Check
            type="switch"
            id="isPaid"
            name="isPaid"
            label="Membership Paid"
            checked={Boolean(formData.isPaid)}
            onChange={onChange}
            disabled={isDisabled}
          />
          <Form.Check
            type="switch"
            id="isLifetimePaid"
            name="isLifetimePaid"
            label="Lifetime Membership"
            checked={Boolean(formData.isLifetimePaid)}
            onChange={onChange}
            disabled={isDisabled}
          />
        </Col>
      </Row>

      <EditTabActions
        isEditing={isEditing}
        isDisabled={isDisabled}
        onEdit={onEdit}
        onCancel={onCancel}
        onSave={onSave}
        submitting={submitting}
      />
    </>
  );
};

EditUserMembershipTab.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  handleSelectChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
};

export default EditUserMembershipTab;
