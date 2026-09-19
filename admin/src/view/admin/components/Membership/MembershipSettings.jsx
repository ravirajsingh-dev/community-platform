import React, { useEffect, useMemo, useState } from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { Container, Form, Button } from "react-bootstrap";
import { MdEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";

import { setErrors } from "@src/actions/adminAuth";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import {
  getCommonSettings,
  updateMembershipSettings,
} from "@src/actions/adminCommonSettingsActions";
import { getMembershipPlans } from "@src/actions/adminMembershipPlanActions";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";
import {
  AuthenticationSettingsSection,
  PaymentGatewaySection,
  ReferralSettingsSection,
  DONATION_REFERRAL_TARGET_KEY,
} from "../ApplicationSettings/ApplicationSettingsSections";

const buildTargetsMapFromSettings = (commonSettings) => {
  const map = {};
  const targets = Array.isArray(commonSettings?.referral?.targets)
    ? commonSettings.referral.targets
    : [];

  if (targets.length > 0) {
    targets.forEach((target) => {
      const key = String(target.targetKey || "");
      if (!key) return;
      map[key] = {
        commissionType:
          target.commissionType === "flat" ? "flat" : "percent",
        commissionValue: target.commissionValue ?? 0,
      };
    });
    return map;
  }

  // Legacy single global rate → seed onto donation only
  if (
    commonSettings?.referral &&
    (commonSettings.referral.commissionType != null ||
      commonSettings.referral.commissionValue != null) &&
    Number(commonSettings.referral.commissionValue) > 0
  ) {
    map[DONATION_REFERRAL_TARGET_KEY] = {
      commissionType:
        commonSettings.referral.commissionType === "flat"
          ? "flat"
          : "percent",
      commissionValue: commonSettings.referral.commissionValue ?? 0,
    };
  }

  return map;
};

const initialFormData = {
  loginEnabled: true,
  registerEnabled: true,
  paymentGatewayEnabled: false,
  paymentGatewayProvider: "cashfree",
  referralEnabled: false,
  referralTargets: {},
};

const hydrateFromSettings = (commonSettings) => ({
  loginEnabled:
    commonSettings.loginEnabled !== undefined
      ? commonSettings.loginEnabled
      : true,
  registerEnabled:
    commonSettings.registerEnabled !== undefined
      ? commonSettings.registerEnabled
      : true,
  paymentGatewayEnabled:
    commonSettings.paymentGateway?.enabled !== undefined
      ? commonSettings.paymentGateway.enabled
      : false,
  paymentGatewayProvider:
    commonSettings.paymentGateway?.provider || "cashfree",
  referralEnabled: commonSettings.referral?.enabled === true,
  referralTargets: buildTargetsMapFromSettings(commonSettings),
});

const MembershipSettings = ({
  setErrors,
  errorList,
  getCommonSettings,
  getMembershipPlans,
  updateMembershipSettings,
  adminCommonSettings: {
    commonSettings,
    loadingCommonSettings,
    loadingOnSubmit,
  },
  membershipPlans,
  loadingMembershipPlans,
  loggedInAdmin,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const canEdit = hasPermission(loggedInAdmin, "membership-plans", "settings");
  const toggleEdit = () => setDisabled(!isDisabled);

  const plans = useMemo(
    () => membershipPlans?.data || [],
    [membershipPlans?.data],
  );

  const allTargetOptions = useMemo(
    () => [
      { value: DONATION_REFERRAL_TARGET_KEY, label: "Donation" },
      ...plans.map((plan) => ({
        value: String(plan._id),
        label: plan.name,
        planPrice: plan.price,
      })),
    ],
    [plans],
  );

  useEffect(() => {
    getCommonSettings();
    getMembershipPlans({
      limit: 100,
      page: 1,
      orderBy: "price",
      ascending: "asc",
      isActive: true,
    });
  }, [getCommonSettings, getMembershipPlans]);

  useEffect(() => {
    if (commonSettings && Object.keys(commonSettings).length > 0) {
      setFormData(hydrateFromSettings(commonSettings));
    }
  }, [commonSettings]);

  // After settings hydrate and active plans load, drop inactive plan commissions
  useEffect(() => {
    if (loadingMembershipPlans) return;
    if (!commonSettings || Object.keys(commonSettings).length === 0) return;

    const activeIds = new Set(plans.map((plan) => String(plan._id)));
    setFormData((current) => {
      const targets = current.referralTargets || {};
      const keys = Object.keys(targets);
      if (!keys.length) return current;

      let changed = false;
      const nextTargets = {};
      keys.forEach((key) => {
        if (key === DONATION_REFERRAL_TARGET_KEY || activeIds.has(key)) {
          nextTargets[key] = targets[key];
        } else {
          changed = true;
        }
      });

      if (!changed) return current;
      return {
        ...current,
        referralTargets: nextTargets,
      };
    });
  }, [plans, loadingMembershipPlans, commonSettings]);

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onAddTarget = (targetKey, config) => {
    setFormData((current) => ({
      ...current,
      referralTargets: {
        ...current.referralTargets,
        [targetKey]: {
          commissionType:
            config.commissionType === "flat" ? "flat" : "percent",
          commissionValue: config.commissionValue ?? 0,
        },
      },
    }));
  };

  const onUpdateTarget = (targetKey, config) => {
    setFormData((current) => ({
      ...current,
      referralTargets: {
        ...current.referralTargets,
        [targetKey]: {
          commissionType:
            config.commissionType === "flat" ? "flat" : "percent",
          commissionValue: config.commissionValue ?? 0,
        },
      },
    }));
  };

  const onDeleteTarget = (targetKey) => {
    setFormData((current) => {
      const nextTargets = { ...(current.referralTargets || {}) };
      delete nextTargets[targetKey];
      return {
        ...current,
        referralTargets: nextTargets,
      };
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!canEdit) return;

    setSubmitting(true);
    const errors = [];
    const targets = formData.referralTargets || {};

    Object.entries(targets).forEach(([key, cfg]) => {
      const commissionValue = Number(cfg.commissionValue);
      const commissionType = cfg.commissionType || "percent";
      const option = allTargetOptions.find((o) => o.value === key);
      const label = option?.label || key;

      if (
        cfg.commissionValue === "" ||
        cfg.commissionValue === null ||
        Number.isNaN(commissionValue) ||
        commissionValue < 0
      ) {
        errors.push({
          path: "referralCommissionValue",
          msg: `Commission value for "${label}" must be 0 or greater.`,
        });
      } else if (!Number.isInteger(commissionValue)) {
        errors.push({
          path: "referralCommissionValue",
          msg: `Commission value for "${label}" must be a whole number.`,
        });
      } else if (commissionType === "percent" && commissionValue > 99) {
        errors.push({
          path: "referralCommissionValue",
          msg: `Percent commission for "${label}" can contain at most 2 digits.`,
        });
      } else if (commissionType === "flat" && commissionValue > 99999) {
        errors.push({
          path: "referralCommissionValue",
          msg: `Flat commission for "${label}" can contain at most 5 digits.`,
        });
      } else if (
        commissionType === "flat" &&
        key !== DONATION_REFERRAL_TARGET_KEY &&
        option?.planPrice != null &&
        commissionValue > Number(option.planPrice)
      ) {
        errors.push({
          path: "referralCommissionValue",
          msg: `Flat commission for "${label}" cannot exceed plan price (₹${option.planPrice}).`,
        });
      }
    });

    if (errors.length) {
      setErrors(errors);
      setSubmitting(false);
      return;
    }

    const targetsPayload = Object.entries(targets).map(([key, cfg]) => {
      const isDonation = key === DONATION_REFERRAL_TARGET_KEY;
      return {
        targetKey: key,
        targetType: isDonation ? "donation" : "membership",
        planId: isDonation ? null : key,
        commissionType: cfg.commissionType === "flat" ? "flat" : "percent",
        commissionValue: Number(cfg.commissionValue) || 0,
      };
    });

    const submitData = new FormData();
    submitData.append("loginEnabled", formData.loginEnabled);
    submitData.append("registerEnabled", formData.registerEnabled);
    submitData.append(
      "paymentGateway",
      JSON.stringify({
        enabled: formData.paymentGatewayEnabled,
        provider: formData.paymentGatewayProvider || "cashfree",
      }),
    );
    submitData.append(
      "referral",
      JSON.stringify({
        enabled: formData.referralEnabled,
        targets: targetsPayload,
      }),
    );

    setPendingSubmitData(submitData);
    setShowConfirmModal(true);
    setSubmitting(false);
  };

  const handleConfirmSave = (txn_password) => {
    if (!pendingSubmitData) return;
    pendingSubmitData.append("txn_password", txn_password);
    updateMembershipSettings(pendingSubmitData);
    setShowConfirmModal(false);
    setPendingSubmitData(null);
    setDisabled(true);
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setPendingSubmitData(null);
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    if (commonSettings && Object.keys(commonSettings).length > 0) {
      setFormData(hydrateFromSettings(commonSettings));
    }
    toggleEdit();
  };

  if (loadingCommonSettings) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Membership Settings"
          crumbs={[
            { name: "Membership Management" },
            { name: "Membership Settings" },
          ]}
        />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Membership Settings"
        crumbs={[
          { name: "Membership Management" },
          { name: "Membership Settings" },
        ]}
      />

      <Form onSubmit={onSubmit}>
        <div className="d-flex justify-content-end mb-3">
          {canEdit && (
            <Button
              type="button"
              className="btn btn--outline d-inline-flex align-items-center gap-2"
              onClick={toggleEdit}
            >
              {isDisabled ? <MdEdit size={18} /> : <FaRegEye size={18} />}
              <span>{isDisabled ? "Edit" : "Preview"}</span>
            </Button>
          )}
        </div>

        <AuthenticationSettingsSection
          formData={formData}
          isDisabled={isDisabled || !canEdit}
          onChange={onChange}
        />

        <PaymentGatewaySection
          formData={formData}
          isDisabled={isDisabled || !canEdit}
          onChange={onChange}
        />

        <ReferralSettingsSection
          formData={formData}
          errorList={errorList}
          isDisabled={isDisabled || !canEdit}
          onChange={onChange}
          onAddTarget={onAddTarget}
          onUpdateTarget={onUpdateTarget}
          onDeleteTarget={onDeleteTarget}
          allTargetOptions={allTargetOptions}
        />

        {canEdit && (
          <div className="text-end pb-3">
            <Button
              className="me-2 btn btn--theme btn--disabled-theme"
              type="submit"
              disabled={submitting || loadingOnSubmit || isDisabled}
            >
              {submitting || loadingOnSubmit ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn--disabled-theme"
              onClick={onClickCancel}
              disabled={submitting || loadingOnSubmit || isDisabled}
            >
              Cancel
            </Button>
          </div>
        )}
      </Form>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={handleCloseModal}
        handleConfirm={handleConfirmSave}
        title="Confirm Membership Settings"
        body="Please enter your transaction password to confirm these membership settings."
        submitBtnText="Confirm & Save"
      />
    </Container>
  );
};

MembershipSettings.propTypes = {
  setErrors: PropTypes.func.isRequired,
  errorList: PropTypes.object,
  getCommonSettings: PropTypes.func.isRequired,
  getMembershipPlans: PropTypes.func.isRequired,
  updateMembershipSettings: PropTypes.func.isRequired,
  adminCommonSettings: PropTypes.object.isRequired,
  membershipPlans: PropTypes.object,
  loadingMembershipPlans: PropTypes.bool,
  loggedInAdmin: PropTypes.object,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  adminCommonSettings: state.adminCommonSettings,
  membershipPlans: state.adminMembershipPlan.membershipPlans,
  loadingMembershipPlans: state.adminMembershipPlan.loadingMembershipPlans,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  setErrors,
  getCommonSettings,
  getMembershipPlans,
  updateMembershipSettings,
})(MembershipSettings);
