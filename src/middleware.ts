export { default } from "next-auth/middleware";

export const config = {
  // Everything except /login, static assets, the PWA manifest/service
  // worker, public brand images, and the API's own auth routes requires a
  // signed-in session. "brand" matters even for signed-out visitors: the
  // login page itself shows the logo and bay photo, and next/image fetches
  // those through a request that must not get redirected to /login.
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon|icon.svg|manifest.webmanifest|sw.js|icons|brand).*)",
  ],
};
