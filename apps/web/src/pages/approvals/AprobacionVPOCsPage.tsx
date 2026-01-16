import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatNumber } from "../../utils/numberFormat";
import { CheckCircle, XCircle, Eye, ShoppingCart, DollarSign, Clock, Ban, AlertTriangle, LayoutGrid, List } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 APROBACIÓN VP - ÓRDENES DE COMPRA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Página para aprobar OCs en nivel VP y gestionar solicitudes de anulación.
 * - Muestra OCs en estado APROBACION_VP o ANULAR
 * - Permite aprobar (pasa a ATENDER_COMPRAS) o anular
 * - Vista tipo bandeja de trabajo, solo lectura + acción
 */

interface OcPendienteVP {
  id: number;
  numeroOc: string | null;
  incidenteOc: string | null;
  estado: string;
  // NUEVO: Relación con Proveedor
  proveedorRef?: { id: number; razonSocial: string; ruc: string };
  // DEPRECATED: campos legacy
  proveedor: string;
  ruc: string;
  moneda: string;
  importeSinIgv: number;
  descripcion: string | null;
  // NUEVO: Relación con Usuario
  solicitanteUser?: { id: number; email: string; name: string | null };
  // DEPRECATED: campos legacy
  nombreSolicitante?: string;
  correoSolicitante?: string;
  fechaRegistro: string;
  comentario: string | null;
  support?: { id: number; code: string | null; name: string };
  budgetPeriodFrom?: { id: number; year: number; month: number; label: string };
  budgetPeriodTo?: { id: number; year: number; month: number; label: string };
  articulo?: { id: number; code: string; name: string } | null;
  costCenters?: { id: number; costCenterId: number; costCenter: { id: number; code: string; name: string } }[];
  statusHistory?: { id: number; status: string; changedAt: string; note: string | null }[];
};

const calcularMontoConIGV = (montoSinIgv: number): number => montoSinIgv * 1.18;

const formatPeriod = (period: { year: number; month: number; label: string } | undefined): string => {
  if (!period) return "-";
  return period.label || `${period.year}-${String(period.month).padStart(2, '0')}`;
};

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  highlighted = false,
  subtitle,
  color = "brand"
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  highlighted?: boolean;
  subtitle?: string;
  color?: "brand" | "orange" | "green";
}) {
  const colors = {
    brand: { bg: "bg-table-total border-brand-primary", icon: "bg-brand-primary/10 text-brand-primary" },
    orange: { bg: "bg-orange-50 border-orange-400", icon: "bg-orange-200 text-orange-700" },
    green: { bg: "bg-green-50 border-green-400", icon: "bg-green-200 text-green-700" }
  };
  const c = highlighted ? colors[color] : { bg: "bg-white border-brand-border", icon: "bg-brand-background text-brand-text-secondary" };
  
  return (
    <div className={`${c.bg} border rounded-xl p-4 xl:p-5 flex flex-col transition-all duration-200 hover:shadow-medium`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">{title}</p>
        </div>
        <div className={`p-2 rounded-lg ${c.icon}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      <div className="text-[22px] xl:text-[24px] font-bold text-brand-text-primary leading-tight mb-1">{value}</div>
      {subtitle && <p className="text-[10px] sm:text-xs text-brand-text-disabled mt-auto">{subtitle}</p>}
    </div>
  );
}

function OCCard({ 
  oc, 
  onApprove, 
  onApproveCancel,
  onRejectCancel,
  onViewDetail,
  isPending
}: { 
  oc: OcPendienteVP;
  onApprove: (id: number) => void;
  onApproveCancel: (id: number) => void;
  onRejectCancel: (id: number, note: string) => void;
  onViewDetail: (oc: OcPendienteVP) => void;
  isPending: boolean;
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  
  const montoSinIgv = oc.importeSinIgv ? Number(oc.importeSinIgv) : 0;
  const montoConIGV = calcularMontoConIGV(montoSinIgv);
  const isAnularRequest = oc.estado === "ANULAR";
  
  return (
    <>
      <Card className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${
        isAnularRequest ? 'border-l-red-500' : 'border-l-green-500'
      }`}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-brand-text-primary">
                  {oc.incidenteOc ? `INC ${oc.incidenteOc}` : "Sin INC"}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isAnularRequest 
                    ? "bg-red-100 text-red-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {isAnularRequest ? "Solicitud Anulación" : "Aprobación VP"}
                </span>
              </div>
              <p className="text-xs text-brand-text-disabled">
                {new Date(oc.fechaRegistro).toLocaleDateString('es-PE', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div>
              <p className="text-brand-text-disabled text-xs">Proveedor</p>
              <p className="font-medium truncate" title={oc.proveedorRef?.razonSocial || oc.proveedor}>{oc.proveedorRef?.razonSocial || oc.proveedor || "Sin proveedor"}</p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">RUC</p>
              <p className="font-medium">{oc.proveedorRef?.ruc || oc.ruc || "-"}</p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">Monto sin IGV</p>
              <p className="font-semibold">{oc.moneda} {formatNumber(montoSinIgv)}</p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">Monto con IGV</p>
              <p className="font-bold text-green-700">
                {oc.moneda === "PEN" ? "S/" : "$"} {formatNumber(montoConIGV)}
              </p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">Sustento</p>
              <p className="font-medium truncate" title={oc.support?.name}>{oc.support?.name || "-"}</p>
            </div>
            <div>
              <p className="text-brand-text-disabled text-xs">Período</p>
              <p className="font-medium">{formatPeriod(oc.budgetPeriodFrom)} → {formatPeriod(oc.budgetPeriodTo)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-brand-text-disabled text-xs">Solicitante</p>
              <p className="font-medium">{oc.solicitanteUser?.name || oc.nombreSolicitante || "Sin solicitante"}</p>
            </div>
          </div>

          {/* Descripción */}
          {oc.descripcion && (
            <div className="mb-4">
              <p className="text-brand-text-disabled text-xs uppercase tracking-wide mb-1">Descripción</p>
              <p className="text-sm p-2 bg-gray-50 rounded-lg leading-relaxed line-clamp-3">{oc.descripcion}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t">
            {isAnularRequest ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onApproveCancel(oc.id)}
                  disabled={isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Ban size={16} className="mr-1" />
                  {isPending ? "Procesando..." : "Confirmar Anulación"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRejectModal(true)}
                  disabled={isPending}
                  className="text-green-600 hover:bg-green-50"
                >
                  <XCircle size={16} className="mr-1" />
                  Rechazar
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove(oc.id)}
                disabled={isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={16} className="mr-1" />
                {isPending ? "Aprobando..." : "Aprobar → Atender Compras"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail(oc)}
            >
              <Eye size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reject Cancel Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectNote(""); }}
        title="Rechazar Solicitud de Anulación"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Rechazar la solicitud de anulación de la OC <strong>{oc.numeroOc}</strong>?
            La OC volverá a su estado anterior.
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
                onRejectCancel(oc.id, rejectNote);
                setShowRejectModal(false);
                setRejectNote("");
              }}
              disabled={isPending}
            >
              {isPending ? "Procesando..." : "Confirmar Rechazo"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function AprobacionVPOCsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOC, setSelectedOC] = useState<OcPendienteVP | null>(null);
  const [filterType, setFilterType] = useState<"all" | "approval" | "cancel">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Fetch OCs pending VP approval or cancellation
  const { data: ocs = [], isLoading } = useQuery({
    queryKey: ["approvals", "ocs", "vp"],
    queryFn: async () => (await api.get("/approvals/ocs/vp")).data as OcPendienteVP[]
  });

  // Approve OC mutation
  const approveMutation = useMutation({
    mutationFn: async (ocId: number) => {
      return (await api.post(`/approvals/ocs/${ocId}/approve-vp`)).data;
    },
    onSuccess: () => {
      toast.success("OC aprobada y enviada a Atender Compras");
      queryClient.invalidateQueries({ queryKey: ["approvals", "ocs"] });
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al aprobar OC");
    }
  });

  // Approve cancel mutation
  const approveCancelMutation = useMutation({
    mutationFn: async (ocId: number) => {
      return (await api.post(`/approvals/ocs/${ocId}/approve-cancel`)).data;
    },
    onSuccess: () => {
      toast.success("OC anulada correctamente");
      queryClient.invalidateQueries({ queryKey: ["approvals", "ocs"] });
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al anular OC");
    }
  });

  // Reject cancel mutation
  const rejectCancelMutation = useMutation({
    mutationFn: async ({ ocId, note }: { ocId: number; note: string }) => {
      return (await api.post(`/approvals/ocs/${ocId}/reject-cancel`, { note })).data;
    },
    onSuccess: () => {
      toast.success("Solicitud de anulación rechazada");
      queryClient.invalidateQueries({ queryKey: ["approvals", "ocs"] });
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al rechazar anulación");
    }
  });

  const isPending = approveMutation.isPending || approveCancelMutation.isPending || rejectCancelMutation.isPending;

  // Filter OCs
  const filteredOCs = useMemo(() => {
    let result = ocs;
    
    // Filter by type
    if (filterType === "approval") {
      result = result.filter(oc => oc.estado === "APROBACION_VP");
    } else if (filterType === "cancel") {
      result = result.filter(oc => oc.estado === "ANULAR");
    }
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(oc => 
        oc.numeroOc?.toLowerCase().includes(searchLower) ||
        oc.proveedorRef?.razonSocial?.toLowerCase().includes(searchLower) ||
        oc.proveedorRef?.ruc?.includes(searchLower) ||
        oc.proveedor?.toLowerCase().includes(searchLower) ||
        oc.ruc?.includes(searchLower)
      );
    }
    
    return result;
  }, [ocs, search, filterType]);

  // Stats
  const stats = useMemo(() => {
    const approvalCount = ocs.filter(oc => oc.estado === "APROBACION_VP").length;
    const cancelCount = ocs.filter(oc => oc.estado === "ANULAR").length;
    const totalAmount = ocs.reduce((sum, oc) => {
      return sum + (oc.importeSinIgv ? calcularMontoConIGV(Number(oc.importeSinIgv)) : 0);
    }, 0);
    return { approvalCount, cancelCount, totalAmount };
  }, [ocs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Aprobación VP - Órdenes de Compra</h1>
        <p className="mt-1 text-sm text-slate-600">
          OCs pendientes de aprobación VP y solicitudes de anulación.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard 
          title="Pendientes Aprobación" 
          value={stats.approvalCount} 
          icon={ShoppingCart} 
          highlighted 
          color="green"
        />
        <StatCard 
          title="Solicitudes Anulación" 
          value={stats.cancelCount} 
          icon={AlertTriangle}
          highlighted
          color="orange"
          subtitle="Requieren confirmación"
        />
        <StatCard 
          title="Monto Total" 
          value={`S/ ${formatNumber(stats.totalAmount)}`} 
          icon={DollarSign}
          subtitle="Con IGV"
        />
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Buscar por número OC, proveedor o RUC..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex gap-2">
          <Button
            variant={filterType === "all" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            Todos ({ocs.length})
          </Button>
          <Button
            variant={filterType === "approval" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFilterType("approval")}
            className={filterType === "approval" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            Aprobación ({stats.approvalCount})
          </Button>
          <Button
            variant={filterType === "cancel" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFilterType("cancel")}
            className={filterType === "cancel" ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            Anulación ({stats.cancelCount})
          </Button>
        </div>
        </div>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando OCs...</p>
        </div>
      ) : filteredOCs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-600">No hay OCs pendientes</p>
            <p className="text-sm text-gray-500 mt-1">
              {search ? "No se encontraron OCs con ese criterio" : "Todas las OCs han sido procesadas"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOCs.map(oc => (
            <OCCard
              key={oc.id}
              oc={oc}
              onApprove={(id) => approveMutation.mutate(id)}
              onApproveCancel={(id) => approveCancelMutation.mutate(id)}
              onRejectCancel={(id, note) => rejectCancelMutation.mutate({ ocId: id, note })}
              onViewDetail={setSelectedOC}
              isPending={isPending}
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
                    <th className="text-left p-3 font-semibold">INC</th>
                    <th className="text-left p-3 font-semibold">Proveedor</th>
                    <th className="text-left p-3 font-semibold">Solicitante</th>
                    <th className="text-left p-3 font-semibold">Monto sin IGV</th>
                    <th className="text-left p-3 font-semibold">Monto con IGV</th>
                    <th className="text-left p-3 font-semibold">Estado</th>
                    <th className="text-left p-3 font-semibold">Sustento</th>
                    <th className="text-right p-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOCs.map(oc => {
                    const isAnularRequest = oc.estado === "ANULAR";
                    const montoSinIgv = oc.importeSinIgv ? Number(oc.importeSinIgv) : 0;
                    const montoConIGV = calcularMontoConIGV(montoSinIgv);
                    return (
                      <tr key={oc.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{oc.incidenteOc || "Sin INC"}</div>
                          <div className="text-xs text-gray-500">{new Date(oc.fechaRegistro).toLocaleDateString('es-PE')}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium truncate max-w-[200px]" title={oc.proveedorRef?.razonSocial || oc.proveedor}>
                            {oc.proveedorRef?.razonSocial || oc.proveedor || "Sin proveedor"}
                          </div>
                          <div className="text-xs text-gray-500">{oc.proveedorRef?.ruc || oc.ruc || "-"}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{oc.solicitanteUser?.name || oc.nombreSolicitante || "Sin solicitante"}</div>
                        </td>
                        <td className="p-3 font-semibold">
                          {oc.moneda} {formatNumber(montoSinIgv)}
                        </td>
                        <td className="p-3 font-bold text-green-700">
                          {oc.moneda === "PEN" ? "S/" : "$"} {formatNumber(montoConIGV)}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isAnularRequest 
                              ? "bg-red-100 text-red-800" 
                              : "bg-green-100 text-green-800"
                          }`}>
                            {isAnularRequest ? "Anulación" : "Aprobación VP"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-sm truncate max-w-[150px]" title={oc.support?.name}>
                            {oc.support?.name || "-"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            {isAnularRequest ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => approveCancelMutation.mutate(oc.id)}
                                  disabled={isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Ban size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const note = prompt("Motivo del rechazo:");
                                    if (note) rejectCancelMutation.mutate({ ocId: oc.id, note });
                                  }}
                                  disabled={isPending}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <XCircle size={14} />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => approveMutation.mutate(oc.id)}
                                disabled={isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle size={14} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOC(oc)}
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
        isOpen={!!selectedOC}
        onClose={() => setSelectedOC(null)}
        title={`Detalle OC: ${selectedOC?.numeroOc || ''}`}
      >
        {selectedOC && (
          <div className="space-y-6 p-2">
            {/* Identificación */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-brand-text-disabled uppercase tracking-wide border-b pb-2">
                Identificación
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Número OC</p>
                  <p className="font-semibold text-brand-text-primary">{selectedOC.numeroOc || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Estado</p>
                  <p className="font-medium">{selectedOC.estado}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Sustento</p>
                  <p className="font-medium">{selectedOC.support?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Artículo</p>
                  <p className="font-medium">{selectedOC.articulo?.name || "-"}</p>
                </div>
              </div>
            </section>

            {/* Proveedor y Montos */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-brand-text-disabled uppercase tracking-wide border-b pb-2">
                Proveedor y Montos
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Proveedor</p>
                  <p className="font-medium">{selectedOC.proveedorRef?.razonSocial || selectedOC.proveedor || "Sin proveedor"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">RUC</p>
                  <p className="font-medium">{selectedOC.proveedorRef?.ruc || selectedOC.ruc || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Moneda</p>
                  <p className="font-medium">{selectedOC.moneda}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Monto sin IGV</p>
                  <p className="font-medium">
                    {selectedOC.moneda === "USD" ? "$" : "S/"} {formatNumber(selectedOC.importeSinIgv)}
                  </p>
                </div>
                <div className="col-span-2 bg-brand-background rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Monto con IGV</p>
                  <p className="font-bold text-xl text-brand-text-primary">
                    {selectedOC.moneda === "USD" ? "$" : "S/"} {formatNumber(calcularMontoConIGV(Number(selectedOC.importeSinIgv)))}
                  </p>
                </div>
              </div>
            </section>

            {/* Solicitante */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-brand-text-disabled uppercase tracking-wide border-b pb-2">
                Solicitante
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Nombre</p>
                  <p className="font-medium">{selectedOC.solicitanteUser?.name || selectedOC.nombreSolicitante || "Sin nombre"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Correo</p>
                  <p className="font-medium text-brand-primary">{selectedOC.solicitanteUser?.email || selectedOC.correoSolicitante || "Sin correo"}</p>
                </div>
              </div>
            </section>

            {/* Centros de Costo */}
            {selectedOC.costCenters && selectedOC.costCenters.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-brand-text-disabled uppercase tracking-wide border-b pb-2">
                  Centros de Costo
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOC.costCenters.map((cc: any) => (
                    <span key={cc.id} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium">
                      {cc.costCenter.code} - {cc.costCenter.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Descripción */}
            {selectedOC.descripcion && (
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-brand-text-disabled uppercase tracking-wide border-b pb-2">
                  Descripción
                </h4>
                <p className="text-sm p-3 bg-gray-50 rounded-lg leading-relaxed">{selectedOC.descripcion}</p>
              </section>
            )}

            {/* Comentario */}
            {selectedOC.comentario && (
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-brand-text-disabled uppercase tracking-wide border-b pb-2">
                  Comentario
                </h4>
                <p className="text-sm p-3 bg-yellow-50 rounded-lg leading-relaxed">{selectedOC.comentario}</p>
              </section>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
