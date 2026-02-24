import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseClient';

export async function createCheckout(): Promise<void> {
  if (!app) {
    throw new Error('Firebase not configured');
  }

  const functions = getFunctions(app);
  const createSession = httpsCallable<Record<string, never>, { url: string }>(
    functions,
    'createCheckoutSession'
  );

  const result = await createSession({});
  const url = result.data.url;

  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned');
  }
}
