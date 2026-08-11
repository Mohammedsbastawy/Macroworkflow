import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      roles?: string[];
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role?: string;
    roles?: string[];
  }
}

// Kept lazy so that the Edge-safe `middleware` (which imports `auth`) does not
// pull in Node-only dependencies (mysql, bcrypt) into the Edge runtime.
async function findUserById(id: string): Promise<any | null> {
  const { dbGet } = await import("@/lib/db/mysqlClient");
  const { normalizeRole } = await import("@/lib/auth/role");
  let rows = await dbGet("system_users", { id });
  if (rows.length === 0) {
    rows = await dbGet("system_users", { UserID: id });
  }
  const u = rows[0];
  if (!u) return null;
  const userId = u.id || u.UserID;
  const userName = u.name || u.UserName;
  const userEmail = u.email || u.UserEmail;
  const rawRole = u.role || u.Role || "selfservice";
  const role = normalizeRole(rawRole);
  const rolesJson = u.roles_json || u.RolesJson;
  let roles: string[];
  if (Array.isArray(rolesJson)) roles = rolesJson.map(normalizeRole);
  else roles = [role];
  return {
    ...u,
    id: userId,
    name: userName,
    email: userEmail,
    role,
    roles,
    is_active: u.is_active ?? u.IsActive ?? 1,
    password_hash: u.password_hash || u.PasswordHash,
    auth_type: u.auth_type || u.AuthType || 'password',
  };
}

async function verifyPassword(user: any, password: string): Promise<boolean> {
  if (!user?.password_hash) return false;
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, user.password_hash);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-only-for-development' : undefined),
  pages: { signIn: "/login", signOut: "/login", error: "/login" },
  trustHost: true,
  useSecureCookies: false,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        type: { label: "Type", type: "text" },
        userId: { label: "User ID", type: "text" },
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const type = String(credentials?.type || "");
        if (type === "password") {
          const id = String(credentials?.userId || "");
          const password = String(credentials?.password || "");
          const user = await findUserById(id);
          if (!user || !user.is_active) return null;
          const ok = await verifyPassword(user, password);
          if (!ok) return null;
          return { id: user.id, name: user.name, email: user.email, role: user.role, roles: user.roles };
        }
        if (type === "microsoft") {
          const email = String(credentials?.email || "").toLowerCase();
          const { dbGet } = await import("@/lib/db/mysqlClient");
          let rows = await dbGet("system_users", { email });
          if (rows.length === 0) {
            rows = await dbGet("system_users", { UserEmail: email });
          }
          const user = rows[0];
          if (!user) return null;
          const { normalizeRole } = await import("@/lib/auth/role");
          const userId = user.id || user.UserID;
          const userName = user.name || user.UserName;
          const userEmail = user.email || user.UserEmail;
          const role = normalizeRole(user.role || user.Role || "selfservice");
          const rolesJson = user.roles_json || user.RolesJson;
          let roles: string[];
          if (Array.isArray(rolesJson)) roles = rolesJson.map(normalizeRole);
          else roles = [role];
          return { id: userId, name: userName, email: userEmail, role, roles };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user && user.id) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.roles = user.roles;
      }
      // Pick up DB changes on session refresh for live role updates.
      if (token.id && trigger === "update") {
        const fresh = await findUserById(token.id as string).catch(() => null);
        if (fresh) {
          token.role = fresh.role;
          token.roles = fresh.roles;
          token.name = fresh.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || "";
        session.user.name = (token.name as string) ?? null;
        session.user.email = (token.email as string) ?? null;
        session.user.role = (token.role as string) || "selfservice";
        session.user.roles = (token.roles as string[]) || [];
      }
      return session;
    },
    // Edge-safe gate used when exported as middleware.
    async authorized({ auth: currentAuth, request }) {
      const isLoggedIn = !!currentAuth?.user;
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico";
      if (isPublic) return true;
      return isLoggedIn;
    },
  },
});
