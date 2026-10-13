const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False until the Firebase env vars are set — the Google button hides itself then. */
export const isGoogleLoginEnabled = Boolean(config.apiKey && config.authDomain && config.projectId);

export interface GoogleAccount {
  idToken: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

/** Opens Google's "choose an account" popup and returns the chosen account's Firebase ID token. */
export type GoogleSignIn = () => Promise<GoogleAccount>;

let loader: Promise<GoogleSignIn> | null = null;

/**
 * Lazily loads Firebase (it's sizeable, and only the sign-in pages need it). Call it ahead of
 * time: the returned function opens the popup synchronously, which browsers (Safari especially)
 * require — a popup opened after awaiting a download counts as unrequested and gets blocked.
 *
 * Firebase is used purely to run Google's account picker. Our own API session is what keeps the
 * customer signed in, so Firebase keeps nothing in browser storage (in-memory persistence).
 */
export function loadGoogleSignIn(): Promise<GoogleSignIn> {
  loader ??= (async () => {
    const [{ initializeApp, getApps }, sdk] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);
    const app = getApps()[0] ?? initializeApp(config);
    const auth = sdk.initializeAuth(app, {
      persistence: sdk.inMemoryPersistence,
      popupRedirectResolver: sdk.browserPopupRedirectResolver,
    });
    const provider = new sdk.GoogleAuthProvider();
    // Always show the account chooser, even if only one Google account is signed in.
    provider.setCustomParameters({ prompt: 'select_account' });

    return async () => {
      const { user } = await sdk.signInWithPopup(auth, provider);
      const idToken = await user.getIdToken();
      // Our API session takes over from here; nothing else needs the Firebase session.
      void sdk.signOut(auth);
      return {
        idToken,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        photoURL: user.photoURL,
      };
    };
  })();
  loader.catch(() => {
    loader = null; // e.g. a flaky network on first load — let the next attempt retry.
  });
  return loader;
}

/** Turns Firebase's error codes into something a customer can act on (null = stay silent). */
export function googleErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null;
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google window. Please allow pop-ups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network error — please check your connection and try again.';
    case 'auth/unauthorized-domain':
      return 'Google sign-in is not enabled for this website address yet.';
    default:
      return err instanceof Error && !code ? err.message : 'Google sign-in failed. Please try again.';
  }
}
