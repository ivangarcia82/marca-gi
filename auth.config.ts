import type { NextAuthConfig } from "next-auth";
import { ROLES } from "@/lib/constants";

// Configuración segura para el Edge (middleware): sin Prisma ni bcrypt.
// La lógica de login con base de datos vive en auth.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role ?? ROLES.EMPLEADO;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? ROLES.EMPLEADO;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      if (pathname.startsWith("/api/auth")) return true;

      if (pathname === "/login") {
        if (isLoggedIn) {
          const dest = role === ROLES.ADMIN ? "/admin" : "/dashboard";
          return Response.redirect(new URL(dest, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false; // → redirige a /login

      if (pathname.startsWith("/admin") && role !== ROLES.ADMIN) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (pathname === "/") {
        const dest = role === ROLES.ADMIN ? "/admin" : "/dashboard";
        return Response.redirect(new URL(dest, nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
