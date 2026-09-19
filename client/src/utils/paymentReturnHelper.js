const PENDING_PAYMENT_KEY = "rsf_pending_payment";
const PAYMENT_RESULT_KEY = "rsf_payment_result";
const PROCESSED_ORDERS_KEY = "rsf_processed_payment_orders";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** In-memory fallback when sessionStorage is blocked (private mode / some WebViews). */
const memoryStore = new Map();

const canUseSessionStorage = () => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return false;
    }
    const probeKey = "__rsf_storage_probe__";
    window.sessionStorage.setItem(probeKey, "1");
    window.sessionStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
};

const storageAvailable = canUseSessionStorage();

const storageGet = (key) => {
  if (storageAvailable) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      // fall through to memory
    }
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
};

const storageSet = (key, value) => {
  if (storageAvailable) {
    try {
      window.sessionStorage.setItem(key, value);
      memoryStore.set(key, value);
      return true;
    } catch {
      // fall through to memory
    }
  }
  memoryStore.set(key, value);
  return false;
};

const storageRemove = (key) => {
  if (storageAvailable) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  memoryStore.delete(key);
};

const readJson = (key) => {
  try {
    const raw = storageGet(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.savedAt && Date.now() - parsed.savedAt > MAX_AGE_MS) {
      storageRemove(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const savePendingPayment = ({ orderId, type = "renewal" }) => {
  if (!orderId) return;
  storageSet(
    PENDING_PAYMENT_KEY,
    JSON.stringify({ orderId, type, savedAt: Date.now() }),
  );
};

export const loadPendingPayment = () => readJson(PENDING_PAYMENT_KEY);

export const clearPendingPayment = () => {
  storageRemove(PENDING_PAYMENT_KEY);
};

export const savePaymentResultMessage = (message, variant = "success") => {
  storageSet(
    PAYMENT_RESULT_KEY,
    JSON.stringify({ message, variant, savedAt: Date.now() }),
  );
};

export const consumePaymentResultMessage = () => {
  const data = readJson(PAYMENT_RESULT_KEY);
  if (data) {
    storageRemove(PAYMENT_RESULT_KEY);
  }
  return data;
};

export const isPaymentReturnUrl = (search = "") => {
  const params = new URLSearchParams(search);
  return params.has("order_id");
};

const readProcessedOrders = () => {
  const data = readJson(PROCESSED_ORDERS_KEY);
  return Array.isArray(data?.orders) ? data.orders : [];
};

const writeProcessedOrders = (orders) => {
  storageSet(
    PROCESSED_ORDERS_KEY,
    JSON.stringify({
      orders: orders.slice(-20),
      savedAt: Date.now(),
    }),
  );
};

export const getProcessedOrderOutcome = (orderId) => {
  if (!orderId) return null;
  const entry = readProcessedOrders().find((order) => order.id === orderId);
  return entry?.outcome || null;
};

export const isOrderAlreadyProcessed = (orderId) => {
  const outcome = getProcessedOrderOutcome(orderId);
  return outcome === "success";
};

/** Only cache definitive outcomes so transient mobile/network results can re-poll. */
const STICKY_TERMINAL_OUTCOMES = new Set(["success", "failed", "abandoned"]);

export const isStickyTerminalOutcome = (outcome) =>
  STICKY_TERMINAL_OUTCOMES.has(outcome);

export const markOrderTerminal = (orderId, outcome) => {
  if (!orderId || !outcome || !isStickyTerminalOutcome(outcome)) return;
  const orders = readProcessedOrders().filter((order) => order.id !== orderId);
  orders.push({ id: orderId, outcome, savedAt: Date.now() });
  writeProcessedOrders(orders);
};

/** @deprecated Use markOrderTerminal after a terminal payment outcome */
export const markOrderProcessed = (orderId) => {
  markOrderTerminal(orderId, "success");
};
