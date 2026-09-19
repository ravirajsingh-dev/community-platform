import { load } from "@cashfreepayments/cashfree-js";

const SDK_LOAD_TIMEOUT_MS = 12000;

const getCashfreeMode = () => {
  const mode = String(import.meta.env.VITE_CASHFREE_MODE || "sandbox").toLowerCase();
  return mode === "production" ? "production" : "sandbox";
};

const getHostedCheckoutUrl = (paymentSessionId) => {
  const base =
    getCashfreeMode() === "production"
      ? "https://payments.cashfree.com"
      : "https://sandbox.cashfree.com";
  return `${base}/pg/view/sessions/checkout?payment_session_id=${encodeURIComponent(
    paymentSessionId,
  )}`;
};

let cashfreeInstance = null;

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);

export const getCashfree = async () => {
  if (!cashfreeInstance) {
    cashfreeInstance = await withTimeout(
      load({ mode: getCashfreeMode() }),
      SDK_LOAD_TIMEOUT_MS,
      "Cashfree SDK load timeout",
    );
  }
  return cashfreeInstance;
};

/**
 * Open Cashfree hosted checkout. Uses SDK first; on SDK/load failure falls back
 * to a direct hosted URL so restricted WebViews / flaky mobile browsers still pay.
 */
export const openCashfreeCheckout = async (
  paymentSessionId,
  redirectTarget = "_self",
) => {
  if (!paymentSessionId) {
    throw new Error("Missing payment session id");
  }

  const fallbackToHosted = () => {
    window.location.assign(getHostedCheckoutUrl(paymentSessionId));
  };

  try {
    const cashfree = await getCashfree();
    // Prefer _top when embedded so in-app browsers / iframes don't trap checkout.
    const target =
      redirectTarget === "_self" && window.self !== window.top
        ? "_top"
        : redirectTarget;

    const result = await cashfree.checkout({
      paymentSessionId,
      redirectTarget: target,
    });

    if (result?.error) {
      console.warn(
        "Cashfree checkout error, falling back to hosted URL:",
        result.error?.message || result.error,
      );
      fallbackToHosted();
      return { redirected: true, fallback: true };
    }

    return result;
  } catch (error) {
    console.warn(
      "Cashfree SDK checkout failed, falling back to hosted URL:",
      error?.message || error,
    );
    cashfreeInstance = null;
    fallbackToHosted();
    return { redirected: true, fallback: true };
  }
};
