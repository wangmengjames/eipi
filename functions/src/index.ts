import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import Stripe from "stripe";

admin.initializeApp();

const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");
const stripePriceId = defineString("STRIPE_PRICE_ID");

function getStripe(): Stripe {
  return new Stripe(stripeSecretKey.value());
}

// ─── Callable: create a Stripe Checkout session ───────────────────
export const createCheckoutSession = onCall(
  { cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const stripe = getStripe();
    const db = admin.firestore();
    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    // Already premium — no need to pay again
    if (userData.isPremium === true) {
      throw new HttpsError("already-exists", "You already have Premium.");
    }

    // Reuse or create Stripe customer
    let customerId = userData.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { firebase_uid: uid },
      });
      customerId = customer.id;
      await db.doc(`users/${uid}`).update({ stripeCustomerId: customerId });
    }

    // Determine origin for redirect URLs
    const origin = request.rawRequest?.headers?.origin || "https://eipi.edu.au";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: stripePriceId.value(), quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/exam`,
      metadata: { firebase_uid: uid },
    });

    return { url: session.url };
  }
);

// ─── HTTP: Stripe webhook handler ─────────────────────────────────
export const stripeWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const stripe = getStripe();
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).send("Missing stripe-signature header");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      stripeWebhookSecret.value()
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).send("Invalid signature");
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.metadata?.firebase_uid;

    if (uid && session.payment_status === "paid") {
      const db = admin.firestore();
      await db.doc(`users/${uid}`).update({
        isPremium: true,
        premiumSince: admin.firestore.FieldValue.serverTimestamp(),
        stripeCustomerId: session.customer as string,
      });
      console.log(`Premium activated for user ${uid}`);
    }
  }

  res.json({ received: true });
});
