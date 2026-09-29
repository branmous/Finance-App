import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET environment variable is not set");
  }
  const token = await getToken({ req: request, secret });

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authorizedEmail = process.env.AUTHORIZED_EMAIL
    ? normalizeEmail(process.env.AUTHORIZED_EMAIL)
    : undefined;
  const tokenEmail = typeof token.email === "string" ? normalizeEmail(token.email) : undefined;

  if (!authorizedEmail || tokenEmail !== authorizedEmail) {
    return NextResponse.redirect(new URL("/denied", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|denied|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
