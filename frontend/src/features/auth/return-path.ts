// Login, account creation, and onboarding each end in a full page load to /, so the page to return
// to after login rides in sessionStorage instead of being passed along by every one of them.
const RETURN_PATH_KEY = "return-path";

/** `raw` as a path on `origin`, or null when it would leave the site. */
export function toSafeReturnPath(raw: string, origin: string): string | null {
  // Parsing the way the browser will catches "//host", "/\host", and tabs or newlines browsers strip.
  if (!URL.canParse(raw, origin)) {
    return null;
  }

  const url = new URL(raw, origin);

  // Parsing can still produce a pathname like "//evil.com" from "/.//evil.com", which is
  // protocol-relative once used as a link.
  if (url.origin !== origin || url.pathname.startsWith("//")) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Remembers a safe path, clearing any stored path when `raw` is unsafe. */
export function rememberReturnPath(raw: string) {
  const path = toSafeReturnPath(raw, window.location.origin);

  try {
    if (path === null) {
      sessionStorage.removeItem(RETURN_PATH_KEY);
    } else {
      sessionStorage.setItem(RETURN_PATH_KEY, path);
    }
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

/** Removes any path left by an earlier login attempt. */
export function forgetReturnPath() {
  try {
    sessionStorage.removeItem(RETURN_PATH_KEY);
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

/** The remembered path, cleared so it is only followed once. */
export function takeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY);
    sessionStorage.removeItem(RETURN_PATH_KEY);

    return path;
  } catch {
    return null;
  }
}
