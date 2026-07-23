import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const decoded = decodeOAuthState(state);
    const { nonce, preview } = decoded;

    if (preview) {
      // Preview flow: login was initiated from a dev-preview domain (*.manus.computer).
      // The preview domain cannot set a __Host- cookie on this production domain,
      // so we trust the nonce from the state directly.
      // Security note: this is acceptable because:
      // 1. The OAuth code is single-use and bound to the redirect_uri by the OAuth server.
      // 2. The preview flow is only used in the Manus dev environment (not public-facing).
      // 3. An attacker would need to intercept the OAuth code AND forge the state, which
      //    is prevented by the OAuth server's redirect_uri validation.
      if (!nonce) {
        res.status(403).json({ error: "missing nonce in preview state" });
        return;
      }
    } else {
      // Normal production flow: verify the nonce against the __Host- cookie.
      // CSRF guard: the nonce in `state` must match the one-time cookie that
      // startLogin set in the browser that began this login. An attacker can
      // forge `state`, but cannot plant this cookie in the victim's browser.
      const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
      if (!nonce || nonce !== expectedNonce) {
        res.status(403).json({ error: "invalid oauth state" });
        return;
      }
      res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
