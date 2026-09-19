import React, { useEffect, useState } from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { Container, Row, Col, Form, Button, Card } from "react-bootstrap";

import { MdEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";

import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import {
  getDonationSettings,
  updateDonationSettings,
} from "@src/actions/adminDonationActions";
import { removeErrors } from "@src/reducers/errors";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";

const initialFormData = {
  donationEnabled: true,
  donationTitle: "",
  donationTitleHighlight: "",
  donationMessage: "",
  topDonationsEnabled: true,
  topDonationsLimit: 20,
  upi: {
    upiId: "",
    upiHolderName: "",
  },
  bank: {
    bankName: "",
    accountNo: "",
    accountHolderName: "",
    ifscCode: "",
  },
};

const DonationSettings = ({
  removeErrors,
  getDonationSettings,
  updateDonationSettings,
  adminDonation: { donationSettings, loadingDonationSettings, loadingOnDonationSettingsSubmit },
  loggedInAdmin,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const canEdit = hasPermission(loggedInAdmin, "donation", "settings");
  const toggleEdit = () => setDisabled(!isDisabled);

  useEffect(() => {
    getDonationSettings();
  }, [getDonationSettings]);

  useEffect(() => {
    if (donationSettings && Object.keys(donationSettings).length > 0) {
      setFormData({
        donationEnabled:
          donationSettings.donationEnabled !== undefined
            ? donationSettings.donationEnabled
            : true,
        donationTitle: donationSettings.donationTitle || "",
        donationTitleHighlight: donationSettings.donationTitleHighlight || "",
        donationMessage: donationSettings.donationMessage || "",
        topDonationsEnabled:
          donationSettings.topDonationsEnabled !== undefined
            ? donationSettings.topDonationsEnabled
            : true,
        topDonationsLimit: donationSettings.topDonationsLimit || 20,
        upi: {
          upiId: donationSettings.upi?.upiId || "",
          upiHolderName: donationSettings.upi?.upiHolderName || "",
        },
        bank: {
          bankName: donationSettings.bank?.bankName || "",
          accountNo: donationSettings.bank?.accountNo || "",
          accountHolderName: donationSettings.bank?.accountHolderName || "",
          ifscCode: donationSettings.bank?.ifscCode || "",
        },
      });
    }
  }, [donationSettings]);

  const onChange = (e) => {
    if (!e.target) return;

    const { name, value, type, checked } = e.target;

    if (name.startsWith("upi.") || name.startsWith("bank.")) {
      const [parent, child] = name.split(".");
      let processedValue;
      if (name === "bank.ifscCode") {
        processedValue = value.toUpperCase();
      } else if (type === "checkbox") {
        processedValue = checked;
      } else {
        processedValue = value;
      }
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: processedValue,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    setSubmitting(true);
    removeErrors();

    setPendingSubmitData({
      donationEnabled: formData.donationEnabled,
      donationTitle: formData.donationTitle,
      donationTitleHighlight: formData.donationTitleHighlight,
      donationMessage: formData.donationMessage,
      topDonationsEnabled: formData.topDonationsEnabled,
      topDonationsLimit: formData.topDonationsLimit,
      upi: {
        upiId: formData.upi.upiId,
        upiHolderName: formData.upi.upiHolderName,
      },
      bank: {
        bankName: formData.bank.bankName,
        accountNo: formData.bank.accountNo,
        accountHolderName: formData.bank.accountHolderName,
        ifscCode: formData.bank.ifscCode,
      },
    });
    setShowConfirmModal(true);
    setSubmitting(false);
  };

  const handleConfirmSave = (txn_password) => {
    if (pendingSubmitData) {
      updateDonationSettings({ ...pendingSubmitData, txn_password });
      setShowConfirmModal(false);
      setPendingSubmitData(null);
      setDisabled(true);
    }
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setPendingSubmitData(null);
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    if (donationSettings && Object.keys(donationSettings).length > 0) {
      setFormData({
        donationEnabled:
          donationSettings.donationEnabled !== undefined
            ? donationSettings.donationEnabled
            : true,
        donationTitle: donationSettings.donationTitle || "",
        donationTitleHighlight: donationSettings.donationTitleHighlight || "",
        donationMessage: donationSettings.donationMessage || "",
        topDonationsEnabled:
          donationSettings.topDonationsEnabled !== undefined
            ? donationSettings.topDonationsEnabled
            : true,
        topDonationsLimit: donationSettings.topDonationsLimit || 20,
        upi: {
          upiId: donationSettings.upi?.upiId || "",
          upiHolderName: donationSettings.upi?.upiHolderName || "",
        },
        bank: {
          bankName: donationSettings.bank?.bankName || "",
          accountNo: donationSettings.bank?.accountNo || "",
          accountHolderName: donationSettings.bank?.accountHolderName || "",
          ifscCode: donationSettings.bank?.ifscCode || "",
        },
      });
    }
    toggleEdit();
  };

  if (loadingDonationSettings) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Donation Settings"
          crumbs={[
            { name: "Donations" },
            { name: "Donation Settings" },
          ]}
        />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Donation Settings"
        crumbs={[
          { name: "Donations" },
          { name: "Donation Settings" },
        ]}
      />

      <MainCard>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="main-content-title tx-24 mg-b-5">Donation Settings</h4>
            <p className="text-muted mb-0">
              Configure donation visibility, top donations, section content, UPI, and bank payment details
            </p>
          </div>
          {canEdit && (
            <Button
              variant={null}
              className={`btn ${isDisabled ? "btn--theme" : "btn--outline"}`}
              onClick={toggleEdit}
              disabled={submitting || loadingOnDonationSettingsSubmit}
            >
              {isDisabled ? (
                <>
                  <MdEdit className="me-1" /> Edit
                </>
              ) : (
                <>
                  <FaRegEye className="me-1" /> View Mode
                </>
              )}
            </Button>
          )}
        </div>

        <Form onSubmit={onSubmit}>
          <Row>
            <Col xs={12}>
              <Card className="common-panel-card mb-4">
                <Card.Header>
                  <h5 className="mb-0">General</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="donationEnabled" className="form-group">
                        <Form.Check
                          type="switch"
                          id="donationEnabled"
                          name="donationEnabled"
                          label="Enable Donation"
                          checked={formData.donationEnabled}
                          onChange={onChange}
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="topDonationsEnabled" className="form-group">
                        <Form.Check
                          type="switch"
                          id="topDonationsEnabled"
                          name="topDonationsEnabled"
                          label="Show Top Donations"
                          checked={formData.topDonationsEnabled}
                          onChange={onChange}
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    {formData.topDonationsEnabled && (
                      <Col xs={12} md={6}>
                        <Form.Group controlId="topDonationsLimit" className="form-group">
                          <Form.Label htmlFor="topDonationsLimit">
                            Top Donations Limit
                          </Form.Label>
                          <Form.Control
                            type="number"
                            id="topDonationsLimit"
                            name="topDonationsLimit"
                            value={formData.topDonationsLimit}
                            onChange={onChange}
                            min={1}
                            max={100}
                            placeholder="e.g., 20"
                            disabled={isDisabled || !canEdit}
                            required
                          />
                          <Form.Text className="text-muted">
                            Number of top donations to display on the home page (1–100)
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    )}
                  </Row>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="donationTitle" className="form-group">
                        <Form.Label htmlFor="donationTitle">
                          Section Title
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="donationTitle"
                          name="donationTitle"
                          value={formData.donationTitle}
                          onChange={onChange}
                          placeholder="e.g., Support Our Mission"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="donationTitleHighlight" className="form-group">
                        <Form.Label htmlFor="donationTitleHighlight">
                          Title Highlight
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="donationTitleHighlight"
                          name="donationTitleHighlight"
                          value={formData.donationTitleHighlight}
                          onChange={onChange}
                          placeholder="e.g., Empower Communities Together"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="donationMessage" className="form-group">
                        <Form.Label htmlFor="donationMessage">
                          Short Donation Message
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          id="donationMessage"
                          name="donationMessage"
                          value={formData.donationMessage}
                          onChange={onChange}
                          placeholder="Brief message shown below the section title"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card className="common-panel-card mb-4">
                <Card.Header>
                  <h5 className="mb-0">UPI Details</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="upi.upiId" className="form-group">
                        <Form.Label htmlFor="upi.upiId">UPI ID</Form.Label>
                        <Form.Control
                          type="text"
                          id="upi.upiId"
                          name="upi.upiId"
                          value={formData.upi.upiId}
                          onChange={onChange}
                          placeholder="e.g., yourname@paytm"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="upi.upiHolderName" className="form-group">
                        <Form.Label htmlFor="upi.upiHolderName">
                          UPI Holder Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="upi.upiHolderName"
                          name="upi.upiHolderName"
                          value={formData.upi.upiHolderName}
                          onChange={onChange}
                          placeholder="Account holder name"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card className="common-panel-card mb-4">
                <Card.Header>
                  <h5 className="mb-0">Bank Details</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group controlId="bank.bankName" className="form-group">
                        <Form.Label htmlFor="bank.bankName">
                          Bank Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.bankName"
                          name="bank.bankName"
                          value={formData.bank.bankName}
                          onChange={onChange}
                          placeholder="Bank name"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group controlId="bank.accountNo" className="form-group">
                        <Form.Label htmlFor="bank.accountNo">
                          Account Number
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.accountNo"
                          name="bank.accountNo"
                          value={formData.bank.accountNo}
                          onChange={onChange}
                          placeholder="Account number"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group controlId="bank.accountHolderName" className="form-group">
                        <Form.Label htmlFor="bank.accountHolderName">
                          Account Holder Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.accountHolderName"
                          name="bank.accountHolderName"
                          value={formData.bank.accountHolderName}
                          onChange={onChange}
                          placeholder="Account holder name"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group controlId="bank.ifscCode" className="form-group">
                        <Form.Label htmlFor="bank.ifscCode">
                          IFSC Code
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.ifscCode"
                          name="bank.ifscCode"
                          value={formData.bank.ifscCode}
                          onChange={onChange}
                          placeholder="IFSC code"
                          className="text-uppercase-input"
                          disabled={isDisabled || !canEdit}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {canEdit && (
              <Col xs={12} className="text-end">
                <Button
                  className="m-2 btn btn--theme btn--disabled-theme"
                  type="submit"
                  variant={null}
                  disabled={submitting || loadingOnDonationSettingsSubmit || isDisabled}
                >
                  {submitting || loadingOnDonationSettingsSubmit ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        aria-hidden="true"
                      ></span>
                      {` Saving... `}
                    </>
                  ) : (
                    <>Save Changes</>
                  )}
                </Button>
                <Button
                  className="ml-2"
                  type="button"
                  variant="danger"
                  onClick={onClickCancel}
                  disabled={submitting || loadingOnDonationSettingsSubmit || isDisabled}
                >
                  Cancel
                </Button>
              </Col>
            )}
          </Row>
        </Form>
      </MainCard>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={handleCloseModal}
        handleConfirm={handleConfirmSave}
        title="Confirm Donation Settings Update"
        body="Please enter your transaction password to confirm the donation settings update."
        submitBtnText="Confirm & Save"
      />
    </Container>
  );
};

DonationSettings.propTypes = {
  removeErrors: PropTypes.func.isRequired,
  getDonationSettings: PropTypes.func.isRequired,
  updateDonationSettings: PropTypes.func.isRequired,
  adminDonation: PropTypes.object.isRequired,
  loggedInAdmin: PropTypes.object,
};

const mapStateToProps = (state) => ({
  adminDonation: state.adminDonation,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  removeErrors,
  getDonationSettings,
  updateDonationSettings,
})(DonationSettings);
