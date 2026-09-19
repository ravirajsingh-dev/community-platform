import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Form, Row, Col } from "react-bootstrap";
import CustomModal from "@src/components/common/Modal/CustomModal";
import CustomSelect from "@src/components/common/CustomSelect";
import {
  GenderOptions,
  getOptionByValue,
} from "@src/constants/CustomSelectValues";

/**
 * Derives which marriages have this member as a child and their current order.
 * Order is NOT a member property; it belongs to the parent marriage.
 */
const getParentMarriagesForMember = (memberId, marriages, membersById) => {
  if (!memberId || !Array.isArray(marriages)) return [];
  const idStr = String(memberId);
  return marriages
    .map((mar) => {
      const sorted = mar.sortedChildren || [];
      const entry = sorted.find((e) => String(e.memberId) === idStr);
      if (!entry) return null;
      const s1 = membersById.get(String(mar.spouse1Id));
      const s2 = membersById.get(String(mar.spouse2Id));
      const label = [s1, s2]
        .map((m) => `${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—")
        .join(" + ");
      return { marriageId: mar._id, currentOrder: entry.order != null ? entry.order : null, label };
    })
    .filter(Boolean);
};

const FamilyMemberEditModal = ({ show, onHide, member, marriages = [], members = [], onSave }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "male",
    dob: "",
    isAlive: true,
    notes: "",
    txn_password: "",
    birthOrder: "",
    selectedMarriageId: "",
  });

  const membersById = useMemo(
    () => new Map((members || []).map((m) => [String(m._id), m])),
    [members],
  );

  const parentMarriages = useMemo(
    () => (member ? getParentMarriagesForMember(member._id, marriages, membersById) : []),
    [member, marriages, membersById],
  );

  const selectedParent = parentMarriages.find((p) => String(p.marriageId) === String(form.selectedMarriageId))
    || parentMarriages[0];

  useEffect(() => {
    if (!member) return;
    setForm((p) => {
      const firstParent = parentMarriages[0];
      const initialOrder = firstParent?.currentOrder != null ? String(firstParent.currentOrder) : "";
      return {
        ...p,
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        gender: member.gender || "other",
        dob: member.dob ? new Date(member.dob).toISOString().slice(0, 10) : "",
        isAlive: member.isAlive !== false,
        notes: member.notes || "",
        txn_password: "",
        birthOrder: initialOrder,
        selectedMarriageId: firstParent ? String(firstParent.marriageId) : "",
      };
    });
  }, [member, parentMarriages]);

  const parentMarriageOptions = useMemo(
    () =>
      parentMarriages.map((p) => ({
        value: p.marriageId,
        label: p.label,
      })),
    [parentMarriages],
  );

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleParentMarriageChange = (newMarriageId) => {
    update("selectedMarriageId", newMarriageId);
    const parent = parentMarriages.find((p) => String(p.marriageId) === String(newMarriageId));
    if (parent) {
      const order = parent.currentOrder != null ? String(parent.currentOrder) : "";
      setForm((p) => ({ ...p, birthOrder: order }));
    }
  };

  const submit = async () => {
    if (!member?._id) return;
    const memberPayload = {
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      dob: form.dob || undefined,
      isAlive: form.isAlive,
      notes: form.notes || undefined,
      txn_password: form.txn_password,
    };

    let orderContext = undefined;
    if (selectedParent && form.selectedMarriageId) {
      const orderStr = (form.birthOrder || "").trim();
      const newOrder = orderStr === "" ? null : (parseInt(orderStr, 10) || null);
      const currentOrder = selectedParent.currentOrder;
      if (newOrder !== currentOrder) {
        orderContext = {
          marriageId: selectedParent.marriageId,
          order: newOrder !== null && !Number.isNaN(newOrder) ? newOrder : null,
        };
      }
    }

    await onSave(member._id, memberPayload, orderContext);
    onHide();
  };

  return (
    <CustomModal
      show={show}
      onHide={onHide}
      title="Edit Member"
      size="lg"
      closeButton
      bodyClassName="common-modal-body--start"
      actions={[
        {
          label: "Cancel",
          onClick: onHide,
          className: "btn btn--outline",
          colSize: 5,
        },
        {
          label: "Save",
          onClick: submit,
          className: "btn btn--theme",
          colSize: 7,
          disabled: !form.txn_password.trim(),
        },
      ]}
    >
      <Form>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group controlId="first-name">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="last-name">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="gender">
              <Form.Label>Gender</Form.Label>
              <CustomSelect
                className="entity-form__select"
                options={GenderOptions}
                value={getOptionByValue(GenderOptions, form.gender)}
                onChange={(option) => update("gender", option?.value ?? "other")}
                isRequired
                placeholder="Select gender"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="date-of-birth">
              <Form.Label>Date of Birth</Form.Label>
              <Form.Control
                type="date"
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="FamilyMemberEditModal-field-5">
              <Form.Check
                type="checkbox"
                label="Alive"
                checked={!!form.isAlive}
                onChange={(e) => update("isAlive", e.target.checked)}
              />
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group controlId="notes">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Form.Group>
          </Col>

          {parentMarriages.length > 0 && (
            <>
              {parentMarriages.length > 1 && (
                <Col md={12}>
                  <Form.Group controlId="birth-order-for-parents">
                    <Form.Label>Birth order for (parents)</Form.Label>
                    <CustomSelect
                      className="entity-form__select"
                      options={parentMarriageOptions}
                      value={getOptionByValue(
                        parentMarriageOptions,
                        form.selectedMarriageId,
                      )}
                      onChange={(option) =>
                        handleParentMarriageChange(option?.value ?? "")
                      }
                      isRequired
                      placeholder="Select parents"
                    />
                  </Form.Group>
                </Col>
              )}
              <Col md={6}>
                <Form.Group controlId="birth-order-optional">
                  <Form.Label>Birth Order (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    placeholder="1 = eldest, 2 = second… Leave empty to clear"
                    value={form.birthOrder}
                    onChange={(e) => update("birthOrder", e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Stored with parents, not on member. Leave empty to clear.
                  </Form.Text>
                </Form.Group>
              </Col>
            </>
          )}

          <Col md={12}>
            <Form.Group controlId="transaction-password">
              <Form.Label>Transaction Password</Form.Label>
              <Form.Control
                type="password"
                value={form.txn_password}
                onChange={(e) => update("txn_password", e.target.value)}
                placeholder="Required to save changes"
                required
              />
            </Form.Group>
          </Col>
        </Row>
      </Form>
    </CustomModal>
  );
};

FamilyMemberEditModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  member: PropTypes.object,
  marriages: PropTypes.array,
  members: PropTypes.array,
  onSave: PropTypes.func.isRequired,
};

export default FamilyMemberEditModal;
