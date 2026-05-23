import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminListTalent, adminExportTalent, listTalentSchema } from "@/server/admin/talent";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { toCsv, csvResponse } from "@/server/core/csv";

export async function GET(request: Request) {
  try {
    await requireAdmin("moderator");
    const url = new URL(request.url);
    const query = listTalentSchema.parse(Object.fromEntries(url.searchParams));

    if (url.searchParams.get("format") === "csv") {
      const rows = await adminExportTalent(query);
      const csv = toCsv(rows, [
        { header: "id", value: (r) => r.id },
        { header: "handle", value: (r) => r.handle },
        { header: "displayName", value: (r) => r.displayName },
        { header: "country", value: (r) => r.country },
        { header: "status", value: (r) => r.status },
        { header: "verificationStatus", value: (r) => r.verificationStatus },
        { header: "planCode", value: (r) => r.planCode },
        { header: "hourlyRate", value: (r) => r.hourlyRate },
        { header: "availability", value: (r) => r.availability },
        { header: "payoutsEnabled", value: (r) => r.payoutsEnabled },
        { header: "createdAt", value: (r) => r.createdAt },
      ]);
      return csvResponse(csv, "talent.csv");
    }

    const result = await adminListTalent(query);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
