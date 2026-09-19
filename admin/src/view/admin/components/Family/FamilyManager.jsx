import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Badge,
  Alert,
} from "react-bootstrap";

import CustomModal from "@src/components/common/Modal/CustomModal";
import CustomSelect from "@src/components/common/CustomSelect";
import MemberIdInput from "@src/components/common/MemberIdInput";
import {
  GenderOptions,
  Spouse2ModeOptions,
  ChildModeOptions,
  getOptionByValue,
} from "@src/constants/CustomSelectValues";

import {
  resolveFamilyUser,
  loadUserFamilyFlat,
  loadUserFamilyTree,
  initUserFamily,
  createAdminFamilyMember,
  updateAdminFamilyMember,
  createAdminFamilyMarriage,
  addAdminFamilyChild,
  updateAdminFamilyChildOrder,
  deleteAdminFamilyMember,
  updateAdminFamilyMarriage,
} from "@src/actions/adminFamilyActions";

import { adminFamilyService } from "@src/services/familyService";
import FamilyTreeView from "./FamilyTreeView";
import FamilyMemberEditModal from "./FamilyMemberEditModal";
import FamilyMemberDeleteModal from "./FamilyMemberDeleteModal";
import MarriageEndModal from "./MarriageEndModal";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";

/** Single source for member display name (firstName + lastName or "Unnamed"). */
const getMemberDisplayName = (m) =>
  (m
    ? `${(m.firstName || "").trim()} ${(m.lastName || "").trim()}`.trim()
    : "") || "Unnamed";

const INITIAL_MEMBER_FORM = { firstName: "", lastName: "", gender: "male" };
const INITIAL_MARRIAGE_FORM = {
  spouse1Id: "",
  spouse2Mode: "existing",
  spouse2Id: "",
  spouse2FirstName: "",
  spouse2LastName: "",
  spouse2Gender: "female",
};
const INITIAL_CHILD_FORM = {
  marriageId: "",
  childMode: "new",
  childId: "",
  childFirstName: "",
  childLastName: "",
  childGender: "male",
  childDob: "",
  childOrder: "",
};

const FamilyManager = ({
  adminFamily,
  resolveFamilyUser,
  loadUserFamilyFlat,
  loadUserFamilyTree,
  initUserFamily,
  createAdminFamilyMember,
  updateAdminFamilyMember,
  createAdminFamilyMarriage,
  addAdminFamilyChild,
  updateAdminFamilyChildOrder,
  deleteAdminFamilyMember,
  updateAdminFamilyMarriage,
}) => {
  const {
    targetUser,
    family,
    members,
    marriages,
    tree,
    loading,
    loadingTree,
    error,
  } = adminFamily;

  const [lookup, setLookup] = useState({ memberId: "", userId: "" });
  const [rootMale, setRootMale] = useState({ firstName: "", lastName: "" });
  const [rootFemale, setRootFemale] = useState({ firstName: "", lastName: "" });

  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER_FORM);
  const [marriageForm, setMarriageForm] = useState(INITIAL_MARRIAGE_FORM);
  const [childForm, setChildForm] = useState(INITIAL_CHILD_FORM);

  const [editMember, setEditMember] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteMember, setDeleteMember] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [endMarriage, setEndMarriage] = useState(null);
  const [showEndMarriage, setShowEndMarriage] = useState(false);
  const [pendingChildOrder, setPendingChildOrder] = useState(null);
  const [childOrderTxnPassword, setChildOrderTxnPassword] = useState("");

  const [eligibleSpouseIds, setEligibleSpouseIds] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [eligibleChildIds, setEligibleChildIds] = useState([]);
  const [loadingEligibleChildren, setLoadingEligibleChildren] = useState(false);

  useEffect(() => {
    if (targetUser?._id) {
      loadUserFamilyFlat(targetUser._id);
      loadUserFamilyTree(targetUser._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUser?._id]);

  useEffect(() => {
    if (!targetUser?._id || !marriageForm.spouse1Id) {
      setEligibleSpouseIds([]);
      return;
    }
    let cancelled = false;
    setLoadingEligible(true);
    adminFamilyService
      .getEligibleSpouses(targetUser._id, marriageForm.spouse1Id)
      .then((res) => {
        if (cancelled || !res?.response?.eligible) return;
        setEligibleSpouseIds(
          (res.response.eligible || []).map((id) => String(id)),
        );
      })
      .catch(() => {
        if (!cancelled) setEligibleSpouseIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUser?._id, marriageForm.spouse1Id]);

  useEffect(() => {
    if (!targetUser?._id || !childForm.marriageId) {
      setEligibleChildIds([]);
      return;
    }
    let cancelled = false;
    setLoadingEligibleChildren(true);
    adminFamilyService
      .getEligibleChildren(targetUser._id, childForm.marriageId)
      .then((res) => {
        if (cancelled || !res?.response?.eligible) return;
        setEligibleChildIds(
          (res.response.eligible || []).map((id) => String(id)),
        );
      })
      .catch(() => {
        if (!cancelled) setEligibleChildIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEligibleChildren(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUser?._id, childForm.marriageId]);

  const memberOptions = useMemo(
    () =>
      (members || []).map((m) => ({
        value: m._id,
        label: getMemberDisplayName(m),
      })),
    [members],
  );

  const marriageOptions = useMemo(() => {
    const byId = new Map((members || []).map((m) => [m._id, m]));
    return (marriages || []).map((mar) => {
      const s1 = byId.get(mar.spouse1Id);
      const s2 = byId.get(mar.spouse2Id);
      const label = [
        getMemberDisplayName(s1 || { firstName: "Spouse 1" }),
        getMemberDisplayName(s2 || { firstName: "Spouse 2" }),
      ].join(" + ");
      return { value: mar._id, label };
    });
  }, [marriages, members]);

  const familyInitialized = !!(family?.rootMemberId || family?.rootMarriageId);

  const doResolve = async (e) => {
    e.preventDefault();
    await resolveFamilyUser({
      memberId: lookup.memberId || undefined,
      userId: lookup.userId || undefined,
    });
  };

  const doInit = async (e) => {
    e.preventDefault();
    if (!targetUser?._id) return;
    await initUserFamily(targetUser._id, {
      rootMale: rootMale.firstName ? rootMale : undefined,
      rootFemale: rootFemale.firstName ? rootFemale : undefined,
    });
    await loadUserFamilyTree(targetUser._id);
  };

  const submitMember = async (e) => {
    e.preventDefault();
    if (!targetUser?._id) return;
    await createAdminFamilyMember(targetUser._id, memberForm);
    setMemberForm(INITIAL_MEMBER_FORM);
    await loadUserFamilyTree(targetUser._id);
  };

  const submitMarriage = async (e) => {
    e.preventDefault();
    if (!targetUser?._id) return;
    if (!marriageForm.spouse1Id) return;

    const payload =
      marriageForm.spouse2Mode === "existing"
        ? {
            spouse1Id: marriageForm.spouse1Id,
            spouse2Id: marriageForm.spouse2Id,
          }
        : {
            spouse1Id: marriageForm.spouse1Id,
            spouse2: {
              firstName: marriageForm.spouse2FirstName,
              lastName: marriageForm.spouse2LastName,
              gender: marriageForm.spouse2Gender,
            },
          };

    await createAdminFamilyMarriage(targetUser._id, payload);
    setMarriageForm((p) => ({
      ...p,
      ...INITIAL_MARRIAGE_FORM,
      spouse1Id: p.spouse1Id,
      spouse2Mode: p.spouse2Mode,
    }));
    await loadUserFamilyTree(targetUser._id);
  };

  const submitChild = async (e) => {
    e.preventDefault();
    if (!targetUser?._id) return;
    if (!childForm.marriageId) return;

    const orderNum = childForm.childOrder.trim()
      ? parseInt(childForm.childOrder, 10)
      : undefined;
    const payload =
      childForm.childMode === "existing"
        ? { childId: childForm.childId, order: orderNum }
        : {
            child: {
              firstName: childForm.childFirstName,
              lastName: childForm.childLastName,
              gender: childForm.childGender,
              ...(childForm.childDob ? { dob: childForm.childDob } : {}),
            },
            order: orderNum,
          };

    await addAdminFamilyChild(targetUser._id, childForm.marriageId, payload);
    setChildForm((p) => ({
      ...INITIAL_CHILD_FORM,
      marriageId: p.marriageId,
      childMode: p.childMode,
    }));
    await loadUserFamilyTree(targetUser._id);
  };

  const membersById = useMemo(
    () => new Map((members || []).map((m) => [String(m._id), m])),
    [members],
  );

  const requestChildOrderChange = (marriageId, childId, newOrder) => {
    const num = parseInt(newOrder, 10);
    if (!Number.isInteger(num) || num < 1) return;
    setPendingChildOrder({ marriageId, childId, order: num });
    setChildOrderTxnPassword("");
  };

  const confirmChildOrderChange = async () => {
    if (!targetUser?._id || !pendingChildOrder || !childOrderTxnPassword.trim())
      return;
    await updateAdminFamilyChildOrder(
      targetUser._id,
      pendingChildOrder.marriageId,
      pendingChildOrder.childId,
      {
        order: pendingChildOrder.order,
        txn_password: childOrderTxnPassword.trim(),
      },
    );
    setPendingChildOrder(null);
    setChildOrderTxnPassword("");
    await loadUserFamilyFlat(targetUser._id);
    await loadUserFamilyTree(targetUser._id);
  };

  const openEdit = (m) => {
    setEditMember(m);
    setShowEdit(true);
  };

  const saveEdit = async (memberId, payload, orderContext) => {
    if (!targetUser?._id) return;
    await updateAdminFamilyMember(targetUser._id, memberId, payload);
    if (orderContext && payload?.txn_password) {
      await updateAdminFamilyChildOrder(
        targetUser._id,
        orderContext.marriageId,
        memberId,
        {
          order: orderContext.order,
          txn_password: payload.txn_password,
        },
      );
    }
    await loadUserFamilyFlat(targetUser._id);
    await loadUserFamilyTree(targetUser._id);
  };

  return (
    <div className="p-3">
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <h4 className="mb-1">Family Management</h4>
          <div className="text-muted small">
            Admin-managed vanshavriksh: view any user tree, add/edit members
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <h5 className="mb-3">Load User</h5>
          <Form onSubmit={doResolve}>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <MemberIdInput
                  id="member-id"
                  name="memberId"
                  value={lookup.memberId}
                  onChange={(e) =>
                    setLookup((p) => ({ ...p, memberId: e.target.value }))
                  }
                />
              </Col>
              <Col md={4}>
                <Form.Label htmlFor="user-id">User ID</Form.Label>
                <Form.Control id="user-id"
                  value={lookup.userId}
                  onChange={(e) =>
                    setLookup((p) => ({ ...p, userId: e.target.value }))
                  }
                  placeholder="Mongo ObjectId"
                />
              </Col>
              <Col md={2}>
                <Button type="submit" className="w-100" disabled={loading}>
                  Load
                </Button>
              </Col>
              <Col md={2}>
                <Button
                  variant="outline-secondary"
                  className="w-100"
                  disabled={!targetUser?._id}
                  onClick={() => {
                    if (!targetUser?._id) return;
                    loadUserFamilyFlat(targetUser._id);
                    loadUserFamilyTree(targetUser._id);
                  }}
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          </Form>

          {targetUser && (
            <div className="mt-3">
              <Badge bg="primary" className="me-2">
                {targetUser.memberId}
              </Badge>
              <span className="fw-semibold">{targetUser.name}</span>
              <span className="text-muted ms-2">{targetUser._id}</span>
            </div>
          )}
        </Card.Body>
      </Card>

      {error?.msg && (
        <Alert variant="danger" className="shadow-sm">
          {error.msg}
        </Alert>
      )}

      {!targetUser?._id ? (
        <Card className="shadow-sm">
          <Card.Body className="text-muted">
            Load a user to manage their family.
          </Card.Body>
        </Card>
      ) : (
        <>
          {!familyInitialized ? (
            <Card className="shadow-sm mb-3">
              <Card.Body>
                <h5 className="mb-3">Initialize Root</h5>
                <Form onSubmit={doInit}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Card className="h-100">
                        <Card.Body>
                          <h6 className="mb-3">Root Male</h6>
                          <Row className="g-2">
                            <Col md={6}>
                              <Form.Control
                                placeholder="First name"
                                value={rootMale.firstName}
                                onChange={(e) =>
                                  setRootMale((p) => ({
                                    ...p,
                                    firstName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                            <Col md={6}>
                              <Form.Control
                                placeholder="Last name"
                                value={rootMale.lastName}
                                onChange={(e) =>
                                  setRootMale((p) => ({
                                    ...p,
                                    lastName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                          </Row>
                          <div className="text-muted small mt-2">
                            Gender is set to Male
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="h-100">
                        <Card.Body>
                          <h6 className="mb-3">Root Female</h6>
                          <Row className="g-2">
                            <Col md={6}>
                              <Form.Control
                                placeholder="First name"
                                value={rootFemale.firstName}
                                onChange={(e) =>
                                  setRootFemale((p) => ({
                                    ...p,
                                    firstName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                            <Col md={6}>
                              <Form.Control
                                placeholder="Last name"
                                value={rootFemale.lastName}
                                onChange={(e) =>
                                  setRootFemale((p) => ({
                                    ...p,
                                    lastName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                          </Row>
                          <div className="text-muted small mt-2">
                            Gender is set to Female
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={12} className="d-flex justify-content-end">
                      <Button type="submit" disabled={loading}>
                        Initialize Family
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          ) : (
            <>
              <Card className="shadow-sm mb-3">
                <Card.Body>
                  <h5 className="mb-3">Add Member</h5>
                  <Form onSubmit={submitMember}>
                    <Row className="g-3 align-items-end">
                      <Col md={4}>
                        <Form.Label htmlFor="first-name">First Name</Form.Label>
                        <Form.Control id="first-name"
                          value={memberForm.firstName}
                          onChange={(e) =>
                            setMemberForm((p) => ({
                              ...p,
                              firstName: e.target.value,
                            }))
                          }
                          required
                        />
                      </Col>
                      <Col md={4}>
                        <Form.Label htmlFor="last-name">Last Name</Form.Label>
                        <Form.Control id="last-name"
                          value={memberForm.lastName}
                          onChange={(e) =>
                            setMemberForm((p) => ({
                              ...p,
                              lastName: e.target.value,
                            }))
                          }
                        />
                      </Col>
                      <Col md={2}>
                        <Form.Label htmlFor="gender">Gender</Form.Label>
                        <CustomSelect
                          id="gender"
                          className="entity-form__select"
                          options={GenderOptions}
                          value={getOptionByValue(GenderOptions, memberForm.gender)}
                          onChange={(option) =>
                            setMemberForm((p) => ({
                              ...p,
                              gender: option?.value ?? "male",
                            }))
                          }
                          isRequired
                          placeholder="Select gender"
                        />
                      </Col>
                      <Col md={2}>
                        <Button
                          type="submit"
                          className="w-100"
                          disabled={loading}
                        >
                          Add
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Card.Body>
              </Card>

              <Card className="shadow-sm mb-3">
                <Card.Body>
                  <h5 className="mb-3">Create Marriage</h5>
                  <Form onSubmit={submitMarriage}>
                    <Row className="g-3 align-items-end">
                      <Col md={4}>
                        <Form.Label htmlFor="spouse-1">Spouse 1</Form.Label>
                        <CustomSelect
                          id="spouse-1"
                          className="entity-form__select"
                          options={memberOptions}
                          value={getOptionByValue(
                            memberOptions,
                            marriageForm.spouse1Id,
                          )}
                          onChange={(option) =>
                            setMarriageForm((p) => ({
                              ...p,
                              spouse1Id: option?.value ?? "",
                            }))
                          }
                          isRequired
                          placeholder="Select member"
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Label htmlFor="spouse-2-mode">Spouse 2 Mode</Form.Label>
                        <CustomSelect
                          id="spouse-2-mode"
                          className="entity-form__select"
                          options={Spouse2ModeOptions}
                          value={getOptionByValue(
                            Spouse2ModeOptions,
                            marriageForm.spouse2Mode,
                          )}
                          onChange={(option) =>
                            setMarriageForm((p) => ({
                              ...p,
                              spouse2Mode: option?.value ?? "existing",
                            }))
                          }
                          isRequired
                          placeholder="Select mode"
                        />
                      </Col>
                      {marriageForm.spouse2Mode === "existing" ? (
                        <Col md={3}>
                          <Form.Label htmlFor="spouse-2">Spouse 2</Form.Label>
                          <CustomSelect
                            id="spouse-2"
                            className="entity-form__select"
                            options={
                              eligibleSpouseIds.length > 0
                                ? memberOptions.filter((o) =>
                                    eligibleSpouseIds.includes(String(o.value)),
                                  )
                                : memberOptions
                            }
                            value={getOptionByValue(
                              eligibleSpouseIds.length > 0
                                ? memberOptions.filter((o) =>
                                    eligibleSpouseIds.includes(String(o.value)),
                                  )
                                : memberOptions,
                              marriageForm.spouse2Id,
                            )}
                            onChange={(option) =>
                              setMarriageForm((p) => ({
                                ...p,
                                spouse2Id: option?.value ?? "",
                              }))
                            }
                            isDisabled={loadingEligible}
                            isLoading={loadingEligible}
                            isRequired
                            placeholder={
                              loadingEligible ? "Loading…" : "Select member"
                            }
                          />
                          {eligibleSpouseIds.length > 0 && (
                            <Form.Text className="text-muted small">
                              Only eligible spouses shown
                            </Form.Text>
                          )}
                        </Col>
                      ) : (
                        <>
                          <Col md={2}>
                            <Form.Label htmlFor="first-name-2">First Name</Form.Label>
                            <Form.Control id="first-name-2"
                              value={marriageForm.spouse2FirstName}
                              onChange={(e) =>
                                setMarriageForm((p) => ({
                                  ...p,
                                  spouse2FirstName: e.target.value,
                                }))
                              }
                              required
                            />
                          </Col>
                          <Col md={2}>
                            <Form.Label htmlFor="gender-2">Gender</Form.Label>
                            <CustomSelect
                              id="gender-2"
                              className="entity-form__select"
                              options={GenderOptions}
                              value={getOptionByValue(
                                GenderOptions,
                                marriageForm.spouse2Gender,
                              )}
                              onChange={(option) =>
                                setMarriageForm((p) => ({
                                  ...p,
                                  spouse2Gender: option?.value ?? "female",
                                }))
                              }
                              isRequired
                              placeholder="Select gender"
                            />
                          </Col>
                        </>
                      )}
                      <Col md={2}>
                        <Button
                          type="submit"
                          className="w-100"
                          disabled={loading}
                        >
                          Create
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Card.Body>
              </Card>

              <Card className="shadow-sm mb-3">
                <Card.Body>
                  <h5 className="mb-3">Add Child to Marriage</h5>
                  <Form onSubmit={submitChild}>
                    <Row className="g-3 align-items-end">
                      <Col md={5}>
                        <Form.Label htmlFor="marriage">Marriage</Form.Label>
                        <CustomSelect
                          id="marriage"
                          className="entity-form__select"
                          options={marriageOptions}
                          value={getOptionByValue(
                            marriageOptions,
                            childForm.marriageId,
                          )}
                          onChange={(option) =>
                            setChildForm((p) => ({
                              ...p,
                              marriageId: option?.value ?? "",
                            }))
                          }
                          isRequired
                          placeholder="Select marriage"
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Label htmlFor="child-mode">Child Mode</Form.Label>
                        <CustomSelect
                          id="child-mode"
                          className="entity-form__select"
                          options={ChildModeOptions}
                          value={getOptionByValue(
                            ChildModeOptions,
                            childForm.childMode,
                          )}
                          onChange={(option) =>
                            setChildForm((p) => ({
                              ...p,
                              childMode: option?.value ?? "new",
                            }))
                          }
                          isRequired
                          placeholder="Select mode"
                        />
                      </Col>
                      {childForm.childMode === "existing" ? (
                        <Col md={2}>
                          <Form.Label htmlFor="child">Child</Form.Label>
                          <CustomSelect
                            id="child"
                            className="entity-form__select"
                            options={
                              eligibleChildIds.length > 0
                                ? memberOptions.filter((o) =>
                                    eligibleChildIds.includes(String(o.value)),
                                  )
                                : memberOptions
                            }
                            value={getOptionByValue(
                              eligibleChildIds.length > 0
                                ? memberOptions.filter((o) =>
                                    eligibleChildIds.includes(String(o.value)),
                                  )
                                : memberOptions,
                              childForm.childId,
                            )}
                            onChange={(option) =>
                              setChildForm((p) => ({
                                ...p,
                                childId: option?.value ?? "",
                              }))
                            }
                            isDisabled={loadingEligibleChildren}
                            isLoading={loadingEligibleChildren}
                            isRequired
                            placeholder={
                              loadingEligibleChildren
                                ? "Loading…"
                                : "Select member"
                            }
                          />
                          {eligibleChildIds.length > 0 && (
                            <Form.Text className="text-muted small">
                              Only eligible members shown
                            </Form.Text>
                          )}
                        </Col>
                      ) : (
                        <>
                          <Col md={2}>
                            <Form.Label htmlFor="first-name-3">First Name</Form.Label>
                            <Form.Control id="first-name-3"
                              value={childForm.childFirstName}
                              onChange={(e) =>
                                setChildForm((p) => ({
                                  ...p,
                                  childFirstName: e.target.value,
                                }))
                              }
                              required
                            />
                          </Col>
                          <Col md={2}>
                            <Form.Label htmlFor="gender-3">Gender</Form.Label>
                            <CustomSelect
                              id="gender-3"
                              className="entity-form__select"
                              options={GenderOptions}
                              value={getOptionByValue(
                                GenderOptions,
                                childForm.childGender,
                              )}
                              onChange={(option) =>
                                setChildForm((p) => ({
                                  ...p,
                                  childGender: option?.value ?? "male",
                                }))
                              }
                              isRequired
                              placeholder="Select gender"
                            />
                          </Col>
                        </>
                      )}
                      <Col md={2}>
                        <Form.Label className="text-nowrap" htmlFor="dob-optional">
                          DOB (optional)
                        </Form.Label>
                        <Form.Control id="dob-optional"
                          type="date"
                          value={childForm.childDob}
                          onChange={(e) =>
                            setChildForm((p) => ({
                              ...p,
                              childDob: e.target.value,
                            }))
                          }
                        />
                      </Col>
                      <Col md={2}>
                        <Form.Label className="text-nowrap" htmlFor="order-optional">
                          Order (optional)
                        </Form.Label>
                        <Form.Control id="order-optional"
                          type="number"
                          min={1}
                          placeholder="1 = sabse bada, 2 = doosra..."
                          value={childForm.childOrder}
                          onChange={(e) =>
                            setChildForm((p) => ({
                              ...p,
                              childOrder: e.target.value,
                            }))
                          }
                        />
                      </Col>
                      <Col md={2}>
                        <Button
                          type="submit"
                          className="w-100"
                          disabled={loading}
                        >
                          Add
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Card.Body>
              </Card>

              <Card className="shadow-sm mb-3">
                <Card.Body>
                  <h5 className="mb-3">Marriages & Children (correct order)</h5>
                  <div className="d-flex flex-wrap gap-2">
                    {(marriages || []).map((mar) => {
                      const s1 = membersById.get(String(mar.spouse1Id));
                      const s2 = membersById.get(String(mar.spouse2Id));
                      const label = [
                        getMemberDisplayName(s1 || { firstName: "Spouse 1" }),
                        getMemberDisplayName(s2 || { firstName: "Spouse 2" }),
                      ].join(" + ");
                      const sortedChildren = mar.sortedChildren || [];
                      const isActive = (mar.status || "active") === "active";
                      return (
                        <Card
                          key={mar._id}
                          className="border family-tree__marriage-card"
                        >
                          <Card.Body className="py-2 px-3">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-1">
                              <div className="small text-break fw-semibold">
                                {label}
                              </div>
                              {isActive && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => {
                                    setEndMarriage(mar);
                                    setShowEndMarriage(true);
                                  }}
                                  disabled={loading}
                                >
                                  End marriage
                                </Button>
                              )}
                            </div>
                            {sortedChildren.length > 0 ? (
                              <div className="mt-2 pt-2 border-top small">
                                <span className="text-muted me-1">
                                  Children:
                                </span>
                                {sortedChildren.map((entry, idx) => {
                                  const mem = membersById.get(
                                    String(entry.memberId),
                                  );
                                  const name = mem
                                    ? getMemberDisplayName(mem)
                                    : "—";
                                  return (
                                    <div
                                      key={entry.memberId}
                                      className="d-flex align-items-center gap-1 mt-1"
                                    >
                                      <span className="text-nowrap">
                                        {idx + 1}. {name}
                                      </span>
                                      {entry.order != null && (
                                        <Badge
                                          bg="light"
                                          text="dark"
                                          className="small"
                                        >
                                          #{entry.order}
                                        </Badge>
                                      )}
                                      <Form.Control
                                        type="number"
                                        size="sm"
                                        className="d-inline-block family-tree__child-order-input"
                                        min={1}
                                        placeholder="order"
                                        defaultValue={entry.order ?? ""}
                                        onBlur={(e) => {
                                          const v = e.target.value.trim();
                                          if (v && targetUser?._id) {
                                            const n = parseInt(v, 10);
                                            if (
                                              Number.isInteger(n) &&
                                              n >= 1 &&
                                              n !== entry.order
                                            ) {
                                              requestChildOrderChange(
                                                mar._id,
                                                entry.memberId,
                                                n,
                                              );
                                            }
                                          }
                                        }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-muted small">
                                No children
                              </span>
                            )}
                          </Card.Body>
                        </Card>
                      );
                    })}
                    {(marriages || []).length === 0 && (
                      <span className="text-muted small">
                        No marriages yet.
                      </span>
                    )}
                  </div>
                </Card.Body>
              </Card>

              <Card className="shadow-sm mb-3">
                <Card.Body>
                  <h5 className="mb-3">Members</h5>
                  <CustomDataTable
                    columns={[
                      {
                        name: "Name",
                        selector: (row) => getMemberDisplayName(row),
                        width: "200px",
                        wrap: true,
                      },
                      {
                        name: "Gender",
                        selector: (row) => row.gender || "other",
                        cell: (row) => (
                          <span className="text-capitalize">
                            {row.gender || "other"}
                          </span>
                        ),
                        width: "100px",
                      },
                      {
                        name: "Status",
                        selector: (row) => row.isAlive,
                        cell: (row) =>
                          row.isAlive === false ? (
                            <Badge bg="secondary">Deceased</Badge>
                          ) : (
                            <Badge bg="success">Alive</Badge>
                          ),
                        width: "120px",
                      },
                      {
                        name: "Action",
                        width: "160px",
                        cell: (row) => (
                          <span className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setDeleteMember(row);
                                setShowDelete(true);
                              }}
                            >
                              Delete
                            </Button>
                          </span>
                        ),
                      },
                    ]}
                    data={members || []}
                    progressPending={loading}
                    pagination={false}
                    responsive
                    highlightOnHover
                    persistTableHead
                    noDataComponent="No members yet."
                  />
                </Card.Body>
              </Card>
            </>
          )}

          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="mb-0">Family Tree</h5>
                <div className="text-muted small">
                  {loadingTree ? "Loading..." : "Read-only view"}
                </div>
              </div>
              <FamilyTreeView treeData={tree} />
            </Card.Body>
          </Card>

          <FamilyMemberEditModal
            show={showEdit}
            onHide={() => setShowEdit(false)}
            member={editMember}
            marriages={marriages}
            members={members}
            onSave={saveEdit}
          />

          <FamilyMemberDeleteModal
            show={showDelete}
            onHide={() => {
              setShowDelete(false);
              setDeleteMember(null);
            }}
            member={deleteMember}
            targetUserId={targetUser?._id}
            onConfirm={async (memberId, mode, txnPassword) => {
              if (!targetUser?._id) return;
              await deleteAdminFamilyMember(targetUser._id, memberId, {
                mode,
                txn_password: txnPassword,
              });
              setShowDelete(false);
              setDeleteMember(null);
            }}
            loading={loading}
          />

          <MarriageEndModal
            show={showEndMarriage}
            onHide={() => {
              setShowEndMarriage(false);
              setEndMarriage(null);
            }}
            marriage={endMarriage}
            membersById={membersById}
            getMemberDisplayName={getMemberDisplayName}
            targetUserId={targetUser?._id}
            onConfirm={async (marriageId, payload) => {
              if (!targetUser?._id) return;
              await updateAdminFamilyMarriage(
                targetUser._id,
                marriageId,
                payload,
              );
              setShowEndMarriage(false);
              setEndMarriage(null);
            }}
            loading={loading}
          />

          {pendingChildOrder && (
            <CustomModal
              show
              onHide={() => setPendingChildOrder(null)}
              title="Confirm child order change"
              size="md"
              closeButton
              bodyClassName="common-modal-body--start"
              actions={[
                {
                  label: "Cancel",
                  onClick: () => setPendingChildOrder(null),
                  className: "btn btn--outline",
                  colSize: 5,
                  disabled: loading,
                },
                {
                  label: loading ? "Updating…" : "Update order",
                  onClick: confirmChildOrderChange,
                  className: "btn btn--theme",
                  colSize: 7,
                  disabled: loading || !childOrderTxnPassword.trim(),
                },
              ]}
            >
              <p className="mb-2">
                Update birth order to{" "}
                <strong>{pendingChildOrder.order}</strong>? Transaction
                password required.
              </p>
              <Form.Group controlId="transaction-password">
                <Form.Label>Transaction password</Form.Label>
                <Form.Control
                  type="password"
                  value={childOrderTxnPassword}
                  onChange={(e) => setChildOrderTxnPassword(e.target.value)}
                  placeholder="Enter transaction password"
                  autoComplete="off"
                />
              </Form.Group>
            </CustomModal>
          )}
        </>
      )}
    </div>
  );
};

FamilyManager.propTypes = {
  adminFamily: PropTypes.object.isRequired,
  resolveFamilyUser: PropTypes.func.isRequired,
  loadUserFamilyFlat: PropTypes.func.isRequired,
  loadUserFamilyTree: PropTypes.func.isRequired,
  initUserFamily: PropTypes.func.isRequired,
  createAdminFamilyMember: PropTypes.func.isRequired,
  updateAdminFamilyMember: PropTypes.func.isRequired,
  createAdminFamilyMarriage: PropTypes.func.isRequired,
  addAdminFamilyChild: PropTypes.func.isRequired,
  updateAdminFamilyChildOrder: PropTypes.func.isRequired,
  deleteAdminFamilyMember: PropTypes.func.isRequired,
  updateAdminFamilyMarriage: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminFamily: state.adminFamily,
});

export default connect(mapStateToProps, {
  resolveFamilyUser,
  loadUserFamilyFlat,
  loadUserFamilyTree,
  initUserFamily,
  createAdminFamilyMember,
  updateAdminFamilyMember,
  createAdminFamilyMarriage,
  addAdminFamilyChild,
  updateAdminFamilyChildOrder,
  deleteAdminFamilyMember,
  updateAdminFamilyMarriage,
})(FamilyManager);
