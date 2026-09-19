import { Navigate, useSearchParams } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import MembershipRenewalSection from "./MembershipRenewalSection";
import { requiresMembershipAction } from "@src/utils/membershipUtils";

const RenewMembership = ({ user }) => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  if (requiresMembershipAction(user)) {
    const target = orderId
      ? `/user/dashboard?order_id=${encodeURIComponent(orderId)}`
      : "/user/dashboard";

    return <Navigate to={target} replace />;
  }

  return <MembershipRenewalSection />;
};

RenewMembership.propTypes = {
  user: PropTypes.object,
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
});

export default connect(mapStateToProps)(RenewMembership);
