import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// The production domain registered with the Manus OAuth app.
// Preview domains (*.manus.computer) are NOT registered and will be rejected.
const PRODUCTION_ORIGIN = "https://labtechops-mvwgzfhu.manus.space";

// Returns true when running inside the Manus dev-preview iframe
// (the ephemeral *.manus.computer domain that is NOT registered with OAuth).
function isPreviewDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host.endsWith(".manus.computer") ||
    host.endsWith(".manuspre.computer") ||
    host.endsWith(".manus-asia.computer") ||
    host.endsWith(".manuscomputer.ai") ||
    host.endsWith(".manusvm.computer")
  );
}

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// In production: uses window.location.origin as redirect_uri, sets a nonce
// cookie for CSRF protection, and navigates to the OAuth portal.
//
// In preview (*.manus.computer): the preview domain is not registered as a
// valid redirect_uri. Instead, we use the production domain as redirect_uri.
// The nonce is embedded in the state (no cookie needed) and the server callback
// accepts it via the `preview_nonce` query param that we append to the state.
export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  const nonce = crypto.randomUUID();

  if (isPreviewDomain()) {
    // In preview: use production as redirect_uri (the only registered domain).
    // We cannot set a __Host- cookie on the production domain from here, so
    // we pass the nonce as a special `preview_nonce` field in the state.
    // The server callback will accept this when `preview=1` is in the state.
    const redirectUri = `${PRODUCTION_ORIGIN}/api/oauth/callback`;
    const state = encodeOAuthState({ redirectUri, nonce, preview: true } as any);

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    window.location.href = url.toString();
    return;
  }

  // Normal production flow: set nonce cookie and navigate
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();
};
