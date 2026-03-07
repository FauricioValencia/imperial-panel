import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#1E3A5F",
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1E293B",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
  },
  colId: { width: "15%" },
  colDesc: { width: "35%" },
  colTotal: { width: "15%", textAlign: "right" },
  colPaid: { width: "15%", textAlign: "right" },
  colPending: { width: "20%", textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  textRight: { textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#1E3A5F",
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1E293B",
    marginRight: 20,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#EF4444",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#94A3B8",
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  red: { color: "#EF4444" },
  green: { color: "#10B981" },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

interface TicketOrder {
  id: string;
  total: number;
  status: string;
  created_at: string;
  paid: number;
}

interface BillingTicketProps {
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  orders: TicketOrder[];
  totalPending: number;
  generatedAt: string;
}

export function BillingTicketPDF({
  customerName,
  customerPhone,
  customerAddress,
  orders,
  totalPending,
  generatedAt,
}: BillingTicketProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>Imperial</Text>
          <Text style={styles.title}>Ticket de Cobro</Text>
          <Text style={styles.subtitle}>
            Generado el {formatDate(generatedAt)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Cliente</Text>
          <View style={styles.row}>
            <Text>Nombre:</Text>
            <Text style={styles.bold}>{customerName}</Text>
          </View>
          {customerPhone && (
            <View style={styles.row}>
              <Text>Telefono:</Text>
              <Text>{customerPhone}</Text>
            </View>
          )}
          {customerAddress && (
            <View style={styles.row}>
              <Text>Direccion:</Text>
              <Text>{customerAddress}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pedidos Pendientes</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.colId, styles.bold]}>ID</Text>
            <Text style={[styles.colDesc, styles.bold]}>Fecha</Text>
            <Text style={[styles.colTotal, styles.bold]}>Total</Text>
            <Text style={[styles.colPaid, styles.bold]}>Pagado</Text>
            <Text style={[styles.colPending, styles.bold]}>Pendiente</Text>
          </View>
          {orders.map((order) => {
            const pending = order.total - order.paid;
            return (
              <View key={order.id} style={styles.tableRow}>
                <Text style={styles.colId}>{order.id.slice(0, 8)}</Text>
                <Text style={styles.colDesc}>{formatDate(order.created_at)}</Text>
                <Text style={styles.colTotal}>{formatCurrency(order.total)}</Text>
                <Text style={[styles.colPaid, styles.green]}>
                  {formatCurrency(order.paid)}
                </Text>
                <Text style={[styles.colPending, styles.red]}>
                  {formatCurrency(pending)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL ADEUDADO:</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalPending)}</Text>
        </View>

        <Text style={styles.footer}>
          Imperial - Sistema de Gestion de Entregas | Este documento fue generado automaticamente
        </Text>
      </Page>
    </Document>
  );
}
