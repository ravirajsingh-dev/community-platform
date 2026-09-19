import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Card,
  Col,
  Container,
  Row,
} from "react-bootstrap";
import { connect } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaSync } from "react-icons/fa";

import { loadUser } from "@src/actions/auth";
import { setAlert } from "@src/actions/alert";
import {
  createRenewalOrder,
  fetchCurrentMembership,
  fetchMembershipPlans,
  fetchPaymentStatus,
} from "@src/actions/membershipActions";
import { openCashfreeCheckout } from "@src/utils/cashfreeCheckout";
import {
  clearPendingPayment,
  getProcessedOrderOutcome,
  isOrderAlreadyProcessed,
  isStickyTerminalOutcome,
  markOrderTerminal,
  savePaymentResultMessage,
  savePendingPayment,
} from "@src/utils/paymentReturnHelper";
import {
  PAYMENT_OUTCOMES,
  getPaymentOutcomeAlertVariant,
  getPaymentOutcomeMessage,
  pollPaymentStatus,
} from "@src/utils/paymentStatusPoller";
import { formatPlanDuration, formatPlanPrice } from "@src/utils/membershipPlanUtils";
import {
  getMembershipExpiredDate,
  hasNoMembershipPlan,
  isMembershipActive,
  needsPayment,
  needsRenewal,
} from "@src/utils/membershipUtils";
import MembershipPlanCard from "@src/views/Auth/MembershipPlanCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import CommonSpinner from "@src/views/Common/Loaders/CommonSpinner";

const formatExpiryDate = (date) =>
  date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const MembershipRenewalSection = ({
  embedded = false,
  user,
  isAuthenticated,
  loadUser,
  common: { commonSettings, loadingCommonSettings },
  membership: {
    plans,
    loadingPlans,
    creatingOrder,
    checkingPaymentStatus,
    currentMembership,
    loadingCurrentMembership,
  },
  fetchMembershipPlans,
  fetchCurrentMembership,
  createRenewalOrder,
  fetchPaymentStatus,
  setAlert,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const orderIdFromUrl = searchParams.get("order_id");
  const isPaymentReturn = Boolean(orderIdFromUrl);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan._id === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  const gatewayEnabled = commonSettings?.paymentGateway?.enabled === true;
  const dataReady =
    Boolean(user) && !loadingPlans && !loadingCurrentMembership;
  const membershipActiveFromApi = currentMembership?.isActive === true;
  const membershipActive =
    membershipActiveFromApi || isMembershipActive(user);
  const requiresAction =
    currentMembership?.isActive === false ||
    needsPayment(user) ||
    needsRenewal(user);

  const expiredOnDate = useMemo(
    () => getMembershipExpiredDate(currentMembership),
    [currentMembership],
  );

  const initialDataLoaded = useRef(false);
  const paymentReturnAttemptRef = useRef(null);

  useEffect(() => {
    if (initialDataLoaded.current) return;
    initialDataLoaded.current = true;

    fetchMembershipPlans();
    if (!isPaymentReturn) {
      fetchCurrentMembership();
      if (!embedded) {
        loadUser();
      }
    }
  }, [
    embedded,
    fetchMembershipPlans,
    fetchCurrentMembership,
    isPaymentReturn,
    loadUser,
  ]);

  useEffect(() => {
    if (currentMembership && !currentMembership.isActive) {
      setPaymentComplete(false);
    }
  }, [currentMembership]);

  const handlePaymentReturn = useCallback(
    async (orderId) => {
      if (isOrderAlreadyProcessed(orderId)) {
        return;
      }

      const priorOutcome = getProcessedOrderOutcome(orderId);
      // Only skip for definitive outcomes; transient ones must re-poll on return/refresh.
      if (isStickyTerminalOutcome(priorOutcome)) {
        if (priorOutcome === PAYMENT_OUTCOMES.SUCCESS) {
          return;
        }
        setPaymentFailed(true);
        setSearchParams({}, { replace: true });
        return;
      }

      setIsVerifyingPayment(true);
      setPaymentPending(false);
      setPaymentFailed(false);

      try {
        const { outcome, paymentData } = await pollPaymentStatus({
          orderId,
          fetchStatus: (id, options) =>
            fetchPaymentStatus(id, options),
          fromReturn: true,
        });

        markOrderTerminal(orderId, outcome);

        if (outcome === PAYMENT_OUTCOMES.SUCCESS) {
          setSearchParams({}, { replace: true });
          setPaymentComplete(true);
          setPaymentResult(paymentData);
          clearPendingPayment();

          try {
            const reload = await loadUser();
            if (reload?.success) {
              await fetchCurrentMembership();
              setAlert(
                `Payment successful! Your ${paymentData?.plan?.name || "membership"} plan is now active.`,
                "success",
              );
            } else {
              savePaymentResultMessage(
                "Payment successful! Please log in again to access your renewed membership.",
                "success",
              );
            }
          } catch {
            savePaymentResultMessage(
              "Payment successful! Please log in again to access your renewed membership.",
              "success",
            );
          }
          return;
        }

        if (
          outcome === PAYMENT_OUTCOMES.FAILED ||
          outcome === PAYMENT_OUTCOMES.ABANDONED
        ) {
          setSearchParams({}, { replace: true });
          setPaymentFailed(true);
          setPaymentComplete(false);
          setPaymentPending(false);
          clearPendingPayment();
          setAlert(
            getPaymentOutcomeMessage(outcome),
            getPaymentOutcomeAlertVariant(outcome),
          );
          return;
        }

        // Keep order_id so refresh can re-verify delayed UPI / network results.
        if (outcome === PAYMENT_OUTCOMES.PENDING) {
          setPaymentPending(true);
          setPaymentComplete(false);
          setPaymentFailed(false);
          setAlert(
            getPaymentOutcomeMessage(outcome),
            getPaymentOutcomeAlertVariant(outcome),
          );
          return;
        }

        if (outcome === PAYMENT_OUTCOMES.NETWORK_ERROR) {
          setAlert(
            getPaymentOutcomeMessage(outcome),
            getPaymentOutcomeAlertVariant(outcome),
          );
          return;
        }

        setAlert(
          getPaymentOutcomeMessage(outcome),
          getPaymentOutcomeAlertVariant(outcome),
        );
      } finally {
        setIsVerifyingPayment(false);
      }
    },
    [
      fetchPaymentStatus,
      fetchCurrentMembership,
      loadUser,
      setAlert,
      setSearchParams,
    ],
  );

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    if (
      !orderId ||
      isVerifyingPayment ||
      paymentComplete ||
      paymentReturnAttemptRef.current === orderId
    ) {
      return;
    }
    paymentReturnAttemptRef.current = orderId;
    handlePaymentReturn(orderId);
  }, [
    searchParams,
    handlePaymentReturn,
    isVerifyingPayment,
    paymentComplete,
  ]);

  const handleRenew = async () => {
    if (!selectedPlanId) {
      setAlert("Please select a membership plan", "warning");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createRenewalOrder(selectedPlanId);
      const paymentSessionId = result?.response?.paymentSessionId;
      const orderId = result?.response?.orderId;

      // createRenewalOrder already surfaces API errors via setAlert
      if (!result?.status || !paymentSessionId) {
        if (result?.status && !paymentSessionId) {
          setAlert("Failed to start payment. Please try again.", "danger");
        }
        return;
      }

      savePendingPayment({ orderId, type: "renewal" });
      await openCashfreeCheckout(paymentSessionId, "_self");
    } catch {
      setAlert("Payment could not be started. Please try again.", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isPaymentReturn && !isVerifyingPayment && !dataReady) {
    return <BouncingLoader minHeight={embedded ? "420px" : "420px"} />;
  }

  if (isVerifyingPayment || checkingPaymentStatus) {
    return (
      <div className={`membership-renew-page${embedded ? " membership-renew-page--embedded" : ""}`}>
        <div className="membership-renew-page__verify">
          <BouncingLoader minHeight="120px" />
          <h2 className="h4">Verifying payment...</h2>
          <p>Please wait while we confirm your payment.</p>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    const activePlan = paymentResult?.plan || currentMembership?.plan;
    const renewedUser = paymentResult?.user || user;
    const renewalDate = renewedUser?.renewalDate;

    return (
      <div className={`membership-renew-page${embedded ? " membership-renew-page--embedded" : ""}`}>
        <Card className="membership-renew-card membership-renew-card--success text-center">
          <Card.Body className="py-4">
            <FaCheckCircle
              className="membership-renew-card__icon"
              size={40}
              aria-hidden
            />
            <h2 className="h4">Payment Successful</h2>
            <p className="text-muted mb-3">
              {activePlan?.name
                ? `Your ${activePlan.name} membership is now active.`
                : "Your membership is now active."}
            </p>

            <div className="membership-renew-card__details">
              {activePlan && (
                <div className="membership-renew-card__row">
                  <span className="text-muted">Plan</span>
                  <strong>{activePlan.name}</strong>
                </div>
              )}
              {paymentResult?.amount != null && (
                <div className="membership-renew-card__row">
                  <span className="text-muted">Amount paid</span>
                  <strong>₹{paymentResult.amount}</strong>
                </div>
              )}
              {renewalDate && (
                <div className="membership-renew-card__row">
                  <span className="text-muted">Valid until</span>
                  <strong>{formatExpiryDate(new Date(renewalDate))}</strong>
                </div>
              )}
              {renewedUser?.memberId && (
                <div className="membership-renew-card__row">
                  <span className="text-muted">Member ID</span>
                  <strong>{renewedUser.memberId}</strong>
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <Button as={Link} to="/user/dashboard" className="btn-success">
                Continue to dashboard
              </Button>
            ) : (
              <Button as={Link} to="/login" className="btn-success">
                Log in to continue
              </Button>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (membershipActive && !requiresAction) {
    return (
      <div className={`membership-renew-page${embedded ? " membership-renew-page--embedded" : ""}`}>
        <Card className="membership-renew-card membership-renew-card--success text-center">
          <Card.Body className="py-4">
            <FaCheckCircle
              className="membership-renew-card__icon"
              size={40}
              aria-hidden
            />
            <h2 className="h4">Membership Active</h2>
            <p className="text-muted mb-0">
              {currentMembership?.plan?.name
                ? `Your ${currentMembership.plan.name} plan is active.`
                : "Your membership is active."}
            </p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  const content = (
    <>
      <div className="membership-renew-page__header text-center mb-4">
        <FaExclamationTriangle
          className="text-warning mb-3"
          size={embedded ? 32 : 40}
          aria-hidden
        />
        <h2 className={embedded ? "h3" : "h2"}>
          {needsPayment(user)
            ? "Complete Your Membership Payment"
            : hasNoMembershipPlan(user)
              ? "Choose a Membership Plan"
              : "Renew Your Membership"}
        </h2>
        <p className="text-muted mb-0">
          {needsPayment(user)
            ? "Your registration is incomplete. Select a plan and pay to activate your account."
            : hasNoMembershipPlan(user)
              ? "You do not have an active membership plan. Select a plan to access portal features."
              : paymentFailed || currentMembership?.code === "MEMBERSHIP_INACTIVE"
                ? "Your membership is not active. Complete payment to activate your plan."
                : "Your membership has expired. Choose a plan to restore portal access."}
        </p>
      </div>

      {!loadingCommonSettings && !gatewayEnabled && (
        <div className="alert alert-warning" role="alert">
          Online payment is currently unavailable. Please contact support.
        </div>
      )}

      {paymentPending && (
        <div className="alert alert-warning mb-4" role="alert">
          Your payment is being processed. If you completed UPI or bank payment,
          your membership will activate automatically within a few minutes. You
          can refresh this page or log in again later.
        </div>
      )}

      {paymentFailed && (
        <div className="alert alert-danger mb-4" role="alert">
          Your last payment attempt was not completed. Select a plan below and
          try again.
        </div>
      )}

      {!plans.length ? (
        <div className="alert alert-info" role="alert">
          No membership plans are available right now. Please contact the
          administrator.
        </div>
      ) : (
        <>
          {currentMembership?.plan && (
            <Card className="mb-4 membership-renew-page__current">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between gap-3">
                  <div>
                    <div className="text-muted small">Previous plan</div>
                    <strong>{currentMembership.plan.name}</strong>
                  </div>
                  <div>
                    <div className="text-muted small">Last expired on</div>
                    <strong>
                      {expiredOnDate
                        ? formatExpiryDate(expiredOnDate)
                        : "Not available"}
                    </strong>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          <h3 className="h5 mb-3">Select a plan</h3>
          <div className="membership-plans-grid mb-4">
            {plans.map((plan) => (
              <MembershipPlanCard
                key={plan._id}
                plan={plan}
                selected={selectedPlanId}
                onSelect={setSelectedPlanId}
              />
            ))}
          </div>

          {selectedPlan && (
            <Card className="membership-renew-page__summary mb-4">
              <Card.Body>
                <h3 className="h6 mb-3">Payment summary</h3>
                <div className="d-flex justify-content-between mb-2">
                  <span>{selectedPlan.name}</span>
                  <strong>{formatPlanPrice(selectedPlan)}</strong>
                </div>
                <div className="d-flex justify-content-between text-muted small">
                  <span>Duration</span>
                  <span>{formatPlanDuration(selectedPlan)}</span>
                </div>
              </Card.Body>
            </Card>
          )}

          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <Button
              className="btn-common"
              size="lg"
              disabled={
                !selectedPlanId ||
                !gatewayEnabled ||
                isProcessing ||
                creatingOrder
              }
              onClick={handleRenew}
            >
              {isProcessing || creatingOrder ? (
                <>
                  <CommonSpinner
                    size="sm"
                    className="common-spinner--button me-2"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <FaSync className="me-2" aria-hidden />
                  {needsPayment(user) ? "Pay & Activate" : "Renew & Pay"}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <section
        className="dashboard-renewal membership-renew-page membership-renew-page--embedded"
        aria-label="Renew membership"
      >
        {content}
      </section>
    );
  }

  return (
    <Container className="py-4 membership-renew-page">
      <Row className="justify-content-center">
        <Col lg={10} xl={9}>
          {content}
        </Col>
      </Row>
    </Container>
  );
};

MembershipRenewalSection.propTypes = {
  embedded: PropTypes.bool,
  user: PropTypes.object,
  isAuthenticated: PropTypes.bool,
  loadUser: PropTypes.func.isRequired,
  common: PropTypes.object.isRequired,
  membership: PropTypes.object.isRequired,
  fetchMembershipPlans: PropTypes.func.isRequired,
  fetchCurrentMembership: PropTypes.func.isRequired,
  createRenewalOrder: PropTypes.func.isRequired,
  fetchPaymentStatus: PropTypes.func.isRequired,
  setAlert: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
  isAuthenticated: state.auth.isAuthenticated,
  common: state.common,
  membership: state.membership,
});

export default connect(mapStateToProps, {
  loadUser,
  fetchMembershipPlans,
  fetchCurrentMembership,
  createRenewalOrder,
  fetchPaymentStatus,
  setAlert,
})(MembershipRenewalSection);
