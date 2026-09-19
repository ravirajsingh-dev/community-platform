import React, { useState } from "react";
import PropTypes from "prop-types";
import { Form } from "react-bootstrap";
import CustomModal from "@src/components/common/Modal/CustomModal";
import CustomSelect from "@src/components/common/CustomSelect";
import {
  MarriageEndStatusOptions,
  getOptionByValue,
} from "@src/constants/CustomSelectValues";

/**
 * Admin End Marriage modal: choose divorced or widowed, transaction password required.
 * Reuses same backend updateMarriage logic as Client.
 */
const MarriageEndModal = ({
  show,
  onHide,
  marriage,
  membersById = new Map(),
  getMemberDisplayName,
  targetUserId,
  onConfirm,
  loading,
}) => {
  const [status, setStatus] = useState("divorced");
  const [txnPassword, setTxnPassword] = useState("");

  const handleConfirm = async () => {
    if (!marriage?._id || !targetUserId) return;
    if (!txnPassword.trim()) return;
    await onConfirm(marriage._id, { status, txn_password: txnPassword });
    setTxnPassword("");
    setStatus("divorced");
  };

  const marriageDisplayName = marriage
    ? (() => {
        const s1 = membersById.get(String(marriage.spouse1Id));
        const s2 = membersById.get(String(marriage.spouse2Id));
        return getMemberDisplayName
          ? [getMemberDisplayName(s1), getMemberDisplayName(s2)].join(" + ")
          : `${s1?.firstName || ""} ${s2?.firstName || ""}`.trim() || "Marriage";
      })()
    : "";

  return (
    <CustomModal
      show={show}
      onHide={onHide}
      title="End marriage"
      size="md"
      closeButton
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: "Cancel",
          onClick: onHide,
          className: "btn btn--outline",
          colSize: 5,
          disabled: loading,
        },
        {
          label: loading ? "Updating…" : "End marriage",
          onClick: handleConfirm,
          className: "btn btn--danger",
          colSize: 7,
          disabled: loading || !txnPassword.trim(),
        },
      ]}
    >
      <p className="mb-3">
        End this marriage? {marriageDisplayName && (
          <span className="text-muted d-block mt-1">{marriageDisplayName}</span>
        )}
      </p>
      <Form.Group controlId="status" className="mb-3">
        <Form.Label>Status</Form.Label>
        <CustomSelect
          className="entity-form__select"
          options={MarriageEndStatusOptions}
          value={getOptionByValue(MarriageEndStatusOptions, status)}
          onChange={(option) => setStatus(option?.value ?? "divorced")}
          isRequired
          placeholder="Select status"
        />
      </Form.Group>
      <Form.Group controlId="transaction-password-required" className="mb-0">
        <Form.Label>Transaction password (required)</Form.Label>
        <Form.Control
          type="password"
          value={txnPassword}
          onChange={(e) => setTxnPassword(e.target.value)}
          placeholder="Enter transaction password"
          autoComplete="off"
        />
      </Form.Group>
      <p className="mt-2 mb-0 small text-muted">
        The marriage will remain visible. Spouses can remarry.
      </p>
    </CustomModal>
  );
};

MarriageEndModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  marriage: PropTypes.object,
  membersById: PropTypes.object,
  getMemberDisplayName: PropTypes.func.isRequired,
  targetUserId: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default MarriageEndModal;
