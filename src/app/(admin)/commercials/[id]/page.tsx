import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import {
  listAllCommercials,
  getCommercialCustomers,
} from "@/actions/commercials";
import { listCustomers } from "@/actions/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { AssignCustomerDialog } from "@/components/admin/commercials/assign-customer-dialog";

export default async function CommercialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [commercialsResult, customersResult, allCustomersResult] = await Promise.all([
    listAllCommercials(),
    getCommercialCustomers(id),
    listCustomers(),
  ]);

  const commercial = (commercialsResult.data ?? []).find((c) => c.id === id);
  if (!commercial) {
    notFound();
  }

  const assignedCustomers = customersResult.data ?? [];
  const allCustomers = allCustomersResult.data ?? [];
  const availableCustomers = allCustomers.filter((c) => !c.commercial_id);

  const totalPending = assignedCustomers.reduce(
    (acc, c) => acc + (c.pending_balance ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/commercials"
          className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#1E293B]">{commercial.name}</h2>
            {commercial.active ? (
              <Badge className="bg-[#10B981] text-white hover:bg-[#10B981]">
                Activo
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                Inactivo
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#64748B]">{commercial.email}</p>
        </div>
        <AssignCustomerDialog
          commercialId={commercial.id}
          availableCustomers={availableCustomers}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#64748B]">Clientes asignados</p>
            <p className="text-2xl font-bold text-[#3B82F6]">
              {assignedCustomers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#64748B]">Saldo pendiente total</p>
            <p className="text-2xl font-bold text-[#1E3A5F]">
              {formatCurrency(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[#1E293B]">
            <Users className="h-5 w-5 text-[#3B82F6]" />
            Clientes asignados ({assignedCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedCustomers.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#64748B]">
              Este comercial aun no tiene clientes asignados
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead className="text-right">Saldo pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono text-xs text-[#64748B]">
                        {customer.reference_code || "—"}
                      </TableCell>
                      <TableCell className="font-medium text-[#1E293B]">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-[#64748B]">
                        {customer.phone || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.pending_balance > 0 ? (
                          <Badge variant="destructive" className="bg-[#EF4444]">
                            {formatCurrency(customer.pending_balance)}
                          </Badge>
                        ) : (
                          <span className="font-medium text-[#10B981]">
                            {formatCurrency(0)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
