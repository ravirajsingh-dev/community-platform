import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Col, Container, Row, Tab, Tabs } from "react-bootstrap";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import AdvancedModal from "@src/views/Common/Modal/AdvancedModal";
import { getUserProfile, updateUserProfile } from "@src/actions/profileActions";
import { TAB_KEYS, TAB_LABELS } from "./myAccountConstants";
import { useMyAccountController } from "./hooks/useMyAccountController";
import MyAccountCoreTab from "./tabs/MyAccountCoreTab";
import MyAccountAdditionalTab from "./tabs/MyAccountAdditionalTab";
import MyAccountCommunityTab from "./tabs/MyAccountCommunityTab";
import MyAccountLocationTab from "./tabs/MyAccountLocationTab";
import MyAccountPasswordTab from "./tabs/MyAccountPasswordTab";
import MyAccountMembershipTab from "./tabs/MyAccountMembershipTab";
import MyAccountWalletTab from "./tabs/MyAccountWalletTab";
import MyAccountLoadingSkeleton from "./components/MyAccountLoadingSkeleton";
import MyAccountTabTitle from "./components/MyAccountTabTitle";

const MyAccount = ({ getUserProfile, updateUserProfile }) => {
  const {
    activeTab,
    activeTabLabel,
    additionalSectionComplete,
    communityDetailsLocked,
    communitySectionComplete,
    discardPrompt,
    editingTab,
    errorList,
    formData,
    handleCancelDiscard,
    handleConfirmDiscard,
    handleConfirmSave,
    handleSelectChange,
    handleTabSelect,
    isTabDisabled,
    loadCities,
    loadStates,
    loadVillages,
    locationDetailsLocked,
    locationSectionComplete,
    onFieldChange,
    pendingTabKey,
    setFormData,
    showConfirmModal,
    closeConfirmModal,
    submitting,
    tabCallbacks,
    userLoaded,
    missingTabCounts,
  } = useMyAccountController({ getUserProfile, updateUserProfile });

  const renderActiveTab = () => {
    if (activeTab === TAB_KEYS.membership) {
      return <MyAccountMembershipTab />;
    }

    if (activeTab === TAB_KEYS.wallet) {
      return <MyAccountWalletTab />;
    }

    if (activeTab === TAB_KEYS.password) {
      return <MyAccountPasswordTab />;
    }

    if (!formData) return null;

    switch (activeTab) {
      case TAB_KEYS.core:
        return (
          <MyAccountCoreTab
            formData={formData}
            onChange={onFieldChange}
            isDisabled={isTabDisabled(TAB_KEYS.core)}
            isEditing={editingTab === TAB_KEYS.core}
            onEdit={tabCallbacks[TAB_KEYS.core].onEdit}
            onCancel={tabCallbacks[TAB_KEYS.core].onCancel}
            onSave={tabCallbacks[TAB_KEYS.core].onSave}
            submitting={submitting}
            errorList={errorList}
          />
        );
      case TAB_KEYS.additional:
        return (
          <MyAccountAdditionalTab
            formData={formData}
            onChange={onFieldChange}
            isDisabled={isTabDisabled(TAB_KEYS.additional)}
            isEditing={editingTab === TAB_KEYS.additional}
            onEdit={tabCallbacks[TAB_KEYS.additional].onEdit}
            onCancel={tabCallbacks[TAB_KEYS.additional].onCancel}
            onSave={tabCallbacks[TAB_KEYS.additional].onSave}
            submitting={submitting}
            errorList={errorList}
            setFormData={setFormData}
            sectionComplete={additionalSectionComplete}
          />
        );
      case TAB_KEYS.community:
        return (
          <MyAccountCommunityTab
            formData={formData}
            handleSelectChange={handleSelectChange}
            isDisabled={isTabDisabled(TAB_KEYS.community)}
            isEditing={editingTab === TAB_KEYS.community}
            onEdit={tabCallbacks[TAB_KEYS.community].onEdit}
            onCancel={tabCallbacks[TAB_KEYS.community].onCancel}
            onSave={tabCallbacks[TAB_KEYS.community].onSave}
            submitting={submitting}
            communityDetailsLocked={communityDetailsLocked}
            sectionComplete={communitySectionComplete}
          />
        );
      case TAB_KEYS.location:
        return (
          <MyAccountLocationTab
            formData={formData}
            onChange={onFieldChange}
            handleSelectChange={handleSelectChange}
            isDisabled={isTabDisabled(TAB_KEYS.location)}
            isEditing={editingTab === TAB_KEYS.location}
            onEdit={tabCallbacks[TAB_KEYS.location].onEdit}
            onCancel={tabCallbacks[TAB_KEYS.location].onCancel}
            onSave={tabCallbacks[TAB_KEYS.location].onSave}
            submitting={submitting}
            errorList={errorList}
            loadStates={loadStates}
            loadCities={loadCities}
            loadVillages={loadVillages}
            locationDetailsLocked={locationDetailsLocked}
            sectionComplete={locationSectionComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container className="profile-container">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/user/dashboard" },
          { label: "My Account" },
          { label: activeTabLabel },
        ]}
      />

      <Row className="justify-content-center p-2">
        <Col xs={12}>
          <div className="common-form-card user-profile-card">
            <Row>
              <Col className="custom-heading-theam">My Account</Col>
            </Row>

            {userLoaded ? (
              <>
                <Tabs
                  activeKey={activeTab}
                  onSelect={handleTabSelect}
                  className="mb-3 user-profile-tabs"
                >
                  <Tab
                    eventKey={TAB_KEYS.core}
                    title={
                      <MyAccountTabTitle
                        label={TAB_LABELS[TAB_KEYS.core]}
                        missingCount={missingTabCounts[TAB_KEYS.core] || 0}
                      />
                    }
                  />
                  <Tab
                    eventKey={TAB_KEYS.additional}
                    title={
                      <MyAccountTabTitle
                        label={TAB_LABELS[TAB_KEYS.additional]}
                        missingCount={missingTabCounts[TAB_KEYS.additional] || 0}
                      />
                    }
                  />
                  <Tab
                    eventKey={TAB_KEYS.community}
                    title={
                      <MyAccountTabTitle
                        label={TAB_LABELS[TAB_KEYS.community]}
                        missingCount={missingTabCounts[TAB_KEYS.community] || 0}
                      />
                    }
                  />
                  <Tab
                    eventKey={TAB_KEYS.location}
                    title={
                      <MyAccountTabTitle
                        label={TAB_LABELS[TAB_KEYS.location]}
                        missingCount={missingTabCounts[TAB_KEYS.location] || 0}
                      />
                    }
                  />
                  <Tab
                    eventKey={TAB_KEYS.membership}
                    title={TAB_LABELS[TAB_KEYS.membership]}
                  />
                  <Tab
                    eventKey={TAB_KEYS.wallet}
                    title={TAB_LABELS[TAB_KEYS.wallet]}
                  />
                  <Tab eventKey={TAB_KEYS.password} title="Change Password" />
                </Tabs>
                {renderActiveTab()}
              </>
            ) : (
              <MyAccountLoadingSkeleton />
            )}
          </div>
        </Col>
      </Row>

      <AdvancedModal
        show={showConfirmModal}
        onHide={closeConfirmModal}
        title="Confirm Update"
        actions={[
          {
            label: "Cancel",
            onClick: closeConfirmModal,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: "Save Changes",
            onClick: handleConfirmSave,
            className: "btn btn--theme",
            disabled: submitting,
          },
        ]}
      >
        {`Are you sure you want to save changes in ${TAB_LABELS[pendingTabKey] || "this section"}?`}
      </AdvancedModal>

      <AdvancedModal
        show={Boolean(discardPrompt)}
        onHide={handleCancelDiscard}
        title="Discard unsaved changes?"
        actions={[
          {
            label: "Keep editing",
            onClick: handleCancelDiscard,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: "Discard changes",
            onClick: handleConfirmDiscard,
            className: "btn btn--danger",
          },
        ]}
      >
        You have unsaved edits in this section. Discard them and continue?
      </AdvancedModal>
    </Container>
  );
};

MyAccount.propTypes = {
  getUserProfile: PropTypes.func.isRequired,
  updateUserProfile: PropTypes.func.isRequired,
};

export default connect(null, {
  getUserProfile,
  updateUserProfile,
})(MyAccount);
