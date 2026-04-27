import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logOperacion, logError } from "@/lib/logger";

// Vercel Cron hits this endpoint daily. It recomputes products.stock_available
// (capturing newly-expired lots that triggers wouldn't catch) and counts
// expired-with-stock lots so we can flag them for admins.
export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Recompute stock_available across all products
  const { data: rowsUpdated, error: rpcError } = await supabase.rpc(
    "recompute_all_stock_available"
  );
  if (rpcError) {
    logError("cron_recompute_stock_available", rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  // Count expired lots that still have stock (admin needs to act)
  const nowIso = new Date().toISOString();
  const { data: expiredWithStock, error: queryError } = await supabase
    .from("product_lots")
    .select("id, admin_id, product_id, lot_number, quantity_remaining")
    .eq("active", true)
    .gt("quantity_remaining", 0)
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  if (queryError) {
    logError("cron_query_expired_lots", queryError);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  logOperacion(
    "cron_expirations_refreshed",
    {
      products_updated: rowsUpdated ?? 0,
      expired_with_stock_count: expiredWithStock?.length ?? 0,
    },
    "system"
  );

  return NextResponse.json({
    ok: true,
    products_updated: rowsUpdated ?? 0,
    expired_with_stock_count: expiredWithStock?.length ?? 0,
  });
}
