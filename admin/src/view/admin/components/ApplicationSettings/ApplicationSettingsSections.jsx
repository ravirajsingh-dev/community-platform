import { useState } from "react";
import { VscEdit } from "react-icons/vsc";
import { RiDeleteBin5Line } from "react-icons/ri";
import SimpleConfirmModal from "@src/view/admin/modals/SimpleConfirmModal";
import { Card, Col, Form, Row, Button } from "react-bootstrap";
import { FaPlus, FaTrash } from "react-icons/fa";
import Errors from "@src/notifications/Errors";
import CustomSelect from "@src/components/common/CustomSelect";
import { getOptionByValue } from "@src/constants/CustomSelectValues";
import {
  getAvailablePlatformOptions,
  canAddSocialLink,
} from "./socialMediaFormHelpers";
import { MAX_IMAGE_SIZE_LABEL } from "@src/constants/imageUpload";

const referralCommissionTypeOptions = [
  { value: "percent", label: "Percent (%)" },
  { value: "flat", label: "Flat (₹)" },
];

export const DONATION_REFERRAL_TARGET_KEY = "donation";

export const GeneralInformationSection = ({
  formData,
  errorList,
  isDisabled,
  logoPreview,
  onChange,
  onLogoChange,
}) => (
  <Card className="common-panel-card mb-4">
    <Card.Header>General Information</Card.Header>
    <Card.Body>
      <Row className="g-3">
        <Col md={6} lg={4}>
          <Form.Group controlId="name">
            <Form.Label htmlFor="name">Full Name *</Form.Label>
            <Form.Control
              className={errorList.name ? "invalid" : ""}
              id="name"
              name="name"
              value={formData.name}
              onChange={onChange}
              disabled={isDisabled}
              required
            />
            <Errors current_key="name" key="name" />
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group controlId="abbreviation">
            <Form.Label htmlFor="abbreviation">Abbreviation</Form.Label>
            <Form.Control
              id="abbreviation"
              name="abbreviation"
              value={formData.abbreviation}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="e.g., RSF"
            />
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group controlId="developedBy">
            <Form.Label htmlFor="developedBy">Developed By</Form.Label>
            <Form.Control
              id="developedBy"
              name="developedBy"
              value={formData.developedBy}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="e.g., Developed by Company Name"
            />
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group controlId="developedByLink">
            <Form.Label htmlFor="developedByLink">Portfolio Link</Form.Label>
            <Form.Control
              className={errorList.developedByLink ? "invalid" : ""}
              type="url"
              id="developedByLink"
              name="developedByLink"
              value={formData.developedByLink}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="https://example.com/portfolio"
            />
            <Form.Text className="text-muted">
              Optional. Footer text becomes clickable when a link is added.
            </Form.Text>
            <Errors current_key="developedByLink" key="developedByLink" />
          </Form.Group>
        </Col>
        <Col md={8}>
          <Form.Group controlId="logo">
            <Form.Label htmlFor="logo">Application Logo</Form.Label>
            {logoPreview ? (
              <div className="settings-image-preview settings-image-preview--logo mb-2">
                <div className="settings-image-preview__frame">
                  <img src={logoPreview} alt="Logo preview" />
                </div>
              </div>
            ) : null}
            <Form.Control
              type="file"
              id="logo"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={onLogoChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">JPG/PNG/WEBP, max {MAX_IMAGE_SIZE_LABEL}.</Form.Text>
            <Errors current_key="logo" key="logo" />
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

export const AuthenticationSettingsSection = ({
  formData,
  isDisabled,
  onChange,
}) => (
  <Card className="common-panel-card mb-4">
    <Card.Header>Authentication Settings</Card.Header>
    <Card.Body>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group controlId="loginEnabled">
            <Form.Check
              type="switch"
              id="loginEnabled"
              name="loginEnabled"
              label="Enable Login"
              checked={formData.loginEnabled}
              onChange={onChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">
              When disabled, users will not be able to login
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="registerEnabled">
            <Form.Check
              type="switch"
              id="registerEnabled"
              name="registerEnabled"
              label="Enable Registration"
              checked={formData.registerEnabled}
              onChange={onChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">
              When disabled, new user registration will be blocked
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

export const PaymentGatewaySection = ({ formData, isDisabled, onChange }) => (
  <Card className="common-panel-card mb-4">
    <Card.Header>Payment Gateway</Card.Header>
    <Card.Body>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group controlId="paymentGatewayEnabled">
            <Form.Check
              type="switch"
              id="paymentGatewayEnabled"
              name="paymentGatewayEnabled"
              label="Enable Payment Gateway"
              checked={formData.paymentGatewayEnabled}
              onChange={onChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">
              Required for paid membership registration. Cashfree credentials are configured via environment variables.
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="paymentGatewayProvider">
            <Form.Label>Provider</Form.Label>
            <Form.Control
              name="paymentGatewayProvider"
              value={formData.paymentGatewayProvider || "cashfree"}
              disabled
              readOnly
            />
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

export const ReferralSettingsSection = ({
  formData,
  errorList,
  isDisabled,
  onChange,
  onAddTarget,
  onUpdateTarget,
  onDeleteTarget,
  allTargetOptions = [],
}) => {
  const [draftTarget, setDraftTarget] = useState("");
  const [draftType, setDraftType] = useState("percent");
  const [draftValue, setDraftValue] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [localError, setLocalError] = useState("");
  const [deleteKey, setDeleteKey] = useState(null);

  const referralTargets = formData.referralTargets || {};
  const configuredKeys = Object.keys(referralTargets).sort((a, b) => {
    if (a === DONATION_REFERRAL_TARGET_KEY) return -1;
    if (b === DONATION_REFERRAL_TARGET_KEY) return 1;
    const labelA =
      allTargetOptions.find((o) => o.value === a)?.label || a;
    const labelB =
      allTargetOptions.find((o) => o.value === b)?.label || b;
    return String(labelA).localeCompare(String(labelB));
  });

  const labelForTarget = (key) => {
    const option = allTargetOptions.find((o) => o.value === key);
    return option?.label || (key === DONATION_REFERRAL_TARGET_KEY ? "Donation" : key);
  };

  const priceForTarget = (key) => {
    const option = allTargetOptions.find((o) => o.value === key);
    return option?.planPrice != null ? Number(option.planPrice) : null;
  };

  const formatCommission = (cfg = {}) => {
    const value = cfg.commissionValue ?? 0;
    return cfg.commissionType === "flat" ? `₹${value}` : `${value}%`;
  };

  const availableOptions = allTargetOptions.filter(
    (option) =>
      !configuredKeys.includes(option.value) || option.value === editingKey,
  );

  const resetDraft = () => {
    setDraftTarget("");
    setDraftType("percent");
    setDraftValue("");
    setEditingKey(null);
    setLocalError("");
  };

  const validateDraft = (targetKey, commissionType, commissionValueRaw) => {
    if (!targetKey) {
      return "Select a plan or Donation.";
    }

    const commissionValue = Number(commissionValueRaw);
    if (
      commissionValueRaw === "" ||
      commissionValueRaw === null ||
      Number.isNaN(commissionValue) ||
      commissionValue < 0
    ) {
      return "Commission value must be 0 or greater.";
    }
    if (!Number.isInteger(commissionValue)) {
      return "Commission value must be a whole number.";
    }
    if (commissionType === "percent" && commissionValue > 99) {
      return "Percent commission can contain at most 2 digits.";
    }
    if (commissionType === "flat" && commissionValue > 99999) {
      return "Flat commission can contain at most 5 digits.";
    }

    const planPrice = priceForTarget(targetKey);
    if (
      commissionType === "flat" &&
      targetKey !== DONATION_REFERRAL_TARGET_KEY &&
      planPrice != null &&
      commissionValue > planPrice
    ) {
      return `Flat commission cannot exceed plan price (₹${planPrice}).`;
    }

    return "";
  };

  const handleAddOrUpdate = () => {
    const targetKey = editingKey || draftTarget;
    const error = validateDraft(targetKey, draftType, draftValue);
    if (error) {
      setLocalError(error);
      return;
    }

    const payload = {
      commissionType: draftType === "flat" ? "flat" : "percent",
      commissionValue: Number(draftValue) || 0,
    };

    if (editingKey) {
      onUpdateTarget(editingKey, payload);
    } else {
      onAddTarget(targetKey, payload);
    }
    resetDraft();
  };

  const handleStartEdit = (key) => {
    const cfg = referralTargets[key] || {
      commissionType: "percent",
      commissionValue: 0,
    };
    setEditingKey(key);
    setDraftTarget(key);
    setDraftType(cfg.commissionType === "flat" ? "flat" : "percent");
    setDraftValue(String(cfg.commissionValue ?? 0));
    setLocalError("");
  };

  const handleDeleteClick = (key) => {
    setDeleteKey(key);
  };

  const handleConfirmDelete = () => {
    if (!deleteKey) return;
    onDeleteTarget(deleteKey);
    if (editingKey === deleteKey) {
      resetDraft();
    }
    setDeleteKey(null);
  };

  const draftPlanPrice = priceForTarget(editingKey || draftTarget);
  const isDonationDraft =
    (editingKey || draftTarget) === DONATION_REFERRAL_TARGET_KEY;
  const formDisabled = isDisabled || !formData.referralEnabled;

  return (
    <>
      <Card className="common-panel-card mb-4">
        <Card.Header>Referral Commission</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={12}>
              <Form.Group controlId="referralEnabled">
                <Form.Check
                  type="switch"
                  id="referralEnabled"
                  name="referralEnabled"
                  label="Enable Referral Commission"
                  checked={formData.referralEnabled}
                  onChange={onChange}
                  disabled={isDisabled}
                />
                <Form.Text className="text-muted">
                  Add a commission per active membership plan or for Donation.
                  Flat commission is credited only when it is ≤ the paid /
                  donated amount. Inactive plans are removed automatically.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={12}>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <span className="about-us-admin__section-meta mb-0">
                  Configured commissions
                </span>
              </div>

              {configuredKeys.length === 0 ? (
                <p className="text-muted small mb-0">
                  No commissions set yet. Use the form below to add one.
                </p>
              ) : (
                configuredKeys.map((key) => {
                  const cfg = referralTargets[key] || {};
                  const planPrice = priceForTarget(key);
                  return (
                    <div key={key} className="about-us-admin__section mb-3">
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                        <div>
                          <div className="fw-semibold">{labelForTarget(key)}</div>
                          <div className="text-muted small">
                            {cfg.commissionType === "flat"
                              ? "Flat (₹)"
                              : "Percent (%)"}
                            {" · "}
                            {formatCommission(cfg)}
                            {key !== DONATION_REFERRAL_TARGET_KEY &&
                              planPrice != null && (
                                <> · Plan price ₹{planPrice}</>
                              )}
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn--outline btn-sm"
                            onClick={() => handleStartEdit(key)}
                            disabled={formDisabled}
                            title="Edit"
                          >
                            <VscEdit size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn btn--reject btn-sm"
                            onClick={() => handleDeleteClick(key)}
                            disabled={formDisabled}
                            title="Delete"
                            aria-label={`Remove commission for ${labelForTarget(key)}`}
                          >
                            <RiDeleteBin5Line size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </Col>

            {(availableOptions.length > 0 || editingKey) && (
              <Col md={12}>
                <div className="about-us-admin__section mb-0">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <span className="about-us-admin__section-meta mb-0">
                      {editingKey
                        ? `Edit · ${labelForTarget(editingKey)}`
                        : "Add commission"}
                    </span>
                    {editingKey && (
                      <Button
                        type="button"
                        variant={null}
                        className="btn btn--outline btn-sm"
                        onClick={resetDraft}
                        disabled={formDisabled}
                      >
                        Cancel edit
                      </Button>
                    )}
                  </div>

                  <Row className="g-3">
                    {!editingKey && (
                      <Col md={12}>
                        <Form.Group controlId="referralDraftTarget">
                          <Form.Label>Plan / Donation</Form.Label>
                          <CustomSelect
                            className="entity-form__select"
                            options={availableOptions}
                            value={getOptionByValue(availableOptions, draftTarget)}
                            onChange={(option) => {
                              setDraftTarget(option?.value || "");
                              setLocalError("");
                            }}
                            isDisabled={formDisabled}
                            isRequired
                            placeholder="Select plan or donation"
                          />
                        </Form.Group>
                      </Col>
                    )}
                    <Col md={6}>
                      <Form.Group controlId="referralDraftType">
                        <Form.Label>Commission Type</Form.Label>
                        <CustomSelect
                          className="entity-form__select"
                          options={referralCommissionTypeOptions}
                          value={getOptionByValue(
                            referralCommissionTypeOptions,
                            draftType,
                          )}
                          onChange={(option) => {
                            const nextType = option?.value || "percent";
                            const maxLength = nextType === "percent" ? 2 : 5;
                            setDraftType(nextType);
                            setDraftValue((current) =>
                              String(current)
                                .replace(/\D/g, "")
                                .slice(0, maxLength),
                            );
                            setLocalError("");
                          }}
                          isDisabled={formDisabled}
                          isRequired
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="referralDraftValue">
                        <Form.Label>
                          Commission Value{" "}
                          {draftType === "flat" ? "(₹)" : "(%)"}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={draftType === "percent" ? 2 : 5}
                          value={draftValue}
                          onChange={(e) => {
                            const maxLength = draftType === "percent" ? 2 : 5;
                            setDraftValue(
                              String(e.target.value)
                                .replace(/\D/g, "")
                                .slice(0, maxLength),
                            );
                            setLocalError("");
                          }}
                          disabled={formDisabled}
                          className={
                            localError || errorList.referralCommissionValue
                              ? "invalid"
                              : ""
                          }
                        />
                        {localError ? (
                          <div className="invalid-feedback d-block">
                            {localError}
                          </div>
                        ) : null}
                        <Errors
                          current_key="referralCommissionValue"
                          key="referralCommissionValue"
                        />
                        {draftType === "flat" && isDonationDraft && (
                          <Form.Text className="text-muted">
                            If donation amount is less than this flat value, no
                            commission is credited.
                          </Form.Text>
                        )}
                        {draftType === "flat" &&
                          !isDonationDraft &&
                          draftPlanPrice != null && (
                            <Form.Text className="text-muted">
                              Must be ≤ plan price (₹{draftPlanPrice}).
                            </Form.Text>
                          )}
                      </Form.Group>
                    </Col>
                    <Col md={12} className="text-end">
                      <Button
                        type="button"
                        className="btn btn--theme btn-sm"
                        onClick={handleAddOrUpdate}
                        disabled={
                          formDisabled ||
                          (!editingKey && !draftTarget) ||
                          (!editingKey && availableOptions.length === 0)
                        }
                      >
                        {editingKey ? "Update" : "Add"}
                      </Button>
                    </Col>
                  </Row>
                </div>
              </Col>
            )}

            {!editingKey &&
              availableOptions.length === 0 &&
              configuredKeys.length > 0 && (
                <Col md={12}>
                  <Form.Text className="text-muted">
                    All active plans and Donation already have a commission.
                    Edit or delete one to change it.
                  </Form.Text>
                </Col>
              )}
          </Row>
        </Card.Body>
      </Card>

      <SimpleConfirmModal
        show={Boolean(deleteKey)}
        onHide={() => setDeleteKey(null)}
        onConfirm={handleConfirmDelete}
        title="Remove referral commission?"
        body={
          deleteKey
            ? `Are you sure you want to remove the commission for "${labelForTarget(deleteKey)}"?`
            : "Are you sure you want to remove this commission?"
        }
        confirmLabel="Remove"
        confirmClassName="btn btn--reject"
      />
    </>
  );
};

export const SocialMediaSection = ({
  socialLinks,
  isDisabled,
  onSocialLinkField,
  addSocialLink,
  removeSocialLink,
}) => {
  const showAddLink = canAddSocialLink(socialLinks);

  return (
  <Card className="common-panel-card mb-4">
    <Card.Header>Social Media Links</Card.Header>
    <Card.Body>
      <p className="text-muted small mb-3">
        Add or remove social platforms shown in the footer and contact page.
        Each platform can be added only once. Profile URL is required.
      </p>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <span className="about-us-admin__section-meta mb-0">Platforms</span>
        <Button
          type="button"
          variant={null}
          className="btn btn--outline btn-sm"
          onClick={addSocialLink}
          disabled={isDisabled || !showAddLink}
        >
          <FaPlus className="me-1" />
          Add link
        </Button>
      </div>

      {socialLinks.length === 0 ? (
        <p className="text-muted small mb-0">
          No social links yet. Click &quot;Add link&quot; to add one.
        </p>
      ) : (
        socialLinks.map((link, index) => {
          const platformOptions = getAvailablePlatformOptions(socialLinks, index);

          return (
          <div key={link.id} className="about-us-admin__section mb-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <span className="about-us-admin__section-meta">
                Link {index + 1}
              </span>
              <Button
                type="button"
                variant={null}
                className="btn btn--danger btn-sm"
                onClick={() => removeSocialLink(index)}
                disabled={isDisabled}
                aria-label={`Remove link ${index + 1}`}
              >
                <FaTrash />
              </Button>
            </div>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group controlId="platform">
                  <Form.Label>Platform</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    options={platformOptions}
                    value={getOptionByValue(platformOptions, link.platform)}
                    onChange={(option) =>
                      onSocialLinkField(
                        index,
                        "platform",
                        option?.value ?? "facebook",
                      )
                    }
                    isDisabled={isDisabled}
                    isRequired
                    placeholder="Select platform"
                  />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group controlId="profile-url">
                  <Form.Label>Profile URL *</Form.Label>
                  <Form.Control
                    type="url"
                    name={`socialLinks.${index}.url`}
                    value={link.url}
                    onChange={(e) =>
                      onSocialLinkField(index, "url", e.target.value)
                    }
                    placeholder="https://..."
                    disabled={isDisabled}
                    required
                  />
                  <Errors
                    current_key={`socialLinks.${index}.url`}
                    key={`socialLinks.${index}.url`}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
          );
        })
      )}
    </Card.Body>
  </Card>
  );
};
