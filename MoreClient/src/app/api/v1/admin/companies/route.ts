import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminListCompanies, adminExportCompanies, listCompaniesSchema } from "@/server/admin/companies";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { toCsv, csvResponse } from "@/server/core/csv";

export async function GET(request: Request) {
  try {
    await requireAdmin("moderator");
    const url = new URL(request.url);
    const query = listCompaniesSchema.parse(Object.fromEntries(url.searchParams));

    if (url.searchParams.get("format") === "csv") {
      const rows = await adminExportCompanies(query);
      const csv = toCsv(rows, [
        { header: "id", value: (r) => r.id },
        { header: "name", value: (r) => r.name },
        { header: "slug", value: (r) => r.slug },
        { header: "country", value: (r) => r.country },
        { header: "status", value: (r) => r.status },
        { header: "verificationStatus", value: (r) => r.verificationStatus },
        { header: "planCode", value: (r) => r.planCode },
        { header: "createdAt", value: (r) => r.createdAt },
      ]);
      return csvResponse(csv, "companies.csv");
    }

    const result = await adminListCompanies(query);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
