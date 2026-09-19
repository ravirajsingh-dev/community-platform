import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Badge, Form, InputGroup } from "react-bootstrap";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import CustomModal from "@src/components/common/Modal/CustomModal";
import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import api from "@src/utils/axiosSetup";
import { UserStatuses } from "@src/constants/CustomSelectValues";

const ACTION_CONFIG = {
  activate: {
    title: "Activate Membership",
    submitLabel: "Activate",
    needsPlan: true,
    description:
      "Select a membership plan to activate for this user. A payment record will be created and membership will be marked active.",
  },
  renew: {
    title: "Renew Membership",
    submitLabel: "Renew",
    needsPlan: true,
    description:
      "Select a plan to renew. If the current membership is still active, the new period will stack from the existing renewal date.",
  },
  block: {
    title: "Block User",
    submitLabel: "Block",
    needsPlan: false,
    description:
      "Block this user account. They will be logged out and cannot access the portal until unblocked.",
  },
  unblock: {
    title: "Unblock User",
    submitLabel: "Unblock",
    needsPlan: false,
    description:
      "Unblock this user. Status will restore to Active if membership is still valid, otherwise Inactive.",
  },
  expire: {
    title: "Expire Membership",
    submitLabel: "Expire",
    needsPlan: false,
    description:
      "Force-expire this user's membership. Status will become Inactive and paid flag will be cleared.",
  },
};

const UserMembershipActionModal = ({
  show,
  onHide,
  onConfirm,
  action,
  user,
  loading,
  setErrors,
  errorList,
}) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [txnPassword, setTxnPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [planOptions, setPlanOptions] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const config = ACTION_CONFIG[action] || ACTION_CONFIG.activate;

  useEffect(() => {
    if (!show || !config.needsPlan) return;

    let cancelled = false;
    const loadPlans = async () => {
      setLoadingPlans(true);
      try {
        const res = await api.get("/api/common/membership-plans");
        const plans = Array.isArray(res.data?.response) ? res.data.response : [];
        if (!cancelled) {
          setPlanOptions(
            plans.map((plan) => ({
              label: `${plan.name} (₹${plan.price})`,
              value: plan._id,
            })),
          );
        }
      } catch (error) {
        if (!cancelled) setPlanOptions([]);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    };

    loadPlans();
    return () => {
      cancelled = true;
    };
  }, [show, config.needsPlan]);

  useEffect(() => {
    if (!show) {
      setSelectedPlan(null);
      setRemarks("");
      setTxnPassword("");
      setShowPassword(false);
      return;
    }

    const currentPlanId = user?.membershipPlanId
      ? String(user.membershipPlanId)
      : null;
    const matched = currentPlanId
      ? planOptions.find((plan) => String(plan.value) === currentPlanId) || null
      : null;
    setSelectedPlan(matched);
    setRemarks("");
    setTxnPassword("");
    setShowPassword(false);
  }, [show, user, planOptions]);

  const statusLabel =
    UserStatuses.find((s) => s.value === user?.status)?.label || "Unknown";

  const renewalLabel = user?.isLifetimePaid
    ? "Lifetime"
    : user?.renewalDate
      ? format(parseISO(user.renewalDate), "dd/MM/yyyy")
      : "—";

  const handleConfirm = () => {
    const rules = [
      { path: "txn_password", msg: "Transaction password is required." },
    ];
    if (config.needsPlan) {
      rules.push({ path: "planId", msg: "Membership plan is required." });
    }

    const errors = validateForm(
      {
        txn_password: txnPassword,
        planId: selectedPlan?.value || "",
      },
      rules,
    );

    if (errors.length) {
      setErrors(errors);
      return;
    }

    onConfirm({
      planId: selectedPlan?.value || undefined,
      remarks: remarks.trim() || undefined,
      txn_password: txnPassword,
    });
  };

  const handleClose = () => {
    setSelectedPlan(null);
    setRemarks("");
    setTxnPassword("");
    onHide();
  };

  if (!user || !action) return null;

  return (
    <CustomModal
      show={show}
      onHide={handleClose}
      title={config.title}
      size="md"
      closeButton
      className="settings-confirm-modal"
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: "Close",
          onClick: handleClose,
          className: "btn btn--outline",
          colSize: 5,
          disabled: loading,
        },
        {
          label: loading ? "Please wait..." : config.submitLabel,
          onClick: handleConfirm,
          className: "btn btn--theme",
          colSize: 7,
          disabled: loading || (config.needsPlan && loadingPlans),
        },
      ]}
    >
      <p className="mb-3">{config.description}</p>

      <div className="mb-3 small">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted">User</span>
          <span className="fw-semibold">
            {user.name} ({user.memberId || "—"})
          </span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted">Status</span>
          <Badge bg={user.status === 1 ? "success" : user.status === 3 ? "info" : "secondary"}>
            {statusLabel}
          </Badge>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted">Current Plan</span>
          <span>{user.membershipPlanName || "—"}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted">Renewal</span>
          <span>{renewalLabel}</span>
        </div>
      </div>

      {config.needsPlan && (
        <Form.Group className="mb-3" controlId="membership_action_plan">
          <Form.Label className="fw-bold">Membership Plan *</Form.Label>
          <CustomSelect
            options={planOptions}
            value={selectedPlan}
            onChange={(option) => setSelectedPlan(option || null)}
            placeholder={loadingPlans ? "Loading plans..." : "Select plan"}
            isDisabled={loading || loadingPlans}
          />
          <Errors current_key="planId" />
        </Form.Group>
      )}

      <Form.Group className="mb-3" controlId="membership_action_remarks">
        <Form.Label className="fw-bold">Remarks (optional)</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Reason / note for audit"
          maxLength={500}
          disabled={loading}
        />
      </Form.Group>

      <Form.Group controlId="membership_action_txn_password">
        <Form.Label htmlFor="membership_action_txn_password" className="fw-bold">
          Transaction Password *
        </Form.Label>
        <InputGroup>
          <Form.Control
            type={showPassword ? "text" : "password"}
            id="membership_action_txn_password"
            value={txnPassword}
            name="txn_password"
            className={`text-muted ${errorList.txn_password ? "invalid" : ""}`}
            onChange={(e) => setTxnPassword(e.target.value)}
            placeholder="Enter transaction password"
            disabled={loading}
          />
          <InputGroup.Text
            className="show-password-icon text-muted"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <AiOutlineEye size={20} /> : <AiOutlineEyeInvisible size={20} />}
          </InputGroup.Text>
        </InputGroup>
        <Errors current_key="txn_password" />
      </Form.Group>
    </CustomModal>
  );
};

UserMembershipActionModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  action: PropTypes.oneOf(["activate", "renew", "block", "unblock", "expire"]),
  user: PropTypes.object,
  loading: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
})(UserMembershipActionModal);
