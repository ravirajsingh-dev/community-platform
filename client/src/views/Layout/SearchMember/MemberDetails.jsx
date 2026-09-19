import React, { useEffect } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

// Icons
import {
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaIdBadge,
  FaHome,
  FaMapMarkerAlt,
  FaCity,
  FaGlobe,
  FaUsers,
  FaSitemap,
  FaMapMarkedAlt,
  FaUserFriends,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { BsCalendar3, BsDroplet } from "react-icons/bs";
import {
  BiUser,
  BiMaleFemale,
  BiBriefcase,
  BiBook,
  BiHeart,
} from "react-icons/bi";
import { MdFamilyRestroom } from "react-icons/md";

// Custom Imports
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import {
  getMemberDetailsById,
  resetMemberDetails,
} from "@src/actions/searchMemberActions";
import { formatEducationLabels } from "@src/constants/educationConstants";
import { useResolvedCityLabel } from "@src/hooks/useResolvedCityLabel";

const displayValue = (value) =>
  value === null || value === undefined || value === "" ? "-" : value;

const DetailItem = ({ icon: Icon, label, value }) => (
  <Col xs={6} md={6} xl={4}>
    <div className="member-detail-item">
      <div className="member-detail-icon">
        <Icon size={18} />
      </div>
      <div className="member-detail-content">
        <span className="member-detail-label">{label}</span>
        <span
          className={`member-detail-value ${
            value === null || value === undefined || value === ""
              ? "is-empty"
              : ""
          }`}
        >
          {displayValue(value)}
        </span>
      </div>
    </div>
  </Col>
);

DetailItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

const DetailSection = ({ icon: Icon, title, children }) => (
  <section className="member-detail-section">
    <div className="member-section-header">
      <span className="member-section-icon">
        <Icon size={17} />
      </span>
      <h5>{title}</h5>
      <span className="member-section-line" aria-hidden="true" />
    </div>
    <div className="member-section-content">
      <Row className="g-2 g-md-3">{children}</Row>
    </div>
  </section>
);

DetailSection.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const MemberDetails = ({
  memberDetails,
  loadingMemberDetails,
  memberDetailsError,
  getMemberDetailsById,
  resetMemberDetails,
}) => {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const ud = memberDetails?.userDetails || {};
  const occupationDetails = ud.occupationDetails || {};
  const cityLabel = useResolvedCityLabel(ud.cityId, ud.stateCode);

  useEffect(() => {
    if (user_id) {
      getMemberDetailsById(user_id);
    }
    return () => {
      resetMemberDetails();
    };
  }, [user_id, getMemberDetailsById, resetMemberDetails]);

  if (loadingMemberDetails) {
    return (
      <Container className="member-details-container">
        <AppBreadCrumb
          breadcrumbs={[
            { label: "Dashboard", link: "/user/dashboard" },
            { label: "Search Member", link: "/user/search-member" },
            { label: "Member Details" },
          ]}
        />
        <div
          className="member-details-loading d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <Spinner animation="border" className="member-loading-spinner" />
        </div>
      </Container>
    );
  }

  if (memberDetailsError || !memberDetails) {
    return (
      <Container className="member-details-container">
        <AppBreadCrumb
          breadcrumbs={[
            { label: "Dashboard", link: "/user/dashboard" },
            { label: "Search Member", link: "/user/search-member" },
            { label: "Member Details" },
          ]}
        />
        <MainCard variant="panel">
          <div className="member-details-error" role="alert">
            <h5>Error Loading Member Details</h5>
            <p>{memberDetailsError || "Member not found"}</p>
            <button
              className="btn btn--outline"
              onClick={() => navigate("/user/search-member")}
            >
              Back to Search
            </button>
          </div>
        </MainCard>
      </Container>
    );
  }

  return (
    <Container className="member-details-container">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/user/dashboard" },
          { label: "Search Member", link: "/user/search-member" },
          { label: "Member Details" },
        ]}
      />

      <Card className="member-details-card">
        <Card.Body>
          <div className="member-hero">
            <div className="member-hero-content">
              <span className="member-hero-eyebrow">Member profile</span>
              <div className="member-hero-heading">
                <h2>{memberDetails.name || "Member Details"}</h2>
                <div
                  className={`member-verified-badge ${
                    memberDetails.isVerified ? "is-verified" : "is-unverified"
                  }`}
                >
                  {memberDetails.isVerified ? (
                    <FaCheckCircle />
                  ) : (
                    <FaTimesCircle />
                  )}
                  {memberDetails.isVerified ? "Verified" : "Not Verified"}
                </div>
              </div>
              <div className="member-hero-meta">
                <span>
                  <FaIdBadge /> {displayValue(memberDetails.memberId)}
                </span>
                <span>
                  <FaPhoneAlt /> {displayValue(memberDetails.phone)}
                </span>
                <span>
                  <FaEnvelope /> {displayValue(memberDetails.email)}
                </span>
              </div>
            </div>
          </div>

          <div className="member-sections">
        <DetailSection icon={FaUser} title="Core Information">
          <DetailItem
            icon={FaIdBadge}
            label="Member ID"
            value={memberDetails.memberId}
          />
          <DetailItem
            icon={FaUser}
            label="Full Name"
            value={memberDetails.name}
          />
          <DetailItem
            icon={FaPhoneAlt}
            label="Phone Number"
            value={memberDetails.phone}
          />
          <DetailItem
            icon={FaPhoneAlt}
            label="Alternate Phone"
            value={memberDetails.alternatePhone}
          />
          <DetailItem
            icon={FaEnvelope}
            label="Email"
            value={memberDetails.email}
          />
          <DetailItem
            icon={BsCalendar3}
            label="Date of Birth"
            value={ud.dob ? new Date(ud.dob).toLocaleDateString() : null}
          />
          <DetailItem
            icon={BiMaleFemale}
            label="Gender"
            value={
              ud.gender
                ? ud.gender.charAt(0).toUpperCase() + ud.gender.slice(1)
                : null
            }
          />
          <DetailItem
            icon={FaUserFriends}
            label="Father's Name"
            value={ud.fatherName}
          />
          <DetailItem
            icon={FaUserFriends}
            label="Mother's Name"
            value={ud.motherName}
          />
        </DetailSection>

        <DetailSection icon={BiBook} title="Additional Details">
          <DetailItem
            icon={BiHeart}
            label="Marital Status"
            value={
              ud.maritalStatus
                ? ud.maritalStatus.charAt(0).toUpperCase() +
                  ud.maritalStatus.slice(1)
                : null
            }
          />
          <DetailItem
            icon={BiBook}
            label="Education"
            value={formatEducationLabels(ud.education) || null}
          />
          <DetailItem
            icon={BsDroplet}
            label="Blood Group"
            value={ud.bloodGroup}
          />
          <DetailItem
            icon={BiUser}
            label="Height"
            value={ud.height != null ? `${ud.height} cm` : null}
          />
          <DetailItem
            icon={BiUser}
            label="Weight"
            value={ud.weight != null ? `${ud.weight} kg` : null}
          />
          <DetailItem
            icon={BiBriefcase}
            label="Occupation"
            value={ud.occupation}
          />
          <DetailItem
            icon={BiBriefcase}
            label="Department"
            value={occupationDetails.department}
          />
          <DetailItem
            icon={BiBriefcase}
            label="Position / Post"
            value={occupationDetails.position}
          />
          <DetailItem
            icon={FaMapMarkerAlt}
            label="Work / Business Location"
            value={occupationDetails.location}
          />
          <DetailItem
            icon={BiBriefcase}
            label="Business Name"
            value={occupationDetails.businessName}
          />
          <DetailItem
            icon={BiBriefcase}
            label="Business Type"
            value={occupationDetails.businessType}
          />
        </DetailSection>

        <DetailSection icon={FaUsers} title="Community Details">
          <DetailItem
            icon={FaUsers}
            label="Community"
            value={ud.communityLabel}
          />
          <DetailItem
            icon={MdFamilyRestroom}
            label="Vansh"
            value={ud.vanshLabel}
          />
          <DetailItem icon={BiUser} label="Kul" value={ud.kulLabel} />
          <DetailItem icon={FaSitemap} label="Khamp" value={ud.khampLabel} />
          <DetailItem
            icon={FaSitemap}
            label="Sub-Khamp"
            value={ud.subKhampLabel}
          />
          <DetailItem
            icon={FaSitemap}
            label="Gotra"
            value={ud.gotraLabel || "—"}
          />
        </DetailSection>

        <DetailSection icon={FaMapMarkedAlt} title="Location Details">
          <DetailItem
            icon={FaGlobe}
            label="Country"
            value={ud.countryCode === "IN" ? "India" : ud.countryCode}
          />
          <DetailItem
            icon={FaMapMarkerAlt}
            label="State"
            value={ud.stateCode}
          />
          <DetailItem
            icon={FaCity}
            label="City"
            value={ud.cityId ? cityLabel : null}
          />
          <DetailItem
            icon={FaHome}
            label="Native Village"
            value={ud.villageLabel}
          />
          <DetailItem
            icon={FaMapMarkedAlt}
            label="Current Address"
            value={ud.address}
          />
            </DetailSection>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

MemberDetails.propTypes = {
  memberDetails: PropTypes.object,
  loadingMemberDetails: PropTypes.bool,
  memberDetailsError: PropTypes.string,
  getMemberDetailsById: PropTypes.func.isRequired,
  resetMemberDetails: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  memberDetails: state.searchMember.memberDetails,
  loadingMemberDetails: state.searchMember.loadingMemberDetails,
  memberDetailsError: state.searchMember.memberDetailsError,
});

export default connect(mapStateToProps, {
  getMemberDetailsById,
  resetMemberDetails,
})(MemberDetails);
