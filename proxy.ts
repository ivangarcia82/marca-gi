import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// En Next 16 el convenio `middleware.ts` quedó deprecado y se llama `proxy.ts`.
export default auth;

export const config = {
  // Protege todo excepto assets estáticos y recursos internos de Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
