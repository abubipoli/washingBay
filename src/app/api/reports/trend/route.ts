import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { getRevenueTrend } from "@/lib/reports";

/** Revenue per day for the last `days` days — powers the Business Progress
 * chart on the dashboard. */
export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? 14), 90);

  const trend = await getRevenueTrend(days);
  return NextResponse.json(trend);
}
