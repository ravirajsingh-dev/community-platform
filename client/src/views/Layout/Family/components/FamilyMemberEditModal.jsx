import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Form, Row, Col } from "react-bootstrap";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import CustomSelect from "@src/views/Common/CustomSelect";
import {
  GenderOptions,
  getOptionByValue,
} from "@src/constants/CustomSelectValues";

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
      return {
        marriageId: mar._id,
        currentOrder: entry.order != null ? entry.order : null,
        label,
      };
    })
    .filter(Boolean);
};

const FamilyMemberEditModal = ({
  show,
  onHide,
  member,
  marriages = [],
  members = [],
  onSave,
}) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "male",
    dob: "",
    isAlive: true,
    dateOfDeath: "",
    notes: "",
    birthOrder: "",
    selectedMarriageId: "",
  });

  const membersById = useMemo(
    () => new Map((members || []).map((m) => [String(m._id), m])),
    [members],
  );

  const parentMarriages = useMemo(
    () =>
      member ? getParentMarriagesForMember(member._id, marriages, membersById) : [],
    [member, marriages, membersById],
  );

  const selectedParent =
    parentMarriages.find(
      (p) => String(p.marriageId) === String(form.selectedMarriageId),
    ) || parentMarriages[0];

  const parentMarriageOptions = useMemo(
    () =>
      parentMarriages.map((p) => ({
        value: p.marriageId,
        label: p.label,
      })),
    [parentMarriages],
  );

  useEffect(() => {
    if (!member) return;
    const firstParent = parentMarriages[0];
    const initialOrder =
      firstParent?.currentOrder != null ? String(firstParent.currentOrder) : "";
    setForm((p) => ({
      ...p,
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      gender: member.gender || "other",
      dob: member.dob ? new Date(member.dob).toISOString().slice(0, 10) : "",
      isAlive: member.isAlive !== false,
      dateOfDeath: member.dateOfDeath
        ? new Date(member.dateOfDeath).toISOString().slice(0, 10)
        : "",
      notes: member.notes || "",
      birthOrder: initialOrder,
      selectedMarriageId: firstParent ? String(firstParent.marriageId) : "",
    }));
  }, [member, parentMarriages]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleParentMarriageChange = (newMarriageId) => {
    update("selectedMarriageId", newMarriageId);
    const parent = parentMarriages.find(
      (p) => String(p.marriageId) === String(newMarriageId),
    );
    if (parent) {
      const order =
        parent.currentOrder != null ? String(parent.currentOrder) : "";
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
      dateOfDeath:
        form.isAlive === false && form.dateOfDeath ? form.dateOfDeath : undefined,
      notes: form.notes || undefined,
    };

    const origDob = member.dob
      ? new Date(member.dob).toISOString().slice(0, 10)
      : "";
    const origIsAlive = member.isAlive !== false;
    const origDateOfDeath =
      !origIsAlive && member.dateOfDeath
        ? new Date(member.dateOfDeath).toISOString().slice(0, 10)
        : undefined;
    const originalMemberPayload = {
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      gender: member.gender || "other",
      dob: origDob || undefined,
      isAlive: origIsAlive,
      dateOfDeath: origDateOfDeath,
      notes: member.notes || undefined,
    };
    const isMemberChanged =
      memberPayload.firstName !== originalMemberPayload.firstName ||
      memberPayload.lastName !== originalMemberPayload.lastName ||
      memberPayload.gender !== originalMemberPayload.gender ||
      (memberPayload.dob || "") !== (originalMemberPayload.dob || "") ||
      memberPayload.isAlive !== originalMemberPayload.isAlive ||
      (memberPayload.dateOfDeath || "") !==
        (originalMemberPayload.dateOfDeath || "") ||
      (memberPayload.notes || "") !== (originalMemberPayload.notes || "");

    let orderContext = undefined;
    if (selectedParent && form.selectedMarriageId) {
      const orderStr = (form.birthOrder || "").trim();
      const order = orderStr === "" ? null : parseInt(orderStr, 10) || null;
      orderContext = {
        marriageId: selectedParent.marriageId,
        order: order !== null && !Number.isNaN(order) ? order : null,
      };
    }
    const currentOrder = selectedParent?.currentOrder;
    const newOrder = orderContext?.order;
    const isOrderChanged = orderContext != null && newOrder !== currentOrder;

    await onSave(member._id, {
      memberPayload,
      orderContext,
      isMemberChanged,
      isOrderChanged,
    });
    onHide();
  };

  return (
    <AdvancedModal
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
        },
      ]}
    >
      <Form>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group controlId="family-edit-first-name">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="family-edit-last-name">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="family-edit-gender">
              <Form.Label>Gender</Form.Label>
              <CustomSelect
                options={GenderOptions}
                value={getOptionByValue(GenderOptions, form.gender)}
                onChange={(option) => update("gender", option?.value ?? "other")}
                isRequired
                placeholder="Select gender"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="family-edit-dob">
              <Form.Label>Date of Birth</Form.Label>
              <Form.Control
                type="date"
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="family-edit-is-alive">
              <Form.Check
                type="switch"
                id="edit-member-isAlive"
                label={form.isAlive ? "Alive" : "Deceased"}
                checked={!!form.isAlive}
                onChange={(e) => update("isAlive", e.target.checked)}
              />
            </Form.Group>
          </Col>
          {form.isAlive === false && (
            <Col md={6}>
              <Form.Group controlId="family-edit-date-of-death">
                <Form.Label>Date of Death</Form.Label>
                <Form.Control
                  type="date"
                  value={form.dateOfDeath}
                  onChange={(e) => update("dateOfDeath", e.target.value)}
                />
              </Form.Group>
            </Col>
          )}
          <Col md={12}>
            <Form.Group controlId="family-edit-notes">
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
                  <Form.Group controlId="family-edit-parent-marriage">
                    <Form.Label>Birth order for (parents)</Form.Label>
                    <CustomSelect
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
                <Form.Group controlId="family-edit-birth-order">
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
        </Row>
      </Form>
    </AdvancedModal>
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
