import React, { useEffect, useState } from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { Container, Row, Col, Form, Button, Card } from "react-bootstrap";

import { MdEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";

import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import { hasAnyHierarchyEditPermission } from "@src/utils/permissions";
import {
  getHierarchySettings,
  updateHierarchySettings,
  HIERARCHY_CREATABLE_LEVEL_OPTIONS,
} from "@src/actions/adminHierarchySettingsActions";

const ALL_LEVEL_KEYS = HIERARCHY_CREATABLE_LEVEL_OPTIONS.map(
  (option) => option.key,
);

const HierarchySettings = ({
  loggedInAdmin,
  adminHierarchySettings: {
    hierarchySettings,
    loadingHierarchySettings,
    loadingOnHierarchySettingsSubmit,
  },
  getHierarchySettings,
  updateHierarchySettings,
}) => {
  const [selectedLevels, setSelectedLevels] = useState(ALL_LEVEL_KEYS);
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const canEdit = hasAnyHierarchyEditPermission(loggedInAdmin);

  useEffect(() => {
    getHierarchySettings();
  }, [getHierarchySettings]);

  useEffect(() => {
    if (hierarchySettings?.userCreatableLevels?.length) {
      setSelectedLevels(hierarchySettings.userCreatableLevels);
    }
  }, [hierarchySettings]);

  const toggleLevel = (levelKey) => {
    setSelectedLevels((prev) => {
      if (prev.includes(levelKey)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((item) => item !== levelKey);
      }
      return [...prev, levelKey];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEdit || isDisabled) return;

    setPendingSubmitData({
      userCreatableLevels: selectedLevels,
    });
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async (txnPassword) => {
    if (!pendingSubmitData || !txnPassword) return;

    const result = await updateHierarchySettings({
      ...pendingSubmitData,
      txn_password: txnPassword,
    });

    if (result?.status === true) {
      setShowConfirmModal(false);
      setPendingSubmitData(null);
      setDisabled(true);
    }
  };

  if (loadingHierarchySettings && !hierarchySettings?.userCreatableLevels?.length) {
    return <BouncingLoader minHeight="300px" />;
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Hierarchy Settings"
        crumbs={[
          { name: "Community Management" },
          { name: "Hierarchy Settings" },
        ]}
      />

      <MainCard>
        <div className="d-flex justify-content-end mb-3">
          {canEdit && (
            <Button
              type="button"
              variant={isDisabled ? "primary" : "secondary"}
              onClick={() => setDisabled(!isDisabled)}
            >
              {isDisabled ? (
                <>
                  <MdEdit className="me-2" />
                  Edit
                </>
              ) : (
                <>
                  <FaRegEye className="me-2" />
                  View
                </>
              )}
            </Button>
          )}
        </div>

        <Card className="common-panel-card">
          <Card.Body>
            <p className="text-muted">
              Choose which hierarchy levels users can create from their profile.
              Unchecked levels remain select-only. At least one level must stay
              creatable.
            </p>

            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                {HIERARCHY_CREATABLE_LEVEL_OPTIONS.map((option) => (
                  <Col md={6} lg={4} key={option.key}>
                    <Form.Check
                      type="checkbox"
                      id={`creatable-${option.key}`}
                      label={`Users can create ${option.label}`}
                      checked={selectedLevels.includes(option.key)}
                      disabled={isDisabled || !canEdit}
                      onChange={() => toggleLevel(option.key)}
                    />
                  </Col>
                ))}
              </Row>

              {canEdit && !isDisabled && (
                <div className="d-flex justify-content-end mt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loadingOnHierarchySettingsSubmit}
                  >
                    Save Settings
                  </Button>
                </div>
              )}
            </Form>
          </Card.Body>
        </Card>
      </MainCard>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={() => {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        }}
        handleConfirm={handleConfirmSave}
        title="Save Hierarchy Settings"
        body="Confirm hierarchy creatable levels. Enter your transaction password to save."
        submitBtnText="Save"
      />
    </Container>
  );
};

HierarchySettings.propTypes = {
  getHierarchySettings: PropTypes.func.isRequired,
  updateHierarchySettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminHierarchySettings: state.adminHierarchySettings,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getHierarchySettings,
  updateHierarchySettings,
})(HierarchySettings);
