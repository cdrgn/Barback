// Where the auth token lives, and nothing else in the app needs to know HOW.
// localStorage so the session survives a page refresh; if we ever swap storage
// (e.g. httpOnly cookies) this is the only file that changes.
const KEY = 'barback_token';

export function getToken() {
  return localStorage.getItem(KEY);
}

export function setToken(token) {
  localStorage.setItem(KEY, token);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}