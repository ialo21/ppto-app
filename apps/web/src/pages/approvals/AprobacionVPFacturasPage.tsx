import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatNumber } from "../../utils/numberFormat";
import { CheckCircle, XCircle, Eye, FileText, DollarSign, Clock, Award, LayoutGrid, List } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 APROBACIÓN VP - FACTURAS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Página para aprobar facturas en el segundo nivel (VP).
 * - Muestra facturas en estado APROBACION_VP (montos altos)
 * - Permite aprobar (pasa a Contabilidad) o rechazar
 * - Vista tipo bandeja de trabajo, solo lectura + acción
 */

type Invoice = {
  id: number;
  ocId: number | null;
  oc: {
    id: number;
    numeroOc: string | null;
    proveedor: string;
    moneda: string;
    support?: { id: number; code: string | null; name: string };
  } | null;
  proveedor?: { id: number; ruc: string; razonSocial: string } | null;
  support?: { id: number; code: string | null; name: string } | null;
  docType: string;
  numberNorm: string | null;
  currency: string;
  montoSinIgv: number | null;
  statusCurrent: string;
  ultimusIncident: string | null;
  detalle: string | null;
  createdAt: string;
  periods?: { id: number; periodId: number; period: { id: number; year: number; month: number } }[];
  costCenters?: { id: number; costCenterId: number; costCenter: { id: number; code: string; name: string }; amount?: number }[];
};

const calcularMontoConIGV = (montoSinIgv: number): number => montoSinIgv * 1.18;

const formatPeriodsRange = (periods: { year: number; month: number }[]): string => {
  if (!periods || periods.length === 0) return "-";
  if (periods.length === 1) {
    return `${periods[0].year}-${String(periods[0].month).padStart(2, '0')}`;
  }
  const sorted = [...periods].sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));
  return `${sorted[0].year}-${String(sorted[0].month).padStart(2, '0')} → ${sorted[sorted.length - 1].year}-${String(sorted[sorted.length - 1].month).padStart(2, '0')}`;
};

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  highlighted = false,
  subtitle
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  highlighted?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={`${highlighted ? 'bg-purple-50 border-purple-400' : 'bg-white border-brand-border'} border rounded-xl p-4 xl:p-5 flex flex-col transition-all duration-200 hover:shadow-medium`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">{title}</p>
        </div>
        <div className={`p-2 rounded-lg ${highlighted ? 'bg-purple-200' : 'bg-brand-background'}`}>
          <Icon size={18} className={`${highlighted ? 'text-purple-700' : 'text-brand-text-secondary'}`} strokeWidth={2} />
        </div>
      </div>
      <div className="text-[22px] xl:text-[24px] font-bold text-brand-text-primary leading-tight mb-1">{value}</div>
      {subtitle && <p className="text-[10px] sm:text-xs text-brand-text-disabled mt-auto">{subtitle}</p>}
    </div>
  );
}

function InvoiceCard({ 
  invoice, 
  onApprove, 
  onReject,
  onViewDetail,
  isApproving,
  isRejecting
}: { 
  invoice: Invoice;
  onApprove: (id: number) => void;
  onReject: (id: number, note: string) => void;
  onViewDetail: (invoice: Invoice) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  
  const proveedor = invoice.oc?.proveedor || invoice.proveedor?.razonSocial || "Sin proveedor";
  const numeroOc = invoice.oc?.numeroOc || "-";
  const montoSinIgv = invoice.montoSinIgv ? Number(invoice.montoSinIgv) : 0;
  const montoConIGV = calcularMontoConIGV(montoSinIgv);
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-purple-500">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-brand-text-primary">
                  {invoice.numberNorm || "Sin número"}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  invoice.docType === "NOTA_CREDITO" 
                    ? "bg-red-50 border-red-200 text-red-800" 
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}>
                  {invoice.docType === "NOTA_CREDITO" ? "NC" : "FAC"}
                </span>
              </div>
              <p className="text-xs text-brand-text-disabled">
                {new Date(invoice.createdAt).toLocaleDateString('es-PE', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-medium">
              <Award size={12} />
              Monto Alto
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div>
              <p className="text-brand-text-disabled text-xs">Proveedor</p>
              <p className="font-medium truncate" title={proveedor}>{proveedor}</p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">OC</p>
              <p className="font-medium">{numeroOc}</p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">Monto sin IGV</p>
              <p className="font-semibold">{invoice.currency} {formatNumber(montoSinIgv)}</p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">Monto con IGV</p>
              <p className="font-bold text-purple-700 text-lg">
                S/ {formatNumber(montoConIGV)}
              </p>
            </div>
            {invoice.periods && invoice.periods.length > 0 && (
              <div className="col-span-2">
                <p className="text-brand-text-disabled text-xs">Períodos</p>
                <p className="font-medium">{formatPeriodsRange(invoice.periods.map(p => p.period))}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onApprove(invoice.id)}
              disabled={isApproving || isRejecting}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle size={16} className="mr-1" />
              {isApproving ? "Aprobando..." : "Aprobar VP"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectModal(true)}
              disabled={isApproving || isRejecting}
              className="text-red-600 hover:bg-red-50"
            >
              <XCircle size={16} className="mr-1" />
              Rechazar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail(invoice)}
            >
              <Eye size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectNote(""); }}
        title="Rechazar Factura"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de rechazar la factura <strong>{invoice.numberNorm}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Motivo del rechazo</label>
            <textarea
              className="w-full border rounded-lg p-2 text-sm"
              rows={3}
              placeholder="Ingresa el motivo del rechazo..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowRejectModal(false); setRejectNote(""); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onReject(invoice.id, rejectNote);
                setShowRejectModal(false);
                setRejectNote("");
              }}
              disabled={isRejecting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRejecting ? "Rechazando..." : "Confirmar Rechazo"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function AprobacionVPFacturasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Fetch invoices pending VP approval
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["approvals", "invoices", "vp"],
    queryFn: async () => (await api.get("/approvals/invoices/vp")).data as Invoice[]
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return (await api.post(`/approvals/invoices/${invoiceId}/approve-vp`)).data;
    },
    onSuccess: () => {
      toast.success("Factura aprobada por VP y enviada a Contabilidad");
      queryClient.invalidateQueries({ queryKey: ["approvals", "invoices"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al aprobar factura");
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ invoiceId, note }: { invoiceId: number; note: string }) => {
      return (await api.post(`/approvals/invoices/${invoiceId}/reject`, { note })).data;
    },
    onSuccess: () => {
      toast.success("Factura rechazada");
      queryClient.invalidateQueries({ queryKey: ["approvals", "invoices"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al rechazar factura");
    }
  });

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    const searchLower = search.toLowerCase();
    return invoices.filter(inv => 
      inv.numberNorm?.toLowerCase().includes(searchLower) ||
      inv.oc?.proveedor?.toLowerCase().includes(searchLower) ||
      inv.proveedor?.razonSocial?.toLowerCase().includes(searchLower) ||
      inv.oc?.numeroOc?.toLowerCase().includes(searchLower)
    );
  }, [invoices, search]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredInvoices.length;
    const totalAmount = filteredInvoices.reduce((sum, inv) => {
      return sum + (inv.montoSinIgv ? calcularMontoConIGV(Number(inv.montoSinIgv)) : 0);
    }, 0);
    const avgAmount = total > 0 ? totalAmount / total : 0;
    return { total, totalAmount, avgAmount };
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Aprobación VP - Facturas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Facturas de monto alto pendientes de aprobación VP.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pendientes VP" value={stats.total} icon={FileText} highlighted />
        <StatCard 
          title="Monto Total" 
          value={`S/ ${formatNumber(stats.totalAmount)}`} 
          icon={DollarSign}
          subtitle="Con IGV"
        />
        <StatCard 
          title="Promedio" 
          value={`S/ ${formatNumber(stats.avgAmount)}`} 
          icon={Award}
          subtitle="Por factura"
        />
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Input
          placeholder="Buscar por número, proveedor u OC..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === "cards" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="px-3"
          >
            <LayoutGrid size={16} className="mr-1" />
            Tarjetas
          </Button>
          <Button
            variant={viewMode === "table" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="px-3"
          >
            <List size={16} className="mr-1" />
            Tabla
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando facturas...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-600">No hay facturas pendientes de VP</p>
            <p className="text-sm text-gray-500 mt-1">
              {search ? "No se encontraron facturas con ese criterio" : "No hay facturas de monto alto pendientes"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredInvoices.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id, note) => rejectMutation.mutate({ invoiceId: id, note })}
              onViewDetail={setSelectedInvoice}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">Número</th>
                    <th className="text-left p-3 font-semibold">Proveedor</th>
                    <th className="text-left p-3 font-semibold">OC</th>
                    <th className="text-left p-3 font-semibold">Monto sin IGV</th>
                    <th className="text-left p-3 font-semibold">Monto con IGV</th>
                    <th className="text-left p-3 font-semibold">Períodos</th>
                    <th className="text-left p-3 font-semibold">Tipo</th>
                    <th className="text-right p-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => {
                    const proveedor = invoice.oc?.proveedor || invoice.proveedor?.razonSocial || "Sin proveedor";
                    const montoSinIgv = invoice.montoSinIgv ? Number(invoice.montoSinIgv) : 0;
                    const montoConIGV = calcularMontoConIGV(montoSinIgv);
                    return (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{invoice.numberNorm || "Sin número"}</div>
                          <div className="text-xs text-gray-500">{new Date(invoice.createdAt).toLocaleDateString('es-PE')}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium truncate max-w-[200px]" title={proveedor}>{proveedor}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{invoice.oc?.numeroOc || "-"}</div>
                        </td>
                        <td className="p-3 font-semibold">
                          {invoice.currency} {formatNumber(montoSinIgv)}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-purple-700 text-lg">
                            S/ {formatNumber(montoConIGV)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {invoice.periods && invoice.periods.length > 0 
                              ? formatPeriodsRange(invoice.periods.map(p => p.period))
                              : "-"
                            }
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            invoice.docType === "NOTA_CREDITO" 
                              ? "bg-red-100 text-red-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {invoice.docType === "NOTA_CREDITO" ? "NC" : "FAC"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => approveMutation.mutate(invoice.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <CheckCircle size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const note = prompt("Motivo del rechazo:");
                                if (note) rejectMutation.mutate({ invoiceId: invoice.id, note });
                              }}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Detalle Factura: ${selectedInvoice?.numberNorm || ''}`}
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Tipo</p>
                <p className="font-medium">{selectedInvoice.docType}</p>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                <p className="font-medium">{selectedInvoice.statusCurrent}</p>
              </div>
              <div>
                <p className="text-gray-500">Proveedor</p>
                <p className="font-medium">{selectedInvoice.oc?.proveedor || selectedInvoice.proveedor?.razonSocial || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">OC</p>
                <p className="font-medium">{selectedInvoice.oc?.numeroOc || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Moneda</p>
                <p className="font-medium">{selectedInvoice.currency}</p>
              </div>
              <div>
                <p className="text-gray-500">Monto sin IGV</p>
                <p className="font-medium">{formatNumber(selectedInvoice.montoSinIgv || 0)}</p>
              </div>
              <div>
                <p className="text-gray-500">Monto con IGV (PEN)</p>
                <p className="font-bold text-lg text-purple-700">
                  S/ {formatNumber(calcularMontoConIGV(selectedInvoice.montoSinIgv ? Number(selectedInvoice.montoSinIgv) : 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Incidente Ultimus</p>
                <p className="font-medium">{selectedInvoice.ultimusIncident || "-"}</p>
              </div>
            </div>
            {selectedInvoice.costCenters && selectedInvoice.costCenters.length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-2">Centros de Costo</p>
                <div className="flex flex-wrap gap-2">
                  {selectedInvoice.costCenters.map(cc => (
                    <span key={cc.id} className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {cc.costCenter.code} - {cc.costCenter.name}
                      {cc.amount && ` (${formatNumber(Number(cc.amount))})`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedInvoice.detalle && (
              <div>
                <p className="text-gray-500 text-sm">Detalle</p>
                <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{selectedInvoice.detalle}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
