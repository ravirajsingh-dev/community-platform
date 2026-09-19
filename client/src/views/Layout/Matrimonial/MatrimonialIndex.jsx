import React, { useEffect, useMemo } from "react";
import { Container, Row, Col, Button, Badge, Spinner, Alert } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaUserEdit, FaToggleOn, FaToggleOff, FaTrash, FaList } from "react-icons/fa";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import {
  getMyMatrimonialProfile,
  applyForMatrimonial,
  activateMatrimonialProfile,
  deactivateMatrimonialProfile,
  deleteMatrimonialProfile,
} from "@src/actions/matrimonialActions";
import { getUserProfile } from "@src/actions/profileActions";
import ProfileIncompleteAlert from "@src/views/Common/ProfileIncompleteAlert";
import { canApplyForMatrimonial } from "@src/utils/profileCompletion";

const MatrimonialIndex = ({
  myProfile,
  loadingMe,
  applying,
  activating,
  deactivating,
  deleting,
  userProfile,
  profileLoading,
  profileRequirements,
  getMyMatrimonialProfile,
  applyForMatrimonial,
  activateMatrimonialProfile,
  deactivateMatrimonialProfile,
  deleteMatrimonialProfile,
  getUserProfile,
}) => {
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  useEffect(() => {
    getMyMatrimonialProfile();
  }, [getMyMatrimonialProfile]);

  useEffect(() => {
    if (!userProfile && !profileLoading) {
      getUserProfile();
    }
  }, [getUserProfile, profileLoading, userProfile]);

  const { profileMissing, extraMissing, canApply } = useMemo(
    () =>
      canApplyForMatrimonial(
        userProfile,
        userProfile?.userDetails,
        profileRequirements,
      ),
    [userProfile, profileRequirements],
  );

  const handleApply = async () => {
    if (!canApply) return;
    const result = await applyForMatrimonial();
    if (result && result._id) getMyMatrimonialProfile();
  };

  const handleActivate = async () => {
    await activateMatrimonialProfile();
    getMyMatrimonialProfile();
  };

  const handleDeactivate = async () => {
    await deactivateMatrimonialProfile();
    getMyMatrimonialProfile();
  };

  const handleDelete = async () => {
    const done = await deleteMatrimonialProfile();
    if (done) {
      setDeleteConfirm(false);
      navigate("/user/matrimonial");
      getMyMatrimonialProfile();
    }
  };

  if (loadingMe && myProfile === undefined) {
    return <BouncingLoader minHeight="400px" />;
  }

  const hasProfile = myProfile && myProfile._id;
  const isActive = myProfile?.isActive === true;
  const applyBlocked = !canApply;

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        <FaHeart className="me-2" />
        Matrimonial
      </h2>

      {!hasProfile && (
        <>
          {profileMissing.length > 0 && (
            <ProfileIncompleteAlert
              missingFields={profileMissing}
              variant="profile"
              tone="danger"
              className="mb-4"
            />
          )}

          {profileMissing.length === 0 && extraMissing.length > 0 && (
            <ProfileIncompleteAlert
              missingFields={extraMissing}
              variant="matrimonial-extra"
              tone="danger"
              className="mb-4"
            />
          )}

          <MainCard variant="panel">
              <p className="text-muted mb-3">
                You can browse all matrimonial profiles without applying. Apply only when you want your own profile to appear in the listings.
              </p>
              <p className="text-muted mb-4">
                After applying, your profile becomes visible immediately. You can edit your details from your main profile, and activate or deactivate visibility anytime.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Button variant="outline-primary" onClick={() => navigate("/user/matrimonial/list")}>
                  <FaList className="me-2" />
                  Browse Profiles
                </Button>
                <Button
                  variant="primary"
                  className="btn--disabled-theme"
                  onClick={handleApply}
                  disabled={applying || applyBlocked}
                  title={
                    applyBlocked
                      ? "Complete the required profile details before applying"
                      : undefined
                  }
                >
                  {applying ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Submitting...
                    </>
                  ) : (
                    "Apply for Matrimonial"
                  )}
                </Button>
              </div>
          </MainCard>
        </>
      )}

      {hasProfile && (
        <>
          <Alert variant="info" className="mb-4">
            <strong>Visibility:</strong>{" "}
            <Badge bg={isActive ? "success" : "secondary"}>
              {isActive ? "Visible in listings" : "Hidden from listings"}
            </Badge>
          </Alert>

          <MainCard variant="panel">
              <Row>
                <Col md={12} className="mb-3">
                  <p className="mb-0">
                    Your matrimonial profile is linked to your main profile. To update your details, edit your profile first.
                  </p>
                </Col>
                <Col md={12} className="d-flex flex-wrap gap-2 align-items-center">
                  <Button variant="outline-primary" onClick={() => navigate("/user/my-account")}>
                    <FaUserEdit className="me-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline-primary" onClick={() => navigate("/user/matrimonial/list")}>
                    <FaList className="me-2" />
                    Browse Profiles
                  </Button>
                  {isActive ? (
                    <Button
                      variant="outline-secondary"
                      onClick={handleDeactivate}
                      disabled={deactivating}
                    >
                      <FaToggleOff className="me-2" />
                      {deactivating ? "..." : "Deactivate (hide from listings)"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline-success"
                      onClick={handleActivate}
                      disabled={activating}
                    >
                      <FaToggleOn className="me-2" />
                      {activating ? "..." : "Activate (show in listings)"}
                    </Button>
                  )}
                  {!deleteConfirm ? (
                    <Button
                      variant="outline-danger"
                      onClick={() => setDeleteConfirm(true)}
                      disabled={deleting}
                    >
                      <FaTrash className="me-2" />
                      Delete Matrimonial Profile
                    </Button>
                  ) : (
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-danger small">Permanent. Are you sure?</span>
                      <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "..." : "Yes, Delete"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </Col>
              </Row>
          </MainCard>
        </>
      )}
    </Container>
  );
};

MatrimonialIndex.propTypes = {
  myProfile: PropTypes.object,
  loadingMe: PropTypes.bool,
  applying: PropTypes.bool,
  activating: PropTypes.bool,
  deactivating: PropTypes.bool,
  deleting: PropTypes.bool,
  userProfile: PropTypes.object,
  profileLoading: PropTypes.bool,
  profileRequirements: PropTypes.object,
  getMyMatrimonialProfile: PropTypes.func.isRequired,
  applyForMatrimonial: PropTypes.func.isRequired,
  activateMatrimonialProfile: PropTypes.func.isRequired,
  deactivateMatrimonialProfile: PropTypes.func.isRequired,
  deleteMatrimonialProfile: PropTypes.func.isRequired,
  getUserProfile: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  myProfile: state.matrimonial?.myProfile ?? null,
  loadingMe: state.matrimonial?.loadingMe ?? false,
  applying: state.matrimonial?.applying ?? false,
  activating: state.matrimonial?.activating ?? false,
  deactivating: state.matrimonial?.deactivating ?? false,
  deleting: state.matrimonial?.deleting ?? false,
  userProfile: state.profile?.profile ?? null,
  profileLoading: state.profile?.loading ?? false,
  profileRequirements: state.profile?.requirements ?? null,
});

export default connect(mapStateToProps, {
  getMyMatrimonialProfile,
  applyForMatrimonial,
  activateMatrimonialProfile,
  deactivateMatrimonialProfile,
  deleteMatrimonialProfile,
  getUserProfile,
})(MatrimonialIndex);
