// Razorpay web checkout — mirrors the mobile app's RazorpayConfig + PaymentService.
// The key id is publishable (safe in client code); the secret lives only in the
// createSellerOrder / razorpayWebhook Cloud Functions.

export const RAZORPAY = {
  // Test key by default; set NEXT_PUBLIC_RAZORPAY_KEY_ID to an rzp_live_… key
  // for production (the matching KEY_ID/KEY_SECRET function secrets must be live
  // too). Same value the mobile app hard-codes in RazorpayConfig.
  keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_S1eY72xDYf06T6",
  companyName: "MQ Cart",
  description: "Seller Subscription Activation",
  currency: "INR",
};

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (
    (window as unknown as { Razorpay?: unknown }).Razorpay
  ) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load the payment library."));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface RazorpayCheckoutOptions {
  orderId: string;
  amountLabel?: string;
  contact?: string;
  email?: string;
  notes?: Record<string, string>;
  onDismiss: () => void;
  onError: (message: string) => void;
}

export async function openRazorpayCheckout(opts: RazorpayCheckoutOptions) {
  await loadRazorpay();
  const RazorpayCtor = (
    window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }
  ).Razorpay;

  const rzp = new RazorpayCtor({
    key: RAZORPAY.keyId,
    order_id: opts.orderId,
    name: RAZORPAY.companyName,
    description: RAZORPAY.description,
    currency: RAZORPAY.currency,
    prefill: { contact: opts.contact ?? "", email: opts.email ?? "" },
    notes: opts.notes ?? {},
    // Success is confirmed by the razorpayWebhook, exactly like the app —
    // nothing is written to Firestore from here.
    handler: () => {},
    modal: { ondismiss: opts.onDismiss },
  });

  rzp.open();
}
