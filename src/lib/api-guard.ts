import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Every mutating API route calls this first; returns the session or a 401
 * response to short-circuit the handler. */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, response: null };
}

/** Owner-only actions (e.g. deleting staff, editing default splits). */
export async function requireOwner() {
  const { session, response } = await requireSession();
  if (response) return { session, response };
  if (session!.user.role !== "OWNER") {
    return { session, response: NextResponse.json({ error: "Owner access required" }, { status: 403 }) };
  }
  return { session, response: null };
}
