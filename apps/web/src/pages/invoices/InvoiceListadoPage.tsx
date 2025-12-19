import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useWebSocket } from "../../hooks/useWebSocket";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import FilterSelect from "../../components/ui/FilterSelect";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import InvoiceStatusTimeline from "../../components/InvoiceStatusTimeline";
import { formatNumber } from "../../utils/numberFormat";
import { ExternalLink, FileText, Users, DollarSign, TrendingUp, Clock } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📄 LISTADO DE FACTURAS (VISTA VIEWER CON TARJETAS)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * DISEÑO (Diciembre 2024):
 * - Vista orientada a consulta con TARJETAS en lugar de tabla
 * - ESTADÍSTICAS agregadas entre filtros y listado
 * - Búsqueda global por texto libre (múltiples campos)
 * - Solo acciones de lectura (Ver detalle)
 * 
 * CAMPOS DE BÚSQUEDA:
 * - Número de factura, Proveedor, OC, Incidente, Detalle
 * 
 * CAMPOS DE TARJETA (según modelo Invoice):
 * - numberNorm: Número de factura normalizado
 * - docType: Tipo de documento (FACTURA/NOTA_CREDITO)
 * - statusCurrent: Estado actual
 * - currency + montoSinIgv: Importe sin IGV
 * - oc.proveedor: Proveedor
 * - oc.numeroOc: Número de OC asociada (si aplica)
 * - createdAt: Fecha de registro
 * 
 * ESTADÍSTICAS CALCULADAS (frontend):
 * 1. Total de Facturas: Cuenta de facturas después de aplicar filtros
 * 2. Total Pendientes: Facturas no pagadas
 * 3. Proveedor con más facturas: Agrupa por proveedor y cuenta
 * 4. Importe total: Suma de importes (PEN y USD separados)
 */

type Invoice = {
  id: number;
  ocId: number | null;
  oc: {
    id: number;
    numeroOc: string | null;
    proveedor: string;
    moneda: string;
  } | null;
  docType: string;
  numberNorm: string | null;
  currency: string;
  montoSinIgv: number | null;
  statusCurrent: string;
  ultimusIncident: string | null;
  detalle: string | null;
  createdAt: string;
  periods?: { id: number; periodId: number; period: { id: number; year: number; month: number } }[];
  costCenters?: { id: number; costCenterId: number; costCenter: { id: number; code: string; name: string } }[];
};

const ESTADOS_FACTURA = [
  "INGRESADO", "EN_APROBACION", "APROBACION_HEAD", "APROBACION_VP", "EN_CONTABILIDAD",
  "EN_TESORERIA", "EN_ESPERA_DE_PAGO", "PAGADO", "RECHAZADO"
];

const TIPOS_DOC = ["FACTURA", "NOTA_CREDITO"];

// Mapeo de colores para estados
const getStatusColor = (estado: string): string => {
  const statusColors: Record<string, string> = {
    INGRESADO: "bg-gray-100 text-gray-800",
    EN_APROBACION: "bg-yellow-100 text-yellow-800",
    APROBACION_HEAD: "bg-yellow-100 text-yellow-800",
    APROBACION_VP: "bg-purple-100 text-purple-800",
    EN_CONTABILIDAD: "bg-blue-100 text-blue-800",
    EN_TESORERIA: "bg-indigo-100 text-indigo-800",
    EN_ESPERA_DE_PAGO: "bg-orange-100 text-orange-800",
    PAGADO: "bg-green-100 text-green-800",
    RECHAZADO: "bg-red-100 text-red-800"
  };
  return statusColors[estado] || "bg-slate-100 text-slate-800";
};

// Mapeo de colores para tipos de documento
const getDocTypeColor = (tipo: string): string => {
  return tipo === "NOTA_CREDITO" 
    ? "bg-red-50 border-red-200 text-red-800" 
    : "bg-blue-50 border-blue-200 text-blue-800";
};

// Helper para formatear rango de períodos
const formatPeriodsRange = (periods: { year: number; month: number }[]): string => {
  if (!periods || periods.length === 0) return "-";
  if (periods.length === 1) {
    return `${periods[0].year}-${String(periods[0].month).padStart(2, '0')}`;
  }
  const sorted = [...periods].sort((a, b) => {
    const aValue = a.year * 100 + a.month;
    const bValue = b.year * 100 + b.month;
    return aValue - bValue;
  });
  return `${sorted[0].year}-${String(sorted[0].month).padStart(2, '0')} → ${sorted[sorted.length - 1].year}-${String(sorted[sorted.length - 1].month).padStart(2, '0')}`;
};

/**
 * Tarjeta KPI de estadísticas (estilo OcListadoPage)
 */
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
  const isLongText = typeof value === 'string' && value.length > 15;
  
  return (
    <div 
      className={`
        ${highlighted ? 'bg-table-total border-brand-primary' : 'bg-white border-brand-border'}
        border rounded-xl p-4 xl:p-5 flex flex-col
        transition-all duration-200 hover:shadow-medium hover:scale-[1.02]
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
            {title}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${highlighted ? 'bg-brand-primary/10' : 'bg-brand-background'}`}>
          <Icon 
            size={18} 
            className={`${highlighted ? 'text-brand-primary' : 'text-brand-text-secondary'}`} 
            strokeWidth={2}
          />
        </div>
      </div>
      <div className={`
        ${isLongText ? 'text-base xl:text-lg 2xl:text-xl' : 'text-[22px] xl:text-[24px] 2xl:text-[26px]'}
        font-bold text-brand-text-primary leading-tight mb-1
      `}>
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-brand-text-disabled mt-auto">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * Tarjeta individual de Factura
 */
function InvoiceCard({ 
  invoice, 
  onViewDetail,
  onOpenTimeline
}: { 
  invoice: Invoice; 
  onViewDetail: (invoice: Invoice) => void;
  onOpenTimeline: (invoiceId: number) => void;
}) {
  const proveedor = invoice.oc?.proveedorRef?.razonSocial || invoice.oc?.proveedor || "Sin proveedor";
  const numeroOc = invoice.oc?.numeroOc || "-";
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        {/* Header: Número Factura + Tipo Doc + Estado */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-brand-text-primary">
                {invoice.numberNorm || "Sin número"}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getDocTypeColor(invoice.docType)}`}>
                {invoice.docType === "NOTA_CREDITO" ? "NC" : "FAC"}
              </span>
            </div>
            <p className="text-xs text-brand-text-disabled">
              {new Date(invoice.createdAt).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${getStatusColor(invoice.statusCurrent)}`}>
            {invoice.statusCurrent.replace(/_/g, " ")}
          </span>
        </div>
        
        {/* Proveedor */}
        <div className="mb-3">
          <p className="text-sm font-semibold text-brand-text-primary mb-1">
            {proveedor}
          </p>
          {invoice.oc?.numeroOc && (
            <p className="text-xs text-brand-text-secondary">
              OC: {numeroOc}
            </p>
          )}
        </div>
        
        {/* Importe */}
        <div className="mb-3 p-3 bg-brand-background rounded-lg">
          <p className="text-xs text-brand-text-secondary mb-1">Importe sin IGV</p>
          <p className="text-xl font-bold text-brand-primary">
            {invoice.currency} {formatNumber(invoice.montoSinIgv || 0)}
          </p>
        </div>
        
        {/* Periodo */}
        {invoice.periods && invoice.periods.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-brand-text-secondary mb-1">Período</p>
            <p className="text-sm text-brand-text-primary">
              {formatPeriodsRange(invoice.periods.map(p => p.period))}
            </p>
          </div>
        )}
        
        {/* CECOs */}
        {invoice.costCenters && invoice.costCenters.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-brand-text-secondary mb-1">CECOs</p>
            <div className="flex flex-wrap gap-1">
              {invoice.costCenters.slice(0, 3).map((cc) => (
                <span
                  key={cc.id}
                  className="inline-block px-2 py-0.5 text-xs rounded bg-brand-100 text-brand-800"
                  title={cc.costCenter.name}
                >
                  {cc.costCenter.code}
                </span>
              ))}
              {invoice.costCenters.length > 3 && (
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">
                  +{invoice.costCenters.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Incidente */}
        {invoice.ultimusIncident && (
          <div className="mb-4">
            <p className="text-xs text-brand-text-secondary mb-1">Incidente</p>
            <p className="text-sm text-brand-text-primary truncate" title={invoice.ultimusIncident}>
              {invoice.ultimusIncident}
            </p>
          </div>
        )}
        
        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenTimeline(invoice.id)}
            className="flex-1 flex items-center justify-center gap-2"
            title="Ver historial de estados"
          >
            <Clock size={14} />
            Status
          </Button>
          
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onViewDetail(invoice)}
            className="flex-1 flex items-center justify-center gap-2"
            title="Ver detalle de la factura"
          >
            <FileText size={14} />
            Ver Detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvoiceListadoPage() {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices")).data
  });

  // WebSocket para actualizaciones en tiempo real
  useWebSocket({
    onInvoiceStatusChange: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  });

  const [filters, setFilters] = useState({
    search: "",
    docType: "",
    status: "",
    year: new Date().getFullYear().toString()
  });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const { data: statusHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["invoice-status-history", selectedInvoiceId],
    queryFn: async () => (await api.get(`/invoices/${selectedInvoiceId}/history`)).data,
    enabled: selectedInvoiceId !== null && isTimelineOpen
  });

  const handleViewDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };
  
  const handleOpenTimeline = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setIsTimelineOpen(true);
  };
  
  const handleCloseTimeline = () => {
    setIsTimelineOpen(false);
    setTimeout(() => setSelectedInvoiceId(null), 300);
  };

  // Función de búsqueda y filtrado
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    let result = [...invoices];
    
    // Filtro por año (usando createdAt)
    if (filters.year) {
      const year = parseInt(filters.year);
      result = result.filter((inv) => {
        const invYear = new Date(inv.createdAt).getFullYear();
        return invYear === year;
      });
    }
    
    // Búsqueda global por texto libre
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((inv) => {
        if (inv.numberNorm?.toLowerCase().includes(searchLower)) return true;
        if (inv.oc?.proveedor?.toLowerCase().includes(searchLower)) return true;
        if (inv.oc?.numeroOc?.toLowerCase().includes(searchLower)) return true;
        if (inv.ultimusIncident?.toLowerCase().includes(searchLower)) return true;
        if (inv.detalle?.toLowerCase().includes(searchLower)) return true;
        
        // Buscar en CECOs
        if (inv.costCenters && inv.costCenters.length > 0) {
          const cecoMatch = inv.costCenters.some((cc) => 
            cc.costCenter?.code?.toLowerCase().includes(searchLower) ||
            cc.costCenter?.name?.toLowerCase().includes(searchLower)
          );
          if (cecoMatch) return true;
        }
        
        return false;
      });
    }
    
    // Filtros específicos
    if (filters.docType) {
      result = result.filter((inv) => inv.docType === filters.docType);
    }
    
    if (filters.status) {
      result = result.filter((inv) => inv.statusCurrent === filters.status);
    }
    
    return result;
  }, [invoices, filters]);

  // Cálculo de estadísticas
  const statistics = useMemo(() => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      return {
        totalFacturas: 0,
        totalPendientes: 0,
        proveedorTop: null,
        importeTotal: { PEN: 0, USD: 0 }
      };
    }
    
    // 1. Total de facturas
    const totalFacturas = filteredInvoices.length;
    
    // 2. Total pendientes (no pagadas)
    const totalPendientes = filteredInvoices.filter(
      (inv) => inv.statusCurrent !== "PAGADO" && inv.statusCurrent !== "RECHAZADO"
    ).length;
    
    // 3. Proveedor con más facturas
    const proveedorCounts: Record<string, number> = {};
    filteredInvoices.forEach((inv) => {
      const proveedor = inv.oc?.proveedor || "Sin proveedor";
      proveedorCounts[proveedor] = (proveedorCounts[proveedor] || 0) + 1;
    });
    
    let proveedorTop = null;
    let maxProveedorCount = 0;
    for (const [proveedor, count] of Object.entries(proveedorCounts)) {
      if (count > maxProveedorCount) {
        maxProveedorCount = count;
        proveedorTop = { nombre: proveedor, cantidad: count };
      }
    }
    
    // 4. Importe total por moneda
    const importeTotal = { PEN: 0, USD: 0 };
    filteredInvoices.forEach((inv) => {
      if (inv.montoSinIgv) {
        const monto = Number(inv.montoSinIgv);
        if (inv.currency === "PEN") {
          importeTotal.PEN += monto;
        } else if (inv.currency === "USD") {
          importeTotal.USD += monto;
        }
      }
    });
    
    return {
      totalFacturas,
      totalPendientes,
      proveedorTop,
      importeTotal
    };
  }, [filteredInvoices]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.docType) params.set("docType", filters.docType);
    if (filters.status) params.set("status", filters.status);
    window.open(`http://localhost:3001/invoices/export/csv?${params.toString()}`, "_blank");
  };

  // Generar opciones de años
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    return years.reverse();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            Listado de Facturas
          </h1>
          <p className="text-sm text-brand-text-secondary mt-1">
            Vista de consulta con tarjetas y estadísticas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-brand-text-primary">Filtros de Búsqueda</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Filtro de Año */}
            <FilterSelect
              label="Año"
              placeholder="Año"
              value={filters.year}
              onChange={(value) => setFilters(f => ({ ...f, year: value }))}
              options={yearOptions}
              searchable={false}
            />
            
            {/* Búsqueda global */}
            <div className="md:col-span-2">
              <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                Buscar
              </label>
              <Input
                placeholder="Factura, proveedor, OC, incidente..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            
            {/* Filtro de Tipo */}
            <FilterSelect
              label="Tipo"
              placeholder="Todos"
              value={filters.docType}
              onChange={(value) => setFilters(f => ({ ...f, docType: value }))}
              options={TIPOS_DOC.map(tipo => ({
                value: tipo,
                label: tipo === "NOTA_CREDITO" ? "Nota de Crédito" : "Factura"
              }))}
              searchable={false}
            />
            
            {/* Filtro de Estado */}
            <FilterSelect
              label="Estado"
              placeholder="Todos"
              value={filters.status}
              onChange={(value) => setFilters(f => ({ ...f, status: value }))}
              options={ESTADOS_FACTURA.map(estado => ({
                value: estado,
                label: estado.replace(/_/g, " ")
              }))}
            />
          </div>
          
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" onClick={handleExportCSV} size="sm">
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total de Facturas"
            value={statistics.totalFacturas}
            icon={FileText}
            subtitle={`Año ${filters.year}`}
            highlighted
          />
          
          <StatCard
            title="Pendientes de Pago"
            value={statistics.totalPendientes}
            icon={Clock}
            subtitle="No pagadas ni rechazadas"
          />
          
          <StatCard
            title="Proveedor Top"
            value={statistics.proveedorTop ? statistics.proveedorTop.nombre : "N/A"}
            icon={Users}
            subtitle={statistics.proveedorTop ? `${statistics.proveedorTop.cantidad} facturas` : "Sin datos"}
          />
          
          <StatCard
            title="Importe Total"
            value={statistics.importeTotal.PEN > 0 || statistics.importeTotal.USD > 0 
              ? `PEN ${formatNumber(statistics.importeTotal.PEN)}`
              : "N/A"}
            icon={DollarSign}
            subtitle={statistics.importeTotal.USD > 0 ? `USD ${formatNumber(statistics.importeTotal.USD)}` : ""}
          />
        </div>
      )}

      {/* Grid de tarjetas de Facturas */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-brand-text-secondary">
              Cargando facturas...
            </div>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 text-brand-text-disabled" />
              <p className="text-brand-text-secondary">
                {filters.search || filters.docType || filters.status
                  ? "No se encontraron facturas que coincidan con los filtros"
                  : "No hay facturas registradas"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-text-secondary">
              Mostrando <span className="font-semibold">{filteredInvoices.length}</span> facturas
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard 
                key={invoice.id} 
                invoice={invoice} 
                onViewDetail={handleViewDetail}
                onOpenTimeline={handleOpenTimeline}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal de timeline de estados */}
      <Modal
        isOpen={isTimelineOpen}
        onClose={handleCloseTimeline}
        title="Historial de Estados"
        size="md"
      >
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            <p className="mt-4">Cargando historial...</p>
          </div>
        ) : statusHistory && selectedInvoiceId ? (
          <InvoiceStatusTimeline 
            history={statusHistory}
            currentStatus={filteredInvoices.find(inv => inv.id === selectedInvoiceId)?.statusCurrent || "INGRESADO"}
          />
        ) : (
          <div className="p-8 text-center text-brand-text-secondary">
            No se pudo cargar el historial de estados
          </div>
        )}
      </Modal>

      {/* Modal de detalle */}
      <Modal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        title={selectedInvoice ? `Factura: ${selectedInvoice.numberNorm || 'Sin número'}` : 'Detalle de Factura'}
        size="lg"
      >
        {selectedInvoice ? (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Tipo de Documento</p>
                <p className="text-sm text-brand-text-primary">
                  {selectedInvoice.docType === "NOTA_CREDITO" ? "Nota de Crédito" : "Factura"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Estado</p>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(selectedInvoice.statusCurrent)}`}>
                  {selectedInvoice.statusCurrent.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Proveedor</p>
                <p className="text-sm text-brand-text-primary">
                  {selectedInvoice.oc?.proveedor || "Sin proveedor"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">OC Asociada</p>
                <p className="text-sm text-brand-text-primary">
                  {selectedInvoice.oc?.numeroOc || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Importe sin IGV</p>
                <p className="text-sm text-brand-text-primary font-semibold">
                  {selectedInvoice.currency} {formatNumber(selectedInvoice.montoSinIgv || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Fecha de Registro</p>
                <p className="text-sm text-brand-text-primary">
                  {new Date(selectedInvoice.createdAt).toLocaleDateString('es-PE')}
                </p>
              </div>
            </div>
            
            {selectedInvoice.ultimusIncident && (
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Incidente</p>
                <p className="text-sm text-brand-text-primary">{selectedInvoice.ultimusIncident}</p>
              </div>
            )}
            
            {selectedInvoice.detalle && (
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Detalle</p>
                <p className="text-sm text-brand-text-primary">{selectedInvoice.detalle}</p>
              </div>
            )}
            
            {selectedInvoice.periods && selectedInvoice.periods.length > 0 && (
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Períodos</p>
                <p className="text-sm text-brand-text-primary">
                  {formatPeriodsRange(selectedInvoice.periods.map(p => p.period))}
                </p>
              </div>
            )}
            
            {selectedInvoice.costCenters && selectedInvoice.costCenters.length > 0 && (
              <div>
                <p className="text-xs text-brand-text-secondary font-medium mb-1">Centros de Costo</p>
                <div className="flex flex-wrap gap-2">
                  {selectedInvoice.costCenters.map((cc) => (
                    <span
                      key={cc.id}
                      className="inline-block px-2 py-1 text-xs rounded bg-brand-100 text-brand-800"
                    >
                      {cc.costCenter.code} - {cc.costCenter.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-brand-text-secondary">
            No se pudo cargar el detalle
          </div>
        )}
      </Modal>
    </div>
  );
}
