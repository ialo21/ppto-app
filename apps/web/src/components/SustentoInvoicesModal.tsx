import React from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "./ui/Modal";
import { api } from "../lib/api";
import { FileText, Building2, Calendar, DollarSign, Receipt, Package, TrendingUp, Loader2, AlertCircle } from "lucide-react";

interface SustentoInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  supportId: number;
  supportName: string;
  year: number;
  mode: "execution" | "contable";
  periodFromId: number | null;
  periodToId: number | null;
}

interface Invoice {
  id: number;
  numeroFactura: string;
  proveedor: string;
  ruc: string;
  ocNumero: string | null;
  moneda: string;
  montoOriginal: number;
  montoPEN: number;
  montoTotal?: number;
  periodos?: string;
  numPeriodos?: number;
  periodosRelevantes?: number;
  status: string;
  mesContable: string | null;
  fechaEmision: Date | null;
  descripcion: string;
}

interface InvoiceDetailData {
  supportInfo: {
    id: number;
    code: string;
    name: string;
    management: string;
    area: string;
    expensePackage: string;
  };
  mode: string;
  year: number;
  periodRange: {
    from: string;
    to: string;
  };
  invoices: Invoice[];
  totals: {
    count: number;
    totalAmount: number;
  };
}

export default function SustentoInvoicesModal({
  isOpen,
  onClose,
  supportId,
  supportName,
  year,
  mode,
  periodFromId,
  periodToId
}: SustentoInvoicesModalProps) {
  const { data, isLoading, isError } = useQuery<InvoiceDetailData>({
    queryKey: ["sustento-invoices", supportId, year, mode, periodFromId, periodToId],
    queryFn: async () => {
      const params: any = { year, mode };
      if (periodFromId) params.periodFromId = periodFromId;
      if (periodToId) params.periodToId = periodToId;
      
      return (await api.get(`/reports/dashboard/sustento/${supportId}/invoices`, { params })).data;
    },
    enabled: isOpen && supportId > 0,
    staleTime: 1000 * 60 * 2,
  });

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      INGRESADO: { label: "Ingresado", color: "bg-gray-100 text-gray-700" },
      APROBACION_HEAD: { label: "Aprobación Head", color: "bg-blue-100 text-blue-700" },
      APROBACION_VP: { label: "Aprobación VP", color: "bg-purple-100 text-purple-700" },
      EN_CONTABILIDAD: { label: "Contabilidad", color: "bg-yellow-100 text-yellow-700" },
      EN_TESORERIA: { label: "Tesorería", color: "bg-orange-100 text-orange-700" },
      EN_ESPERA_DE_PAGO: { label: "Espera de Pago", color: "bg-amber-100 text-amber-700" },
      PAGADO: { label: "Pagado", color: "bg-green-100 text-green-700" },
      RECHAZADO: { label: "Rechazado", color: "bg-red-100 text-red-700" }
    };

    const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-700" };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="">
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
            <p className="text-sm text-brand-text-secondary">Cargando desglose de facturas...</p>
          </div>
        ) : isError || !data ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-10 h-10 text-status-error mb-4" />
            <p className="text-sm text-status-error font-medium">Error al cargar las facturas</p>
            <p className="text-xs text-brand-text-secondary mt-2">Por favor, intente nuevamente</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-brand-border pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-brand-text-primary">
                        Desglose de Facturas
                      </h2>
                      <p className="text-sm text-brand-text-secondary">
                        {data.supportInfo.name}
                      </p>
                    </div>
                  </div>
                  
                  {/* Info cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="w-4 h-4 text-brand-text-secondary" />
                      <div>
                        <span className="text-brand-text-disabled block">Gerencia</span>
                        <span className="text-brand-text-primary font-medium">{data.supportInfo.management || "N/A"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Package className="w-4 h-4 text-brand-text-secondary" />
                      <div>
                        <span className="text-brand-text-disabled block">Área</span>
                        <span className="text-brand-text-primary font-medium">{data.supportInfo.area || "N/A"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-4 h-4 text-brand-text-secondary" />
                      <div>
                        <span className="text-brand-text-disabled block">Período</span>
                        <span className="text-brand-text-primary font-medium">
                          {data.periodRange.from === data.periodRange.to 
                            ? data.periodRange.from 
                            : `${data.periodRange.from} - ${data.periodRange.to}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="w-4 h-4 text-brand-text-secondary" />
                      <div>
                        <span className="text-brand-text-disabled block">Modo</span>
                        <span className="text-brand-text-primary font-medium">
                          {mode === "execution" ? "Ejecución" : "Contable"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-brand-background rounded-lg p-4 border border-brand-border">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs text-brand-text-secondary font-semibold uppercase">Total Facturas</span>
                </div>
                <div className="text-2xl font-bold text-brand-text-primary">
                  {data.totals.count}
                </div>
                <p className="text-xs text-brand-text-disabled mt-1">
                  Documentos procesados
                </p>
              </div>
              <div className="bg-brand-primary/5 rounded-lg p-4 border border-brand-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs text-brand-text-secondary font-semibold uppercase">Monto Total</span>
                </div>
                <div className="text-2xl font-bold text-brand-primary">
                  {formatCurrency(data.totals.totalAmount)}
                </div>
                <p className="text-xs text-brand-text-disabled mt-1">
                  {mode === "execution" ? "Monto prorrateado en el período" : "Monto contabilizado"}
                </p>
              </div>
            </div>

            {/* Invoices Table */}
            {data.invoices.length === 0 ? (
              <div className="text-center py-12 bg-brand-background rounded-lg border border-brand-border">
                <Receipt className="w-12 h-12 text-brand-text-disabled mx-auto mb-3" />
                <p className="text-sm text-brand-text-secondary font-medium">No hay facturas registradas</p>
                <p className="text-xs text-brand-text-disabled mt-1">
                  Este sustento no tiene facturas en el período seleccionado
                </p>
              </div>
            ) : (
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-brand-background sticky top-0 z-10">
                      <tr>
                        <th className="text-left text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border">
                          Factura
                        </th>
                        <th className="text-left text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border">
                          Proveedor
                        </th>
                        {mode === "execution" && (
                          <th className="text-left text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border">
                            Períodos
                          </th>
                        )}
                        {mode === "contable" && (
                          <th className="text-left text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border">
                            Mes Contable
                          </th>
                        )}
                        <th className="text-right text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border">
                          Monto
                        </th>
                        <th className="text-center text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((invoice, idx) => (
                        <tr 
                          key={invoice.id}
                          className={`${
                            idx % 2 === 0 ? "bg-white" : "bg-brand-background/30"
                          } hover:bg-brand-background transition-colors`}
                        >
                          <td className="p-3 border-b border-brand-border-light">
                            <div>
                              <div className="text-xs font-medium text-brand-text-primary">
                                {invoice.numeroFactura}
                              </div>
                              {invoice.ocNumero && (
                                <div className="text-xs text-brand-text-disabled">
                                  OC: {invoice.ocNumero}
                                </div>
                              )}
                              <div className="text-xs text-brand-text-disabled mt-1">
                                {formatDate(invoice.fechaEmision)}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 border-b border-brand-border-light">
                            <div>
                              <div className="text-xs font-medium text-brand-text-primary">
                                {invoice.proveedor}
                              </div>
                              {invoice.ruc && (
                                <div className="text-xs text-brand-text-disabled">
                                  RUC: {invoice.ruc}
                                </div>
                              )}
                            </div>
                          </td>
                          {mode === "execution" && (
                            <td className="p-3 border-b border-brand-border-light">
                              <div className="text-xs text-brand-text-primary">
                                {invoice.periodos || "-"}
                              </div>
                              {invoice.numPeriodos && invoice.numPeriodos > 1 && (
                                <div className="text-xs text-brand-text-disabled mt-1">
                                  {invoice.periodosRelevantes}/{invoice.numPeriodos} meses en rango
                                </div>
                              )}
                            </td>
                          )}
                          {mode === "contable" && (
                            <td className="p-3 border-b border-brand-border-light">
                              <div className="text-xs text-brand-text-primary">
                                {invoice.mesContable || "-"}
                              </div>
                            </td>
                          )}
                          <td className="p-3 border-b border-brand-border-light text-right">
                            <div className="text-xs font-semibold text-brand-text-primary">
                              {formatCurrency(invoice.montoPEN)}
                            </div>
                            {invoice.moneda !== "PEN" && (
                              <div className="text-xs text-brand-text-disabled">
                                {invoice.moneda} {invoice.montoOriginal.toFixed(2)}
                              </div>
                            )}
                            {mode === "execution" && invoice.numPeriodos && invoice.numPeriodos > 1 && (
                              <div className="text-xs text-brand-text-disabled italic">
                                Total: {formatCurrency(invoice.montoTotal || 0)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 border-b border-brand-border-light text-center">
                            {getStatusBadge(invoice.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer note */}
            {data.invoices.length > 0 && mode === "execution" && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> En modo Ejecución, las facturas con distribución en múltiples períodos 
                  muestran el monto prorrateado correspondiente al rango de fechas seleccionado.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
