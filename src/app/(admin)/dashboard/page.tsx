import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Wallet, Bike, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { getDashboardMetrics, getRecentOrders, getTopDebtors } from "@/actions/dashboard";
import { formatCurrency } from "@/lib/format";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-slate-100 text-slate-700" },
  assigned: { label: "Asignado", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "En camino", color: "bg-amber-100 text-amber-700" },
  delivered: { label: "Entregado", color: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Devuelto", color: "bg-red-100 text-red-700" },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700" },
};

export default async function DashboardPage() {
  const [metricsResult, recentResult, debtorsResult] = await Promise.all([
    getDashboardMetrics(),
    getRecentOrders(),
    getTopDebtors(),
  ]);

  const metrics = metricsResult.data;
  const recentOrders = recentResult.data ?? [];
  const topDebtors = debtorsResult.data ?? [];

  const cards = [
    {
      title: "Pedidos Hoy",
      value: String(metrics?.orders_today ?? 0),
      icon: Package,
      color: "text-[#3B82F6]",
      bg: "bg-blue-50",
      href: "/orders",
    },
    {
      title: "Cartera Pendiente",
      value: formatCurrency(metrics?.pending_balance ?? 0),
      icon: Wallet,
      color: "text-[#F59E0B]",
      bg: "bg-amber-50",
      href: "/billing",
    },
    {
      title: "Entregas Hoy",
      value: String(metrics?.deliveries_today ?? 0),
      icon: CheckCircle,
      color: "text-[#10B981]",
      bg: "bg-emerald-50",
      href: "/orders",
    },
    {
      title: "Stock Bajo",
      value: String(metrics?.low_stock_count ?? 0),
      icon: AlertTriangle,
      color: metrics?.low_stock_count ? "text-[#EF4444]" : "text-[#64748B]",
      bg: metrics?.low_stock_count ? "bg-red-50" : "bg-slate-50",
      href: "/inventory",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Dashboard</h2>
        <p className="text-sm text-[#64748B]">Resumen general del negocio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:border-slate-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[#64748B]">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[#1E293B]">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#1E293B]">
              Ultimos Pedidos
            </CardTitle>
            <Link href="/orders" className="text-sm text-[#3B82F6] hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-[#64748B]">No hay pedidos aun.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const config = statusConfig[order.status] || statusConfig.pending;
                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1E293B]">
                          {order.customer?.name || "Sin cliente"}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1E293B]">
                          {formatCurrency(order.total)}
                        </span>
                        <Badge variant="secondary" className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#1E293B]">
              Clientes con Mayor Saldo
            </CardTitle>
            <Link href="/billing" className="text-sm text-[#3B82F6] hover:underline">
              Ver cartera
            </Link>
          </CardHeader>
          <CardContent>
            {topDebtors.length === 0 ? (
              <p className="text-sm text-[#64748B]">Todos los clientes al dia.</p>
            ) : (
              <div className="space-y-3">
                {topDebtors.map((debtor) => (
                  <Link
                    key={debtor.id}
                    href={`/billing/${debtor.id}`}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-[#1E293B]">
                      {debtor.name}
                    </p>
                    <span className="text-sm font-bold text-[#EF4444]">
                      {formatCurrency(debtor.pending_balance)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
