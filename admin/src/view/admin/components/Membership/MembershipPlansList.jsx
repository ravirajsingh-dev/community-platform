import React, { useState, useEffect, useMemo } from "react";
import { Row, Col, Container, Badge, Form } from "react-bootstrap";
import { connect } from "react-redux";
import { VscEdit } from "react-icons/vsc";
import { RiDeleteBin5Line } from "react-icons/ri";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import Errors from "@src/notifications/Errors";
import CustomSelect from "@src/components/common/CustomSelect";
import CustomModal from "@src/components/common/Modal/CustomModal";
import {
  MembershipDurationTypeOptions,
  getOptionByValue,
} from "@src/constants/CustomSelectValues";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
} from "@src/actions/adminMembershipPlanActions";
import { setErrorsList } from "@src/actions/errors";
import { validateForm } from "@src/utils/validation";
import { hasPermission } from "@src/utils/permissions";
import { formatIndianNumber } from "@src/utils/helper";
import { generatePlanSlug } from "@src/utils/membershipPlanUtils";

const formatDuration = (plan) => {
  if (plan.durationType === "lifetime") return "Lifetime";
  if (!plan.durationValue) return "—";
  return `${plan.durationValue} ${plan.durationType}`;
};

const MembershipPlansList = ({
  loggedInAdmin,
  membershipPlans,
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  loadingMembershipPlans,
  loadingOnMembershipPlanSubmit,
  setErrorsList,
  errorList,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const initialFormData = {
    name: "",
    price: "",
    currency: "INR",
    durationType: "months",
    durationValue: "1",
    isActive: true,
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    getMembershipPlans({ limit: 50, page: 1, orderBy: "price", ascending: "asc" });
  }, [getMembershipPlans]);

  const previewSlug = useMemo(() => {
    if (!formData.name?.trim() || formData.price === "") {
      return "";
    }

    const durationValue =
      formData.durationType === "lifetime" ? null : formData.durationValue;

    return generatePlanSlug(
      formData.name,
      formData.price,
      formData.durationType,
      durationValue,
    );
  }, [formData]);

  const canManage = hasPermission(loggedInAdmin, "membership-plans", "create");

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      minWidth: "140px",
      wrap: true,
    },
    {
      name: "Slug",
      selector: (row) => row.slug,
      minWidth: "180px",
      wrap: true,
    },
    {
      name: "Price",
      cell: (row) => `₹${formatIndianNumber(row.price)}`,
      sortable: true,
      width: "110px",
    },
    {
      name: "Duration",
      selector: (row) => formatDuration(row),
      minWidth: "120px",
    },
    {
      name: "Status",
      cell: (row) => (
        <Badge bg={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      width: "100px",
    },
    {
      name: "Actions",
      width: "120px",
      cell: (row) => (
        <div className="d-flex gap-2">
          {hasPermission(loggedInAdmin, "membership-plans", "edit") && (
            <button
              type="button"
              className="btn btn--outline btn-sm"
              onClick={() => handleEditClick(row)}
              title="Edit"
            >
              <VscEdit size={16} />
            </button>
          )}
          {hasPermission(loggedInAdmin, "membership-plans", "delete") && (
            <button
              type="button"
              className="btn btn--reject btn-sm"
              onClick={() => handleDeleteClick(row)}
              title="Delete"
            >
              <RiDeleteBin5Line size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleCreateClick = () => {
    setFormData(initialFormData);
    setIsEditMode(false);
    setSelectedPlan(null);
    setShowModal(true);
  };

  const handleEditClick = (plan) => {
    setFormData({
      name: plan.name || "",
      price: plan.price ?? "",
      currency: plan.currency || "INR",
      durationType: plan.durationType || "months",
      durationValue:
        plan.durationType === "lifetime" ? "" : String(plan.durationValue || ""),
      isActive: plan.isActive !== false,
    });
    setSelectedPlan(plan);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleDeleteClick = (plan) => {
    setSelectedPlan(plan);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
    setSelectedPlan(null);
    setIsEditMode(false);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const buildSubmitPayload = () => {
    const payload = {
      name: formData.name.trim(),
      price: Number(formData.price),
      currency: formData.currency.trim().toUpperCase(),
      durationType: formData.durationType,
      isActive: formData.isActive,
    };

    if (formData.durationType !== "lifetime") {
      payload.durationValue = Number(formData.durationValue);
    }

    return payload;
  };

  const handleSubmit = async () => {
    const validationRules = [
      { path: "name", msg: "Plan name is required." },
      { path: "price", msg: "Price is required.", type: "number" },
      { path: "durationType", msg: "Duration type is required." },
    ];

    if (formData.durationType !== "lifetime") {
      validationRules.push({
        path: "durationValue",
        msg: "Duration value is required.",
        type: "number",
      });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      errors.forEach((error) => setErrorsList(error.msg, error.path));
      return;
    }

    const submitData = buildSubmitPayload();

    if (isEditMode) {
      setPendingSubmitData(submitData);
      setShowEditConfirmModal(true);
      setShowModal(false);
    } else {
      const result = await createMembershipPlan(submitData);
      if (result?.status) {
        handleCloseModal();
      }
    }
  };

  const handleConfirmEdit = async (txnPassword) => {
    if (pendingSubmitData && selectedPlan && txnPassword) {
      const result = await updateMembershipPlan(selectedPlan._id, {
        ...pendingSubmitData,
        txn_password: txnPassword,
      });

      if (result?.status) {
        setShowEditConfirmModal(false);
        setPendingSubmitData(null);
        setSelectedPlan(null);
        setIsEditMode(false);
        setFormData(initialFormData);
      } else {
        setShowEditConfirmModal(false);
        setShowModal(true);
      }
    }
  };

  const handleConfirmDelete = (txnPassword) => {
    if (selectedPlan && txnPassword) {
      deleteMembershipPlan(selectedPlan._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedPlan(null);
    }
  };

  const plans = membershipPlans?.data || [];

  return (
    <Container>
      <AppBreadCrumb pageTitle="Membership Plans" crumbs={[{ name: "Membership Management" }, { name: "Membership Plans" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {canManage && (
                <button type="button" className="btn btn--theme" onClick={handleCreateClick}>
                  Create Membership Plan
                </button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={plans}
          count={plans.length}
          params={{ page: 1, limit: 50 }}
          setParams={() => {}}
          pagination={false}
          responsive
          striped
          progressPending={loadingMembershipPlans}
          highlightOnHover
          persistTableHead
        />
      </MainCard>

      <CustomModal
        show={showModal}
        onHide={handleCloseModal}
        title={isEditMode ? "Edit Membership Plan" : "Create Membership Plan"}
        size="lg"
        closeButton
        bodyClassName="common-modal-body--start"
        actions={[
          {
            label: "Cancel",
            onClick: handleCloseModal,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingOnMembershipPlanSubmit,
          },
          {
            label: loadingOnMembershipPlanSubmit ? "Saving..." : isEditMode ? "Update" : "Create",
            onClick: handleSubmit,
            className: "btn btn--theme",
            colSize: 7,
            disabled: loadingOnMembershipPlanSubmit,
          },
        ]}
      >
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Name *</Form.Label>
                <Form.Control name="name" value={formData.name} onChange={onChange} className={errorList.name ? "invalid" : ""} />
                <Errors current_key="name" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Slug</Form.Label>
                <Form.Control
                  value={previewSlug || (isEditMode ? selectedPlan?.slug || "" : "")}
                  readOnly
                  placeholder="Auto-generated from plan details"
                />
                <Errors current_key="slug" />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Price (₹) *</Form.Label>
                <Form.Control type="number" name="price" min="0" step="0.01" value={formData.price} onChange={onChange} className={errorList.price ? "invalid" : ""} />
                <Errors current_key="price" />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Duration Type *</Form.Label>
                <CustomSelect
                  className="entity-form__select"
                  options={MembershipDurationTypeOptions}
                  value={getOptionByValue(MembershipDurationTypeOptions, formData.durationType)}
                  onChange={(option) =>
                    setFormData((prev) => ({
                      ...prev,
                      durationType: option?.value || "months",
                      durationValue: option?.value === "lifetime" ? "" : prev.durationValue,
                    }))
                  }
                />
                <Errors current_key="durationType" />
              </Form.Group>
            </Col>
            <Col md={4}>
              {formData.durationType !== "lifetime" && (
                <Form.Group>
                  <Form.Label>Duration Value *</Form.Label>
                  <Form.Control type="number" name="durationValue" min="1" value={formData.durationValue} onChange={onChange} className={errorList.durationValue ? "invalid" : ""} />
                  <Errors current_key="durationValue" />
                </Form.Group>
              )}
            </Col>
            <Col xs={12}>
              <Form.Check type="switch" name="isActive" label="Active (shown in registration)" checked={formData.isActive} onChange={onChange} />
            </Col>
          </Row>
        </Form>
      </CustomModal>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedPlan(null);
        }}
        handleConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        body={`Delete plan "${selectedPlan?.name}"? If users are linked, it will be deactivated instead. Enter transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showEditConfirmModal}
        handleClose={() => {
          setShowEditConfirmModal(false);
          setPendingSubmitData(null);
          setShowModal(true);
        }}
        handleConfirm={handleConfirmEdit}
        title="Confirm Update"
        body="Update this membership plan? Enter your transaction password to confirm."
        submitBtnText="Update"
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  membershipPlans: state.adminMembershipPlan.membershipPlans,
  loadingMembershipPlans: state.adminMembershipPlan.loadingMembershipPlans,
  loadingOnMembershipPlanSubmit: state.adminMembershipPlan.loadingOnMembershipPlanSubmit,
  loggedInAdmin: state.adminAuth.admin,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  setErrorsList,
})(MembershipPlansList);
