import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { getSmsProviderFromSettings } from "@/lib/sms";

const sendSchema = z.object({
  customerIds: z.array(z.string().cuid()).min(1, "Select at least one customer"),
  message: z.string().trim().min(1, "Message can't be empty").max(480),
});

/** Sends the same message to one customer (direct) or many (bulk) — same
 * endpoint either way, just a different-length customerIds array. */
export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [settings, customers] = await Promise.all([
    prisma.businessSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    prisma.customer.findMany({ where: { id: { in: parsed.data.customerIds } } }),
  ]);

  const provider = getSmsProviderFromSettings(settings);

  const results = await Promise.all(
    customers.map(async (c) => {
      const result = await provider.sendSms(c.phone, parsed.data.message);
      return { id: c.id, name: c.name, success: result.success, error: result.error };
    })
  );

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  return NextResponse.json({ sent, total: results.length, failed });
}
