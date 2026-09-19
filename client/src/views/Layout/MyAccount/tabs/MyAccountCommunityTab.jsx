import React from "react";
import PropTypes from "prop-types";

import CommunityHierarchySelects from "@src/components/CommunityHierarchySelects";
import AccountEditHeader from "../components/AccountEditHeader";
import EditTabActions from "../components/EditTabActions";

const MyAccountCommunityTab = ({
  formData,
  handleSelectChange,
  isDisabled,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  submitting,
  communityDetailsLocked,
  sectionComplete,
}) => (
  <>
    <AccountEditHeader
      title="Community Details"
      isEditing={isEditing}
      onEdit={onEdit}
      onPreview={onCancel}
      submitting={submitting}
    />

    {!sectionComplete && !communityDetailsLocked && (
      <p className="text-muted small mb-3">
        Community details are optional until you start filling them. Once saved,
        Community through Gotra / Sub-Khamp become required and cannot be cleared.
        Gotra depends on Kul (same across all Khamp/Sub-Khamp of that Kul).
      </p>
    )}

    <CommunityHierarchySelects
      values={{
        community: formData.community,
        vansh: formData.vansh,
        kul: formData.kul,
        khamp: formData.khamp,
        subKhamp: formData.subKhamp,
        gotra: formData.gotra,
      }}
      onSelectChange={handleSelectChange}
      locked={communityDetailsLocked}
      disabled={isDisabled}
      isCreatable={isEditing && !communityDetailsLocked}
      variant="account"
      showRequired
      showErrors
      cascadeEnabled={isEditing && !communityDetailsLocked}
      className="mb-3"
    />

    <EditTabActions
      isEditing={isEditing}
      onSave={onSave}
      onCancel={onCancel}
      submitting={submitting}
    />
  </>
);

MyAccountCommunityTab.propTypes = {
  formData: PropTypes.object.isRequired,
  handleSelectChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  communityDetailsLocked: PropTypes.bool.isRequired,
  sectionComplete: PropTypes.bool.isRequired,
};

export default React.memo(MyAccountCommunityTab);
