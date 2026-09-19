export const hasNoMembershipPlan = (user) => {
  return (
    user &&
    !user.isLifetimePaid &&
    !user.isPaid &&
    !user.membershipPlanId
  );
};

export const isMembershipActive = (user) => {
  if (!user || user.status !== 1) {
    return false;
  }

  if (user.isLifetimePaid) {
    return true;
  }

  if (!user.isPaid) {
    return false;
  }

  if (!user.renewalDate) {
    return false;
  }

  return new Date(user.renewalDate).getTime() > Date.now();
};

export const resolvePaymentAccountStatus = (paymentResponse) => {
  const paymentStatus = paymentResponse?.status;

  if (paymentStatus === "success") {
    return "active";
  }

  if (paymentStatus === "failed") {
    return "failed";
  }

  return "pending";
};

export const needsPayment = (user) => {
  return Boolean(user && user.status === 4 && !user.isPaid);
};

export const needsRenewal = (user) => {
  if (!user || user.isLifetimePaid) {
    return false;
  }

  if (needsPayment(user)) {
    return false;
  }

  return !isMembershipActive(user);
};

export const getDaysUntilExpiry = (renewalDate) => {
  if (!renewalDate) {
    return null;
  }

  const diffMs = new Date(renewalDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const isExpiringSoon = (user, withinDays = 30) => {
  if (!user || user.isLifetimePaid || !user.renewalDate) {
    return false;
  }

  const days = getDaysUntilExpiry(user.renewalDate);
  return days !== null && days > 0 && days <= withinDays;
};

export const getMembershipStatusLabel = (user, membership = null) => {
  if (!user) {
    return "Unknown";
  }

  if (membership?.hasPendingPayment && !membership?.isActive) {
    return "Payment pending";
  }

  if (user.isLifetimePaid && user.status === 1) {
    return "Lifetime";
  }

  if (needsPayment(user)) {
    return "Payment pending";
  }

  if (hasNoMembershipPlan(user)) {
    return "No membership";
  }

  if (isMembershipActive(user)) {
    const days = getDaysUntilExpiry(user.renewalDate);
    if (days !== null && days <= 30) {
      return `Expiring in ${days} day${days === 1 ? "" : "s"}`;
    }
    return "Active";
  }

  if (needsRenewal(user)) {
    return "Expired";
  }

  return "Inactive";
};

export const getMembershipExpiredDate = (membership) => {
  if (!membership) {
    return null;
  }

  if (membership.renewalDate) {
    return new Date(membership.renewalDate);
  }

  const subscriptions = membership.subscriptions || [];
  const expiredSubscription =
    subscriptions.find((subscription) => subscription.status === "expired") ||
    subscriptions[0];

  if (expiredSubscription?.endDate) {
    return new Date(expiredSubscription.endDate);
  }

  return null;
};

export const requiresMembershipAction = (user) => {
  if (!user) {
    return false;
  }

  return needsPayment(user) || needsRenewal(user) || !isMembershipActive(user);
};

export const MEMBERSHIP_ALLOWED_PATHS = [
  "/user/dashboard",
  "/user/renew-membership",
  "/user/my-account",
];

export const isMembershipAllowedPath = (pathname) => {
  return MEMBERSHIP_ALLOWED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
};
