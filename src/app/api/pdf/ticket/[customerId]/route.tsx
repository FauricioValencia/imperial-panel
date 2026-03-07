import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BillingTicketPDF } from "@/lib/pdf";
import { logError } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify admin role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  // Fetch customer
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (customerError || !customer) {
    return new Response("Customer not found", { status: 404 });
  }

  // Fetch orders with pending balance
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("customer_id", customerId)
    .in("status", ["delivered", "partial", "assigned", "in_transit"])
    .order("created_at", { ascending: false });

  if (ordersError) {
    logError("pdf_ticket_orders", ordersError);
    return new Response("Error fetching orders", { status: 500 });
  }

  // Fetch payments per order
  const { data: payments } = await supabase
    .from("payments")
    .select("order_id, amount")
    .eq("customer_id", customerId);

  // Calculate paid per order
  const paidByOrder: Record<string, number> = {};
  for (const p of payments || []) {
    paidByOrder[p.order_id] = (paidByOrder[p.order_id] || 0) + p.amount;
  }

  const ticketOrders = (orders || [])
    .map((o) => ({
      id: o.id,
      total: o.total,
      status: o.status,
      created_at: o.created_at,
      paid: paidByOrder[o.id] || 0,
    }))
    .filter((o) => o.total - o.paid > 0);

  const totalPending = ticketOrders.reduce(
    (sum, o) => sum + (o.total - o.paid), 0
  );

  const pdfBuffer = await renderToBuffer(
    <BillingTicketPDF
      customerName={customer.name}
      customerPhone={customer.phone}
      customerAddress={customer.address}
      orders={ticketOrders}
      totalPending={totalPending}
      generatedAt={new Date().toISOString()}
    />
  );

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-cobro-${customer.name.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
