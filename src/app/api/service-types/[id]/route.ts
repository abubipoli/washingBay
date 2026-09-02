import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-guard";

const updateServiceTypeSchema = z
  .object({
    active: z.boolean().optional(),
    defaultPrice: z.coerce.number().finite().nonnegative().optional(),
    // Decimal, not integer — see prisma/schema.prisma for why (33.33% x3
    // reconciles to exact-cent thirds; 33% x3 loses a cent on most totals).
    defaultBusinessPct: z.coerce.number().min(0).max(100).optional(),
    defaultStaffPct: z.coerce.number().min(0).max(100).optional(),
    defaultSoapPct: z.coerce.number().min(0).max(100).optional(),
  })
  .refine(
    (d) => {
      const pctFields = [d.defaultBusinessPct, d.defaultStaffPct, d.defaultSoapPct];
      const anyPctGiven = pctFields.some((v) => v !== undefined);
      if (!anyPctGiven) return true;
      // If any split percentage is being changed, all three must be sent
      // together so we never save a partially-updated, non-summing split.
      if (pctFields.some((v) => v === undefined)) return false;
      const sum = (d.defaultBusinessPct ?? 0) + (d.defaultStaffPct ?? 0) + (d.defaultSoapPct ?? 0);
      return Math.abs(sum - 100) < 0.01 || sum === 0;
    },
    { message: "Split percentages must add up to 100 (or all be 0 for a manual-entry service)" }
  );

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const parsed = updateServiceTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const serviceType = await prisma.serviceType.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(serviceType);
}
