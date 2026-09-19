const DEFAULT_PROCESSING_ATTEMPTS = 10;
const DEFAULT_PROCESSING_INTERVAL_MS = 2500;
const NETWORK_RETRY_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const PAYMENT_OUTCOMES = {
  SUCCESS: "success",
  FAILED: "failed",
  ABANDONED: "abandoned",
  PENDING: "pending",
  TIMEOUT: "timeout",
  NETWORK_ERROR: "network_error",
};

/** Outcomes that should not be re-polled from a cached client result. */
export const STICKY_TERMINAL_OUTCOMES = new Set([
  PAYMENT_OUTCOMES.SUCCESS,
  PAYMENT_OUTCOMES.FAILED,
  PAYMENT_OUTCOMES.ABANDONED,
]);

export const isStickyTerminalOutcome = (outcome) =>
  STICKY_TERMINAL_OUTCOMES.has(outcome);

const resolveOutcomeFromResponse = (paymentData) => {
  const status = paymentData?.status;
  const verificationState = paymentData?.verification?.state;

  if (status === "success") {
    return PAYMENT_OUTCOMES.SUCCESS;
  }

  if (status === "failed") {
    if (verificationState === "abandoned") {
      return PAYMENT_OUTCOMES.ABANDONED;
    }
    return PAYMENT_OUTCOMES.FAILED;
  }

  if (verificationState === "abandoned") {
    return PAYMENT_OUTCOMES.ABANDONED;
  }

  if (verificationState === "failed") {
    return PAYMENT_OUTCOMES.FAILED;
  }

  return null;
};

const resolveNonTerminalOutcome = (paymentData) => {
  const verificationState = paymentData?.verification?.state;

  if (
    paymentData?.status === "pending" &&
    (verificationState === "processing" ||
      verificationState === "waiting" ||
      verificationState === "gateway_unreachable")
  ) {
    return PAYMENT_OUTCOMES.PENDING;
  }

  return PAYMENT_OUTCOMES.TIMEOUT;
};

export const pollPaymentStatus = async ({
  orderId,
  fetchStatus,
  maxProcessingAttempts = DEFAULT_PROCESSING_ATTEMPTS,
  processingIntervalMs = DEFAULT_PROCESSING_INTERVAL_MS,
  fromReturn = true,
}) => {
  let attempt = 0;
  let networkRetries = 0;
  let lastPaymentData = null;
  let lastResult = null;

  while (attempt < maxProcessingAttempts) {
    let result;
    try {
      result = await fetchStatus(orderId, { fromReturn });
    } catch (error) {
      networkRetries += 1;
      if (networkRetries >= NETWORK_RETRY_ATTEMPTS) {
        return {
          outcome: PAYMENT_OUTCOMES.NETWORK_ERROR,
          paymentData: lastPaymentData,
          result: lastResult,
          error,
        };
      }
      await sleep(processingIntervalMs);
      continue;
    }

    const paymentData = result?.response;
    lastResult = result;
    lastPaymentData = paymentData || lastPaymentData;

    if (!result?.status || !paymentData) {
      networkRetries += 1;
      if (networkRetries >= NETWORK_RETRY_ATTEMPTS) {
        return {
          outcome: PAYMENT_OUTCOMES.NETWORK_ERROR,
          paymentData: lastPaymentData,
          result,
        };
      }

      await sleep(processingIntervalMs);
      continue;
    }

    networkRetries = 0;

    const terminalOutcome = resolveOutcomeFromResponse(paymentData);
    if (terminalOutcome) {
      return { outcome: terminalOutcome, paymentData, result };
    }

    if (paymentData.verification?.shouldContinuePolling === false) {
      if (paymentData.status === "pending") {
        return {
          outcome: PAYMENT_OUTCOMES.ABANDONED,
          paymentData,
          result,
        };
      }

      return {
        outcome:
          resolveOutcomeFromResponse(paymentData) ||
          resolveNonTerminalOutcome(paymentData),
        paymentData,
        result,
      };
    }

    attempt += 1;

    if (attempt < maxProcessingAttempts) {
      await sleep(processingIntervalMs);
    }
  }

  return {
    outcome: resolveNonTerminalOutcome(lastPaymentData),
    paymentData: lastPaymentData,
    result: lastResult,
  };
};

export const isTerminalPaymentOutcome = (outcome) =>
  isStickyTerminalOutcome(outcome);

export const getPaymentOutcomeMessage = (outcome) => {
  switch (outcome) {
    case PAYMENT_OUTCOMES.SUCCESS:
      return null;
    case PAYMENT_OUTCOMES.ABANDONED:
      return "Payment was not completed. No amount was charged. Please select a plan and try again.";
    case PAYMENT_OUTCOMES.FAILED:
      return "Payment failed. No amount was charged. Please select a plan and try again.";
    case PAYMENT_OUTCOMES.PENDING:
      return "Your payment is being processed. If you completed UPI or bank payment, your membership will activate automatically within a few minutes. You can refresh this page or log in again later.";
    case PAYMENT_OUTCOMES.NETWORK_ERROR:
      return "Could not verify payment due to a network issue. Please check your connection and try again.";
    case PAYMENT_OUTCOMES.TIMEOUT:
    default:
      return "We could not confirm your payment yet. If you already paid, wait a few minutes and refresh this page or log in again.";
  }
};

export const getPaymentOutcomeAlertVariant = (outcome) => {
  if (outcome === PAYMENT_OUTCOMES.SUCCESS) {
    return "success";
  }
  if (
    outcome === PAYMENT_OUTCOMES.FAILED ||
    outcome === PAYMENT_OUTCOMES.ABANDONED
  ) {
    return "danger";
  }
  return "warning";
};
