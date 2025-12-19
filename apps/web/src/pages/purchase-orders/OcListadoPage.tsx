import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useWebSocket } from "../../hooks/useWebSocket";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import FilterSelect from "../../components/ui/FilterSelect";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import OcStatusTimeline from "../../components/OcStatusTimeline";
import { formatNumber } from "../../utils/numberFormat";
import { formatPeriodLabel } from "../../utils/periodFormat";
import { ExternalLink, TrendingUp, Package, Users, DollarSign, Clock } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📦 LISTADO DE ÓRDENES DE COMPRA (VISTA VIEWER CON TARJETAS)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * REDISEÑO (Diciembre 2024):
 * - Vista orientada a consulta con TARJETAS en lugar de tabla
 * - ESTADÍSTICAS agregadas entre filtros y listado
 * - Búsqueda global por texto libre (múltiples campos)
 * - Botón "Ver" que abre el link de cotización de cada OC
 * 
 * CAMPOS DE BÚSQUEDA:
 * - Número de OC, Proveedor, RUC, Sustento, Descripción, Comentario, CECOs
 * 
 * CAMPOS DE TARJETA (según modelo OC):
 * - numeroOc: Número de OC
 * - estado: Estado actual
 * - proveedor: Nombre del proveedor
 * - moneda + importeSinIgv: Importe sin IGV
 * - fechaRegistro: Fecha de registro
 * - support.name: Sustento
 * - linkCotizacion: URL de cotización (para botón "Ver")
 * 
 * ESTADÍSTICAS CALCULADAS (frontend):
 * 1. Total de OCs: Cuenta de OCs después de aplicar filtros
 * 2. Promedio mensual: Total OCs / 12 meses
 * 3. Proveedor con más OCs: Agrupa por proveedor y cuenta
 * 4. Importe total: Suma de importes sin IGV (en PEN y USD separados)
 * 
 * NOTA: Las estadísticas se calculan en el frontend sobre los datos ya cargados
 * para evitar llamadas adicionales al backend. Si en el futuro se requiere
 * paginación, considerar crear un endpoint de agregados.
 */

const ESTADOS_OC = [
  "PENDIENTE", "PROCESAR", "EN_PROCESO", "PROCESADO", "APROBACION_VP",
  "ANULAR", "ANULADO", "ATENDER_COMPRAS", "ATENDIDO"
];

// Mapeo de colores para estados (mismo esquema que OcStatusChip)
const getStatusColor = (estado: string): string => {
  const statusColors: Record<string, string> = {
    PENDIENTE: "bg-gray-100 text-gray-800",
    PROCESAR: "bg-yellow-100 text-yellow-800",
    EN_PROCESO: "bg-cyan-100 text-cyan-800",
    PROCESADO: "bg-blue-100 text-blue-800",
    APROBACION_VP: "bg-purple-100 text-purple-800",
    ANULAR: "bg-orange-100 text-orange-800",
    ANULADO: "bg-red-100 text-red-800",
    ATENDER_COMPRAS: "bg-indigo-100 text-indigo-800",
    ATENDIDO: "bg-green-100 text-green-800"
  };
  return statusColors[estado] || "bg-slate-100 text-slate-800";
};

// Helper para formatear rango de períodos
const formatPeriodRange = (periodFrom: any, periodTo: any): string => {
  if (!periodFrom || !periodTo) return "-";
  
  const fromLabel = formatPeriodLabel(periodFrom);
  const toLabel = formatPeriodLabel(periodTo);
  
  if (periodFrom.id === periodTo.id) {
    return fromLabel;
  }
  
  return `${fromLabel} → ${toLabel}`;
};

/**
 * Tarjeta KPI de estadísticas (estilo Dashboard)
 * NOTA: Para tarjetas de "Top" (Proveedor/Solicitante), el 'value' contiene el NOMBRE
 * y el 'subtitle' contiene la métrica asociada (ej: "X OCs en el año").
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
  // Detectar si el valor es un texto largo (nombre) para ajustar el tamaño de fuente
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
      {/* Valor principal - ajustado para textos largos */}
      <div className={`
        ${isLongText ? 'text-base xl:text-lg 2xl:text-xl' : 'text-[22px] xl:text-[24px] 2xl:text-[26px]'}
        font-bold text-brand-text-primary leading-tight mb-1
      `}>
        {value}
      </div>
      {/* Subtítulo - ahora debajo del valor */}
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-brand-text-disabled mt-auto">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * Tarjeta individual de OC
 */
function OcCard({ oc, onOpenTimeline }: { oc: any; onOpenTimeline: (ocId: number) => void }) {
  const hasLink = oc.linkCotizacion && oc.linkCotizacion.trim();
  
  const handleViewClick = () => {
    if (hasLink) {
      window.open(oc.linkCotizacion, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        {/* Header: Número OC / INC + Estado */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-brand-text-primary">
              {/* Prioridad: numeroOc > INC > Solicitud > "INC PENDIENTE" */}
              {oc.numeroOc || 
               (oc.incidenteOc ? `INC ${oc.incidenteOc}` : 
               (oc.solicitudOc ? `SOL ${oc.solicitudOc}` : "INC PENDIENTE"))}
            </h3>
            <p className="text-xs text-brand-text-disabled">
              {new Date(oc.fechaRegistro).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(oc.estado)}`}>
            {oc.estado.replace(/_/g, " ")}
          </span>
        </div>
        
        {/* Proveedor */}
        <div className="mb-3">
          <p className="text-sm font-semibold text-brand-text-primary mb-1">
            {oc.proveedorRef?.razonSocial || oc.proveedor || "Sin proveedor"}
          </p>
          <p className="text-xs text-brand-text-secondary">
            RUC: {oc.proveedorRef?.ruc || oc.ruc || "-"}
          </p>
        </div>
        
        {/* Importe */}
        <div className="mb-3 p-3 bg-brand-background rounded-lg">
          <p className="text-xs text-brand-text-secondary mb-1">Importe sin IGV</p>
          <p className="text-xl font-bold text-brand-primary">
            {oc.moneda} {formatNumber(oc.importeSinIgv)}
          </p>
        </div>
        
        {/* Sustento */}
        {oc.support && (
          <div className="mb-3">
            <p className="text-xs text-brand-text-secondary mb-1">Sustento</p>
            <p className="text-sm text-brand-text-primary">
              {oc.support.code ? `${oc.support.code} - ` : ''}{oc.support.name}
            </p>
          </div>
        )}
        
        {/* CECOs */}
        {oc.costCenters && oc.costCenters.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-brand-text-secondary mb-1">CECOs</p>
            <div className="flex flex-wrap gap-1">
              {oc.costCenters.slice(0, 3).map((cc: any) => (
                <span
                  key={cc.id}
                  className="inline-block px-2 py-0.5 text-xs rounded bg-brand-100 text-brand-800"
                  title={cc.costCenter.name}
                >
                  {cc.costCenter.code}
                </span>
              ))}
              {oc.costCenters.length > 3 && (
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">
                  +{oc.costCenters.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Período */}
        <div className="mb-4">
          <p className="text-xs text-brand-text-secondary mb-1">Período</p>
          <p className="text-sm text-brand-text-primary">
            {formatPeriodRange(oc.budgetPeriodFrom, oc.budgetPeriodTo)}
          </p>
        </div>
        
        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenTimeline(oc.id)}
            className="flex items-center justify-center gap-2"
            title="Ver historial de estados"
          >
            <Clock size={14} />
            Status
          </Button>
          
          <Button
            size="sm"
            variant={hasLink ? "primary" : "secondary"}
            onClick={handleViewClick}
            disabled={!hasLink}
            className="flex items-center justify-center gap-2"
            title={hasLink ? "Ver cotización" : "No hay cotización registrada"}
          >
            <ExternalLink size={14} />
            {hasLink ? "Ver" : "Sin Link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OcListadoPage() {
  const queryClient = useQueryClient();
  const { data: ocs = [], isLoading } = useQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data
  });

  // WebSocket para actualizaciones en tiempo real
  useWebSocket({
    onOcStatusChange: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
    }
  });

  const [filters, setFilters] = useState({
    search: "",          // Búsqueda global
    moneda: "",
    estado: "",
    year: new Date().getFullYear().toString()
  });

  const [selectedOcId, setSelectedOcId] = useState<number | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const { data: statusHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["oc-status-history", selectedOcId],
    queryFn: async () => (await api.get(`/ocs/${selectedOcId}/status-history`)).data,
    enabled: selectedOcId !== null && isTimelineOpen
  });

  const handleOpenTimeline = (ocId: number) => {
    setSelectedOcId(ocId);
    setIsTimelineOpen(true);
  };

  const handleCloseTimeline = () => {
    setIsTimelineOpen(false);
    setTimeout(() => setSelectedOcId(null), 300);
  };

  const selectedOc = ocs?.find((oc: any) => oc.id === selectedOcId);

  // Función de búsqueda y filtrado
  const filteredOcs = useMemo(() => {
    if (!ocs) return [];
    
    let result = [...ocs];
    
    // Filtro por año (usando fechaRegistro)
    if (filters.year) {
      const year = parseInt(filters.year);
      result = result.filter((oc: any) => {
        const ocYear = new Date(oc.fechaRegistro).getFullYear();
        return ocYear === year;
      });
    }
    
    // Búsqueda global por texto libre
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((oc: any) => {
        // Buscar en múltiples campos
        if (oc.numeroOc?.toLowerCase().includes(searchLower)) return true;
        // Buscar en proveedor (nuevo y legacy)
        if (oc.proveedorRef?.razonSocial?.toLowerCase().includes(searchLower)) return true;
        if (oc.proveedorRef?.ruc?.includes(searchLower)) return true;
        if (oc.proveedor?.toLowerCase().includes(searchLower)) return true;
        if (oc.ruc?.includes(searchLower)) return true;
        if (oc.support?.name?.toLowerCase().includes(searchLower)) return true;
        if (oc.support?.code?.toLowerCase().includes(searchLower)) return true;
        if (oc.descripcion?.toLowerCase().includes(searchLower)) return true;
        if (oc.comentario?.toLowerCase().includes(searchLower)) return true;
        
        // Buscar en CECOs
        if (oc.costCenters && oc.costCenters.length > 0) {
          const cecoMatch = oc.costCenters.some((cc: any) => 
            cc.costCenter?.code?.toLowerCase().includes(searchLower) ||
            cc.costCenter?.name?.toLowerCase().includes(searchLower)
          );
          if (cecoMatch) return true;
        }
        
        return false;
      });
    }
    
    // Filtros específicos
    if (filters.moneda) {
      result = result.filter((oc: any) => oc.moneda === filters.moneda);
    }
    
    if (filters.estado) {
      result = result.filter((oc: any) => oc.estado === filters.estado);
    }
    
    return result;
  }, [ocs, filters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁLCULO DE ESTADÍSTICAS (frontend)
  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIO: Se eliminó "Importe total" porque no tiene sentido sumar importes de
  // distintas monedas. En su lugar, se agregó "Solicitante top" para complementar
  // la métrica de "Proveedor top".
  // 
  // ESTRUCTURA DE TARJETAS TOP: Se reorganizó para mostrar el NOMBRE como valor
  // principal (grande) y la CANTIDAD de OCs como subtítulo (pequeño), facilitando
  // la identificación rápida de proveedores/solicitantes destacados.
  
  const statistics = useMemo(() => {
    if (!filteredOcs || filteredOcs.length === 0) {
      return {
        totalOcs: 0,
        promedioMensual: 0,
        proveedorTop: null,
        solicitanteTop: null
      };
    }
    
    // 1. Total de OCs
    const totalOcs = filteredOcs.length;
    
    // 2. Promedio mensual (dividido por meses transcurridos del año)
    // Razón: Calcular promedio basado en meses que han pasado, no en todo el año
    const currentDate = new Date();
    const currentYear = parseInt(filters.year);
    const isCurrentYear = currentYear === currentDate.getFullYear();
    const monthsElapsed = isCurrentYear ? currentDate.getMonth() + 1 : 12;
    const promedioMensual = monthsElapsed > 0 ? Math.round((totalOcs / monthsElapsed) * 10) / 10 : 0;
    
    // 3. Proveedor con más OCs
    const proveedorCounts: Record<string, number> = {};
    filteredOcs.forEach((oc: any) => {
      const proveedor = oc.proveedorRef?.razonSocial || oc.proveedor || "Sin proveedor";
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
    
    // 4. Solicitante con más OCs (NUEVO)
    const solicitanteCounts: Record<string, number> = {};
    filteredOcs.forEach((oc: any) => {
      const solicitante = oc.nombreSolicitante || "Sin solicitante";
      solicitanteCounts[solicitante] = (solicitanteCounts[solicitante] || 0) + 1;
    });
    
    let solicitanteTop = null;
    let maxSolicitanteCount = 0;
    for (const [solicitante, count] of Object.entries(solicitanteCounts)) {
      if (count > maxSolicitanteCount) {
        maxSolicitanteCount = count;
        solicitanteTop = { nombre: solicitante, cantidad: count };
      }
    }
    
    return {
      totalOcs,
      promedioMensual,
      proveedorTop,
      solicitanteTop
    };
  }, [filteredOcs]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.moneda) params.set("moneda", filters.moneda);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.search) params.set("search", filters.search);
    window.open(`http://localhost:3001/ocs/export/csv?${params.toString()}`, "_blank");
  };

  // Generar opciones de años (últimos 5 años + año actual + próximo año)
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
      {/* ═══════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            Listado de Órdenes de Compra
          </h1>
          <p className="text-sm text-brand-text-secondary mt-1">
            Vista de consulta con tarjetas y estadísticas
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILTROS
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-brand-text-primary">Filtros de Búsqueda</h2>
        </CardHeader>
        <CardContent>
          {/* Filtros alineados siguiendo el patrón de otros módulos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Filtro de Año - más estrecho */}
            <FilterSelect
              label="Año"
              placeholder="Año"
              value={filters.year}
              onChange={(value) => setFilters(f => ({ ...f, year: value }))}
              options={yearOptions}
              searchable={false}
            />
            
            {/* Búsqueda global - más ancho */}
            <div className="md:col-span-2">
              <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                Buscar
              </label>
              <Input
                placeholder="OC, proveedor, sustento, CECOs..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            
            {/* Filtro de Moneda */}
            <FilterSelect
              label="Moneda"
              placeholder="Todas"
              value={filters.moneda}
              onChange={(value) => setFilters(f => ({ ...f, moneda: value }))}
              options={[
                { value: "PEN", label: "PEN" },
                { value: "USD", label: "USD" }
              ]}
              searchable={false}
            />
            
            {/* Filtro de Estado */}
            <FilterSelect
              label="Estado"
              placeholder="Todos"
              value={filters.estado}
              onChange={(value) => setFilters(f => ({ ...f, estado: value }))}
              options={ESTADOS_OC.map(estado => ({
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

      {/* ═══════════════════════════════════════════════════════════════
          ESTADÍSTICAS
          ═══════════════════════════════════════════════════════════════ */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Total de OCs - Ahora resaltada en azul */}
          <StatCard
            title="Total de OCs"
            value={statistics.totalOcs}
            icon={Package}
            subtitle={`Año ${filters.year}`}
            highlighted
          />
          
          <StatCard
            title="Promedio Mensual"
            value={statistics.promedioMensual}
            icon={TrendingUp}
            subtitle="OCs por mes"
          />
          
          {/* Proveedor Top - Estructura reorganizada: nombre como valor, cantidad como subtítulo */}
          <StatCard
            title="Proveedor Top"
            value={statistics.proveedorTop ? statistics.proveedorTop.nombre : "N/A"}
            icon={Users}
            subtitle={statistics.proveedorTop ? `${statistics.proveedorTop.cantidad} OCs en el año` : "Sin datos"}
          />
          
          {/* Solicitante Top - NUEVO: Reemplaza "Importe total" */}
          <StatCard
            title="Solicitante Top"
            value={statistics.solicitanteTop ? statistics.solicitanteTop.nombre : "N/A"}
            icon={Users}
            subtitle={statistics.solicitanteTop ? `${statistics.solicitanteTop.cantidad} OCs en el año` : "Sin datos"}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          GRID DE TARJETAS DE OCs
          ═══════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-brand-text-secondary">
              Cargando órdenes de compra...
            </div>
          </CardContent>
        </Card>
      ) : filteredOcs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package size={48} className="mx-auto mb-4 text-brand-text-disabled" />
              <p className="text-brand-text-secondary">
                {filters.search || filters.moneda || filters.estado
                  ? "No se encontraron órdenes que coincidan con los filtros"
                  : "No hay órdenes de compra registradas"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-text-secondary">
              Mostrando <span className="font-semibold">{filteredOcs.length}</span> órdenes de compra
            </p>
          </div>
          
          {/* Grid responsive: 1 columna en mobile, 2 en tablet, 3 en desktop, 4 en pantallas grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOcs.map((oc: any) => (
              <OcCard key={oc.id} oc={oc} onOpenTimeline={handleOpenTimeline} />
            ))}
          </div>
        </>
      )}

      {/* Modal de Timeline de Estados */}
      <Modal
        isOpen={isTimelineOpen}
        onClose={handleCloseTimeline}
        title={selectedOc ? `Estado: ${selectedOc.numeroOc || 'Sin número'}` : 'Estado de OC'}
        size="md"
      >
        {isLoadingHistory ? (
          <div className="p-8 text-center text-brand-text-secondary">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            <p className="mt-4">Cargando historial...</p>
          </div>
        ) : statusHistory && selectedOc ? (
          <OcStatusTimeline 
            history={statusHistory} 
            currentStatus={selectedOc.estado}
          />
        ) : (
          <div className="p-8 text-center text-brand-text-secondary">
            No se pudo cargar el historial
          </div>
        )}
      </Modal>
    </div>
  );
}
