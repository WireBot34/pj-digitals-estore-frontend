import { api } from "./api";

let loader = null;

/** Loads Razorpay's checkout.js once. */
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () => {
        loader = null;
        reject(new Error("Could not load the payment window. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return loader;
}

/** Opens the Razorpay sheet. Resolves with the success payload; rejects (dismissed: true) if the customer closes it. */
function openSheet(payment) {
  return new Promise((resolve, reject) => {
    const sheet = new window.Razorpay({
      key: payment.keyId,
      order_id: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      name: "PJ Digitals",
      prefill: payment.prefill,
      theme: { color: "#4f46e5" },
      handler: resolve,
      modal: { ondismiss: () => reject(Object.assign(new Error("Payment cancelled"), { dismissed: true })) },
    });
    // A failed attempt keeps the sheet open so the customer can retry, so we
    // only settle on success (handler) or dismissal.
    sheet.open();
  });
}

/**
 * Full online-payment flow: open Razorpay, then have the server verify the
 * signature. `getToken` is a FUNCTION (not a token string) because Clerk
 * session tokens are short-lived and the payment sheet can stay open for minutes.
 *
 * Throws an error with `.dismissed` (closed the sheet) or `.verifyFailed`
 * (paid, but we couldn't confirm it yet - the webhook will normally catch up).
 */
export async function payForCheckout(payment, getToken) {
  await loadRazorpay();
  const result = await openSheet(payment);
  try {
    const token = await getToken();
    await api("/api/payments/verify", {
      token,
      method: "POST",
      body: {
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      },
    });
  } catch (error) {
    error.verifyFailed = true;
    throw error;
  }
}

/** Turns a payForCheckout error into a message for the customer. */
export function paymentErrorMessage(error) {
  if (error.dismissed) return "Payment not completed. You can finish it from My orders.";
  if (error.verifyFailed) return "We couldn't confirm your payment yet. If money was deducted, your order will update shortly.";
  return error.message;
}
