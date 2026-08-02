// Runs on the Node.js runtime (Next.js proxy convention). Closes the auth gate:
// unauthenticated visitors are redirected to /login (see src/lib/auth.ts).
export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
