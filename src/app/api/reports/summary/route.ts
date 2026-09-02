import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { getBusinessSummary, type ReportRange } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range");
  const range: ReportRange = rangeParam === "month" ? "month" : rangeParam === "week" ? "week" : "day";
  const dateParam = searchParams.get("date");
  const anchor = dateParam ? new Date(dateParam) : new Date();

  const summary = await getBusinessSummary(range, anchor);
  return NextResponse.json(summary);
}
