import React, { useEffect, useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import Errors from "@src/notifications/Errors";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { formatIndianNumber } from "@src/utils/helper";
import CustomSelect from "@src/components/common/CustomSelect";
import { getOptionByValue } from "@src/constants/CustomSelectValues";
import MemberIdInput from "@src/components/common/MemberIdInput";
import { isValidMemberIdFormat } from "@src/utils/memberIdFormatter";

const TYPE_OPTIONS = [
  { value: "credit", label: "Credit (CR)" },
  { value: "debit", label: "Debit (DR)" },
];

const WalletAdjustModal = ({
  show,
  onHide,
  submitting,
  errorList,
  resolveWalletMember,
  onSubmit,
}) => {
  const [memberId, setMemberId] = useState("");
  const [resolvedMember, setResolvedMember] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [type, setType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [txnPassword, setTxnPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (show) {
      setMemberId("");
      setResolvedMember(null);
      setLookupError("");
      setResolving(false);
      setType("credit");
      setAmount("");
      setRemarks("");
      setTxnPassword("");
      setShowPassword(false);
    }
  }, [show]);

  useEffect(() => {
    if (!show || !isValidMemberIdFormat(memberId)) {
      setResolvedMember(null);
      setLookupError("");
      setResolving(false);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setResolving(true);
      setLookupError("");
      const result = await resolveWalletMember(memberId);
      if (cancelled) return;

      if (result?.status && result.response?.user) {
        setResolvedMember(result.response);
      } else {
        setResolvedMember(null);
        setLookupError(result?.message || "Member not found");
      }
      setResolving(false);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [memberId, resolveWalletMember, show]);

  const user = resolvedMember?.user;
  const balance = resolvedMember?.balance || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user?._id) return;
    onSubmit({
      userId: user._id,
      type,
      amount: Number(amount),
      remarks: remarks.trim(),
      txn_password: txnPassword,
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Adjust Wallet Balance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col md={6}>
              <MemberIdInput
                id="wallet_adjust_member_id"
                name="memberId"
                label="Member ID *"
                value={memberId}
                onChange={(e) => {
                  setMemberId(e.target.value);
                  setResolvedMember(null);
                  setLookupError("");
                }}
                disabled={submitting}
                showHint
                className={lookupError ? "invalid" : ""}
              />
              {resolving ? (
                <Form.Text className="text-muted">Finding member…</Form.Text>
              ) : null}
              {lookupError ? (
                <div className="invalid-feedback d-block">{lookupError}</div>
              ) : null}
            </Col>
            <Col md={6}>
              <Form.Group controlId="wallet_adjust_member_name">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  value={user?.name || ""}
                  placeholder={
                    resolving ? "Finding member…" : "Resolved member name"
                  }
                  readOnly
                  disabled
                />
              </Form.Group>
            </Col>
          </Row>

          {user ? (
            <div className="d-flex justify-content-between align-items-center border rounded bg-light p-3 mb-3">
              <span className="text-muted">Current balance</span>
              <strong className="fs-5">
                ₹{formatIndianNumber(balance)}
              </strong>
            </div>
          ) : null}

          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group controlId="wallet_adjust_type">
                <Form.Label>Type *</Form.Label>
                <CustomSelect
                  className="entity-form__select"
                  options={TYPE_OPTIONS}
                  value={getOptionByValue(TYPE_OPTIONS, type)}
                  onChange={(option) => setType(option?.value || "credit")}
                  isDisabled={submitting || !user}
                  isRequired
                />
                <Errors current_key="type" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="wallet_adjust_amount">
                <Form.Label>Amount (₹) *</Form.Label>
                <Form.Control
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  disabled={submitting || !user}
                  required
                />
                <Errors current_key="amount" />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="wallet_adjust_remarks">
            <Form.Label>Remarks</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              maxLength={500}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={submitting || !user}
              placeholder={
                type === "credit"
                  ? "Optional — auto: Admin credited ₹… to your wallet."
                  : "Optional — auto: Admin debited ₹… from your wallet."
              }
            />
            <Errors current_key="remarks" />
          </Form.Group>

          <Form.Group controlId="wallet_adjust_txn_password">
            <Form.Label className="fw-bold">Transaction Password *</Form.Label>
            <div className="position-relative">
              <Form.Control
                type={showPassword ? "text" : "password"}
                name="txn_password"
                value={txnPassword}
                onChange={(e) => setTxnPassword(e.target.value)}
                disabled={submitting || !user}
                required
                className={errorList?.txn_password ? "invalid" : ""}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-3"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible size={18} />
                ) : (
                  <AiOutlineEye size={18} />
                )}
              </button>
            </div>
            <Errors current_key="txn_password" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="btn btn--theme"
            disabled={submitting || resolving || !user}
          >
            {submitting
              ? "Saving…"
              : `Confirm ${type === "credit" ? "Credit" : "Debit"}`}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default WalletAdjustModal;
