import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import Input from "../components/ui/Input";
import FilterSelect, { FilterOption } from "../components/ui/FilterSelect";
import MultiSelectFilter from "../components/ui/MultiSelectFilter";
import YearMonthPicker from "../components/YearMonthPicker";
import { formatNumberAbbreviated } from "../utils/numberFormat";
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { 
  Wallet, 
  TrendingUp, 
  Activity, 
  CheckCircle2,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingDown,
  Percent,
  PieChart,
  Building2,
  Users
} from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 DASHBOARD FINANCIERO PROFESIONAL - ANCHO COMPLETO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ARQUITECTURA DE LAYOUT:
 * - Layout de ANCHO COMPLETO: w-full (100% del espacio entre sidebar y borde)
 * - SIN restricciones max-w-* que limiten el ancho
 * - SIN condicionales que afecten el ancho/padding del contenedor principal
 * - Mismo layout desde la primera carga en TODOS los estados (Ejecución/Contable/Filtros/Q)
 * - Grids estáticos: 4 columnas (KPIs), 3 columnas (métricas), sin variación según modo
 * - Padding manejado por container-page (responsivo: 16px → 40px según viewport)
 * - Espaciado vertical consistente con space-y-4 en todos los estados
 * 
 * JERARQUÍA DE CONTENEDORES:
 * main.flex-1.w-full.bg-brand-background (layout principal con fondo)
 *   └── div.container-page (padding responsivo)
 *       └── div.w-full.space-y-4 (Dashboard - ancho completo)
 * 
 * FUNCIONALIDAD:
 * - Toggle entre vista "Ejecución" y "Contable"
 * - Filtros completos: Año, Sustento, CECO, Gerencia, Área, Paquete de Gasto
 * - Selector de trimestres (Q1, Q2, Q3, Q4) con rango de meses
 * - KPIs dinámicos según modo (contenido varía, layout NO)
 * - Gráfico adaptativo con series según modo (contenido varía, layout NO)
 * - Diseño 100% responsivo aprovechando todo el espacio disponible
 * 
 * ENDPOINT: GET /reports/dashboard
 * PARAMS: year, mode, supportId, costCenterId, managementId, areaId, packageId
 */

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type DashboardMode = "execution" | "contable";

interface SeriesData {
  periodId: number;
  label: string;
  budget: number;
  executed: number;
  provisions: number;
  available: number;
  resultadoContable: number;
}

interface DashboardData {
  year: number;
  versionId: number | null;
  mode: DashboardMode;
  budgetType?: 'PPTO' | 'RPPTO'; // Tipo de presupuesto activo desde backend
  filters: {
    supportId: number | null;
    costCenterId: number | null;
    managementId: number | null;
    areaId: number | null;
    packageId: number | null;
    periodFromId: number | null;
    periodToId: number | null;
  };
  series: SeriesData[];
  totals: {
    budget: number;
    executed: number;
    provisions: number;
    available: number;
    resultadoContable: number;
  };
}

interface DetailRow {
  supportId: number;
  supportCode: string;
  supportName: string;
  managementName: string;
  areaName: string;
  budget: number;
  executed: number;
  provisions: number;
  diferencia: number;
}

interface DashboardDetailData {
  year: number;
  versionId: number | null;
  mode: DashboardMode;
  budgetType?: 'PPTO' | 'RPPTO'; // Tipo de presupuesto activo desde backend
  rows: DetailRow[];
  totals: {
    budget: number;
    executed: number;
    provisions: number;
    diferencia: number;
  };
}

interface Period {
  id: number;
  year: number;
  month: number;
  label?: string;
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Obtiene las etiquetas dinámicas según el tipo de presupuesto
 */
function getBudgetLabels(budgetType: 'PPTO' | 'RPPTO' | undefined, year: number) {
  const isPPTO = !budgetType || budgetType === 'PPTO';
  
  return {
    // Etiqueta corta para KPIs y gráficos
    shortLabel: isPPTO ? 'PPTO' : 'RPPTO',
    
    // Etiqueta descriptiva para títulos
    fullLabel: isPPTO ? `Presupuesto total ${year}` : `Presupuesto revisado ${year}`,
    
    // Etiqueta para disponible/resultado
    availableLabel: isPPTO ? 'PPTO – Ejecutado Real' : 'RPPTO – Ejecutado Real',
    
    // Etiqueta para columna en tabla
    columnLabel: isPPTO ? `PPTO ${year}` : `RPPTO ${year}`,
    
    // Etiqueta para detalle
    detailLabel: isPPTO ? `Detalle PPTO ${year}` : `Detalle RPPTO ${year}`,
    
    // Indicador visual
    typeIndicator: isPPTO 
      ? { text: 'Presupuesto Original', color: 'text-blue-600' }
      : { text: 'Presupuesto Revisado', color: 'text-purple-600' }
  };
}

// ══════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════

/**
 * Tarjeta KPI mejorada con diseño SaaS profesional
 */
function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  highlighted = false,
  description
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  highlighted?: boolean;
  description?: string;
}) {
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
          {description && (
            <p className="text-[10px] sm:text-xs text-brand-text-disabled">{description}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${highlighted ? 'bg-brand-primary/10' : 'bg-brand-background'}`}>
          <Icon 
            size={18} 
            className={`${highlighted ? 'text-brand-primary' : 'text-brand-text-secondary'}`} 
            strokeWidth={2}
          />
        </div>
      </div>
      <div className="text-[22px] xl:text-[24px] 2xl:text-[26px] font-bold text-brand-text-primary leading-none">
        S/ {formatNumberAbbreviated(value)}
      </div>
    </div>
  );
}

/**
 * Toggle de modo Ejecución / Contable
 */
function ModeToggle({ 
  mode, 
  onChange 
}: { 
  mode: DashboardMode; 
  onChange: (mode: DashboardMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-brand-border bg-white p-1">
      <button
        onClick={() => onChange("execution")}
        className={`
          px-4 py-1.5 text-[11px] font-medium rounded-md transition-all
          ${mode === "execution" 
            ? 'bg-brand-primary text-white shadow-sm' 
            : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-background'
          }
        `}
      >
        Ejecución
      </button>
      <button
        onClick={() => onChange("contable")}
        className={`
          px-4 py-1.5 text-[11px] font-medium rounded-md transition-all
          ${mode === "contable" 
            ? 'bg-brand-primary text-white shadow-sm' 
            : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-background'
          }
        `}
      >
        Contable
      </button>
    </div>
  );
}

/**
 * Selector de Trimestres (Q1, Q2, Q3, Q4)
 */
function QuarterSelector({
  year,
  onYearChange,
  selectedQuarter,
  onQuarterSelect,
}: {
  year: number;
  onYearChange: (year: number) => void;
  selectedQuarter: number | null;
  onQuarterSelect: (quarter: number) => void;
}) {
  const quarters = [
    { q: 1, label: "Q1", months: "Ene - Mar", range: { from: 1, to: 3 } },
    { q: 2, label: "Q2", months: "Abr - Jun", range: { from: 4, to: 6 } },
    { q: 3, label: "Q3", months: "Jul - Sep", range: { from: 7, to: 9 } },
    { q: 4, label: "Q4", months: "Oct - Dic", range: { from: 10, to: 12 } },
  ];

  return (
    <div className="w-full bg-white border border-brand-border rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-text-secondary" />
          <h3 className="text-sm xl:text-[15px] font-semibold text-brand-text-secondary uppercase tracking-wide">
            Periodo de Análisis
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onYearChange(year - 1)}
            className="p-1.5 rounded-lg hover:bg-brand-background text-brand-text-secondary transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-[13px] font-bold text-brand-text-primary min-w-[60px] text-center">
            {year}
          </div>
          <button
            onClick={() => onYearChange(year + 1)}
            className="p-1.5 rounded-lg hover:bg-brand-background text-brand-text-secondary transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {quarters.map((quarter) => (
          <button
            key={quarter.q}
            onClick={() => onQuarterSelect(quarter.q)}
            className={`
              p-2.5 rounded-lg border-2 transition-all duration-200
              ${selectedQuarter === quarter.q
                ? 'border-brand-primary bg-brand-primary/5'
                : 'border-brand-border bg-white hover:border-brand-primary/30 hover:bg-brand-background'
              }
            `}
          >
            <div className={`text-base font-bold mb-0.5 ${
              selectedQuarter === quarter.q ? 'text-brand-primary' : 'text-brand-text-primary'
            }`}>
              {quarter.label}
            </div>
            <div className="text-[10px] sm:text-xs text-brand-text-secondary">
              {quarter.months}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-2 text-xs sm:text-sm text-brand-text-disabled text-center">
        Selecciona un trimestre para filtrar automáticamente las fechas
      </div>
    </div>
  );
}

/**
 * Hook personalizado para debounce del resize del contenedor
 * Previene re-renders del gráfico durante la transición del sidebar
 */
function useDebouncedContainerSize(delay: number = 350) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const isFirstResize = useRef(true);
  const observerRef = useRef<ResizeObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Callback ref que se llama cuando el elemento se monta
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Establecer tamaño inicial inmediatamente cuando el nodo se monta
      setSize({
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
      setElement(node);
    }
  }, []);

  // Configurar ResizeObserver
  useEffect(() => {
    if (!element) return;

    const updateSize = () => {
      if (element) {
        setSize({
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
      }
    };

    observerRef.current = new ResizeObserver(() => {
      // Primera notificación: ignorar (ya tenemos el tamaño inicial del callback ref)
      if (isFirstResize.current) {
        isFirstResize.current = false;
        return;
      }
      
      // Cambios posteriores: con debounce para evitar lag en transiciones
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(updateSize, delay);
    });

    observerRef.current.observe(element);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // Resetear flag para próximo mount
      isFirstResize.current = true;
    };
  }, [element, delay]);

  return { ref, size };
}

/**
 * Tooltip personalizado para el gráfico
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-white border border-brand-border rounded-lg shadow-medium p-3 min-w-[180px]">
      <div className="text-xs font-semibold text-brand-text-primary mb-2 border-b border-brand-border-light pb-1">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10px] sm:text-xs text-brand-text-secondary">
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-semibold text-brand-text-primary">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * DASHBOARD FINANCIERO - Componente Principal
 */
export default function Dashboard() {
  // ══════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [mode, setMode] = useState<DashboardMode>("execution");
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros (ahora multi-select)
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [costCenterIds, setCostCenterIds] = useState<string[]>([]);
  const [managementIds, setManagementIds] = useState<string[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [packageIds, setPackageIds] = useState<string[]>([]);
  const [periodFromId, setPeriodFromId] = useState<number | null>(null);
  const [periodToId, setPeriodToId] = useState<number | null>(null);
  
  // Ref para rastrear si estamos en un cambio programático (trimestre) o manual (usuario)
  const isProgrammaticChangeRef = useRef(false);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);

  // Hook para debounce del resize del gráfico
  const { ref: chartContainerRef, size: chartSize } = useDebouncedContainerSize(350);

  // ══════════════════════════════════════════════════════════════
  // QUERIES - Catálogos
  // ══════════════════════════════════════════════════════════════
  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: ["periods"],
    queryFn: async () => (await api.get("/periods")).data,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 10,
  });

  const { data: supports = [] } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 10,
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 10,
  });

  const { data: managements = [] } = useQuery({
    queryKey: ["managements"],
    queryFn: async () => (await api.get("/managements")).data,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 10,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/areas")).data,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 10,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["expense-packages"],
    queryFn: async () => (await api.get("/expense-packages")).data,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 10,
  });

  // Áreas filtradas por gerencia(s) seleccionada(s)
  const filteredAreas = useMemo(() => {
    if (managementIds.length === 0) return areas;
    return areas.filter((a: any) => managementIds.includes(String(a.managementId)));
  }, [areas, managementIds]);

  // Períodos del año seleccionado
  const yearPeriods = useMemo(() => {
    if (!periods) return [];
    return periods
      .filter((p: Period) => p.year === year)
      .sort((a: Period, b: Period) => a.month - b.month);
  }, [periods, year]);

  // ══════════════════════════════════════════════════════════════
  // QUERY - Dashboard Data
  // ══════════════════════════════════════════════════════════════
  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard", year, mode, supportIds, costCenterIds, managementIds, areaIds, packageIds, periodFromId, periodToId],
    queryFn: async () => {
      const params: any = { year, mode };
      if (supportIds.length > 0) params.supportIds = supportIds.join(',');
      if (costCenterIds.length > 0) params.costCenterIds = costCenterIds.join(',');
      if (managementIds.length > 0) params.managementIds = managementIds.join(',');
      if (areaIds.length > 0) params.areaIds = areaIds.join(',');
      if (packageIds.length > 0) params.packageIds = packageIds.join(',');
      if (periodFromId) params.periodFromId = periodFromId;
      if (periodToId) params.periodToId = periodToId;
      
      return (await api.get("/reports/dashboard", { params })).data;
    },
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5,
  });

  // ══════════════════════════════════════════════════════════════
  // QUERY - Dashboard Detail Data
  // ══════════════════════════════════════════════════════════════
  const { data: detailData } = useQuery<DashboardDetailData>({
    queryKey: ["dashboard-detail", year, mode, supportIds, costCenterIds, managementIds, areaIds, packageIds, periodFromId, periodToId],
    queryFn: async () => {
      const params: any = { year, mode };
      if (supportIds.length > 0) params.supportIds = supportIds.join(',');
      if (costCenterIds.length > 0) params.costCenterIds = costCenterIds.join(',');
      if (managementIds.length > 0) params.managementIds = managementIds.join(',');
      if (areaIds.length > 0) params.areaIds = areaIds.join(',');
      if (packageIds.length > 0) params.packageIds = packageIds.join(',');
      if (periodFromId) params.periodFromId = periodFromId;
      if (periodToId) params.periodToId = periodToId;
      
      return (await api.get("/reports/dashboard/detail", { params })).data;
    },
    enabled: !!data, // Solo cargar detalles si ya tenemos datos principales
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5,
  });

  // ══════════════════════════════════════════════════════════════
  // COMPUTED
  // ══════════════════════════════════════════════════════════════
  // Años disponibles (basado en períodos existentes)
  const availableYears = useMemo(() => {
    if (!periods || periods.length === 0) {
      const currentYear = new Date().getFullYear();
      return [currentYear - 1, currentYear, currentYear + 1];
    }
    const years = [...new Set(periods.map((p: Period) => p.year))];
    return years.sort((a, b) => b - a); // Descendente: más reciente primero
  }, [periods]);
  
  const hasActiveFilters = useMemo(() => {
    return supportIds.length > 0 || costCenterIds.length > 0 || managementIds.length > 0 || 
           areaIds.length > 0 || packageIds.length > 0 || periodFromId !== null || periodToId !== null;
  }, [supportIds, costCenterIds, managementIds, areaIds, packageIds, periodFromId, periodToId]);

  const clearFilters = () => {
    setSupportIds([]);
    setCostCenterIds([]);
    setManagementIds([]);
    setAreaIds([]);
    setPackageIds([]);
    setPeriodFromId(null);
    setPeriodToId(null);
    setSelectedQuarter(null);
  };

  // Función para seleccionar/deseleccionar trimestre (toggle real)
  const handleQuarterSelect = (quarter: number) => {
    // Marcar que este es un cambio programático
    isProgrammaticChangeRef.current = true;
    
    // Si se hace clic en el trimestre ya seleccionado, deseleccionarlo
    if (selectedQuarter === quarter) {
      setSelectedQuarter(null);
      setPeriodFromId(null);
      setPeriodToId(null);
      isProgrammaticChangeRef.current = false;
      return;
    }
    
    // Si se selecciona un nuevo trimestre
    setSelectedQuarter(quarter);
    const quarterRanges = [
      { from: 1, to: 3 },   // Q1
      { from: 4, to: 6 },   // Q2
      { from: 7, to: 9 },   // Q3
      { from: 10, to: 12 }, // Q4
    ];
    const range = quarterRanges[quarter - 1];
    
    // Buscar IDs de períodos correspondientes
    const fromPeriod = yearPeriods.find((p: Period) => p.month === range.from);
    const toPeriod = yearPeriods.find((p: Period) => p.month === range.to);
    
    if (fromPeriod && toPeriod) {
      setPeriodFromId(fromPeriod.id);
      setPeriodToId(toPeriod.id);
    }
    
    // Resetear la bandera después del cambio
    isProgrammaticChangeRef.current = false;
  };

  // Calcular métricas adicionales
  const additionalMetrics = useMemo(() => {
    if (!data) return null;
    
    const executionRate = data.totals.budget > 0 
      ? (data.totals.executed / data.totals.budget) * 100 
      : 0;
    
    const provisionsRate = data.totals.budget > 0 
      ? (data.totals.provisions / data.totals.budget) * 100 
      : 0;
    
    const availableRate = data.totals.budget > 0 
      ? (data.totals.available / data.totals.budget) * 100 
      : 0;

    // Top 3 meses con mayor ejecución
    const topMonths = [...data.series]
      .sort((a, b) => b.executed - a.executed)
      .slice(0, 3)
      .map(m => ({ label: m.label, executed: m.executed }));

    return {
      executionRate,
      provisionsRate,
      availableRate,
      topMonths
    };
  }, [data]);

  // Agrupar datos por gerencia con subtotales
  const groupedDetailData = useMemo(() => {
    if (!detailData || !detailData.rows) return [];

    // Agrupar por gerencia
    const groups = new Map<string, DetailRow[]>();
    
    detailData.rows.forEach(row => {
      const managementName = row.managementName || 'Sin Gerencia';
      if (!groups.has(managementName)) {
        groups.set(managementName, []);
      }
      groups.get(managementName)!.push(row);
    });

    // Crear estructura con subtotales
    const result: Array<{
      managementName: string;
      rows: DetailRow[];
      subtotal: {
        budget: number;
        executed: number;
        provisions: number;
        diferencia: number;
      };
    }> = [];

    groups.forEach((rows, managementName) => {
      const subtotal = rows.reduce((acc, row) => ({
        budget: acc.budget + row.budget,
        executed: acc.executed + row.executed,
        provisions: acc.provisions + row.provisions,
        diferencia: acc.diferencia + row.diferencia
      }), { budget: 0, executed: 0, provisions: 0, diferencia: 0 });

      result.push({
        managementName,
        rows,
        subtotal
      });
    });

    return result;
  }, [detailData]);

  // ══════════════════════════════════════════════════════════════
  // RENDER - Layout FIJO: ancho completo entre sidebar y borde
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="w-full space-y-4">
        
        {/* ══════════════════════════════════════════════════════════════
            HEADER
            ══════════════════════════════════════════════════════════════ */}
        <div>
          {/* Título, descripción y controles en una sola fila para desktop */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-text-primary">
                  Dashboard
                </h1>
                {data && data.budgetType && (
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                    data.budgetType === 'RPPTO' 
                      ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                  }`}>
                    {data.budgetType === 'RPPTO' ? '📊 RPPTO (Revisado)' : '📋 PPTO (Original)'}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-text-secondary mt-1">
                Vista de presupuesto y ejecución{data && data.budgetType ? ` - Mostrando ${data.budgetType === 'RPPTO' ? 'presupuesto revisado' : 'presupuesto original'}` : ''}
              </p>
            </div>
            
            {/* Controles principales */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Toggle Modo */}
            <ModeToggle mode={mode} onChange={setMode} />

            {/* Botón Filtros Avanzados */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-medium transition-all
                ${hasActiveFilters 
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' 
                  : 'border-brand-border bg-white text-brand-text-secondary hover:bg-brand-background'
                }
              `}
            >
              <Filter size={14} />
              Filtros Avanzados
              {hasActiveFilters && (
                <span className="bg-brand-primary text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                  {supportIds.length + costCenterIds.length + managementIds.length + areaIds.length + packageIds.length}
                </span>
              )}
            </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              PANEL DE FILTROS (Colapsable)
              ══════════════════════════════════════════════════════════════ */}
          {showFilters && (
            <div className="bg-white border border-brand-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-brand-text-primary uppercase tracking-wide">
                  Filtros Avanzados
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-brand-action hover:text-brand-hover font-medium">
                    Limpiar filtros
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Sustento */}
                <MultiSelectFilter
                  label="Sustento"
                  placeholder="Todos"
                  values={supportIds}
                  onChange={setSupportIds}
                  options={supports.map((s: any) => ({
                    value: String(s.id),
                    label: `${s.code} - ${s.name}`,
                    searchText: `${s.code} ${s.name}`
                  }))}
                />

                {/* CECO */}
                <MultiSelectFilter
                  label="Centro de Costo"
                  placeholder="Todos"
                  values={costCenterIds}
                  onChange={setCostCenterIds}
                  options={costCenters.map((c: any) => ({
                    value: String(c.id),
                    label: `${c.code} - ${c.name || ''}`,
                    searchText: `${c.code} ${c.name || ''}`
                  }))}
                />

                {/* Gerencia */}
                <MultiSelectFilter
                  label="Gerencia"
                  placeholder="Todas"
                  values={managementIds}
                  onChange={(values) => {
                    setManagementIds(values);
                    // Limpiar áreas que no pertenecen a las gerencias seleccionadas
                    if (values.length > 0 && areaIds.length > 0) {
                      const validAreaIds = areas
                        .filter((a: any) => values.includes(String(a.managementId)))
                        .map((a: any) => String(a.id));
                      setAreaIds(areaIds.filter(id => validAreaIds.includes(id)));
                    }
                  }}
                  options={managements.map((m: any) => ({
                    value: String(m.id),
                    label: m.name
                  }))}
                />

                {/* Área */}
                <MultiSelectFilter
                  label="Área"
                  placeholder="Todas"
                  values={areaIds}
                  onChange={setAreaIds}
                  disabled={managementIds.length === 0}
                  options={filteredAreas.map((a: any) => ({
                    value: String(a.id),
                    label: a.name
                  }))}
                />

                {/* Paquete de Gasto */}
                <MultiSelectFilter
                  label="Paquete de Gasto"
                  placeholder="Todos"
                  values={packageIds}
                  onChange={setPackageIds}
                  options={packages.map((p: any) => ({
                    value: String(p.id),
                    label: p.name
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SELECTOR DE TRIMESTRES + MESES DESDE/HASTA
            ══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Selector de Trimestres */}
          <QuarterSelector
            year={year}
            onYearChange={setYear}
            selectedQuarter={selectedQuarter}
            onQuarterSelect={handleQuarterSelect}
          />
          
          {/* Selectores de Mes Desde/Hasta */}
          <div className="w-full bg-white border border-brand-border rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mes Desde */}
              <div>
                <label className="block text-xs sm:text-sm text-brand-text-secondary font-medium mb-2">
                  Mes Desde
                </label>
                <YearMonthPicker
                  value={periodFromId}
                  onChange={(period) => {
                    const newFromId = period?.id || null;
                    setPeriodFromId(newFromId);
                    
                    // Lógica: Si es cambio manual Y periodToId está vacío → copiar Desde a Hasta
                    if (!isProgrammaticChangeRef.current && newFromId !== null && periodToId === null) {
                      setPeriodToId(newFromId);
                    }
                  }}
                  periods={periods}
                  maxId={periodToId || undefined}
                  placeholder="Todos los meses"
                  clearable={true}
                />
              </div>
              
              {/* Mes Hasta */}
              <div>
                <label className="block text-xs sm:text-sm text-brand-text-secondary font-medium mb-2">
                  Mes Hasta
                </label>
                <YearMonthPicker
                  value={periodToId}
                  onChange={(period) => {
                    setPeriodToId(period?.id || null);
                    // Si el usuario modifica manualmente, no deseleccionar el Q automáticamente
                  }}
                  periods={periods}
                  minId={periodFromId || undefined}
                  placeholder="Todos los meses"
                  clearable={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CONTENIDO PRINCIPAL
            ══════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <div className="bg-white border border-brand-border rounded-xl p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-brand-text-secondary">Cargando datos del dashboard...</span>
            </div>
          </div>
        ) : isError || !data ? (
          <div className="bg-white border border-status-error rounded-xl p-8 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-status-error mx-auto mb-3" />
              <span className="text-sm text-status-error font-medium">Error al cargar los datos del dashboard</span>
              <p className="text-xs text-brand-text-secondary mt-2">Por favor, intente nuevamente</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN 1: TARJETAS DE KPIs (INDICADORES PRINCIPALES)
                ══════════════════════════════════════════════════════════════ */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                title={getBudgetLabels(data.budgetType, year).shortLabel}
                value={data.totals.budget}
                icon={Wallet}
                description={getBudgetLabels(data.budgetType, year).fullLabel}
              />
              <KpiCard
                title="Ejecutado"
                value={data.totals.executed}
                icon={TrendingUp}
                description={mode === "execution" ? "Ejecución real operativa" : "Ejecutado contable"}
              />
              
              {/* Provisiones YTD - SOLO en modo Contable */}
              {mode === "contable" && (
                <KpiCard
                  title="Provisiones"
                  value={data.totals.provisions}
                  icon={Activity}
                  description="Provisiones acumuladas"
                />
              )}
              
              {/* KPI destacado según modo */}
              {mode === "execution" ? (
                <KpiCard
                  title="Disponible"
                  value={data.totals.available}
                  icon={CheckCircle2}
                  highlighted={true}
                  description={getBudgetLabels(data.budgetType, year).availableLabel}
                />
              ) : (
                <KpiCard
                  title="Resultado Contable"
                  value={data.totals.resultadoContable}
                  icon={CheckCircle2}
                  highlighted={true}
                  description="Ejecutado + Provisiones"
                />
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN 2: GRÁFICO PRINCIPAL + CARD LATERAL
                ══════════════════════════════════════════════════════════════ */}
            <div className="w-full grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
              {/* GRÁFICO DE EVOLUCIÓN MENSUAL (2/3) */}
              <div className="bg-white border border-brand-border rounded-xl p-4 xl:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] lg:text-[15px] font-semibold text-brand-text-primary uppercase tracking-wide">
                      Evolución Mensual {year}
                    </h3>
                    <p className="text-xs text-brand-text-secondary mt-0.5">
                      {mode === "execution" ? "Vista de Ejecución" : "Vista Contable"}
                    </p>
                  </div>
                </div>
                
                <div className="h-[320px] w-full" ref={chartContainerRef}>
                  {chartSize.width > 0 && chartSize.height > 0 && (
                    <ComposedChart 
                      width={chartSize.width}
                      height={chartSize.height}
                      data={data.series}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#B1BDC8" 
                        strokeOpacity={0.2}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 9, fill: '#8A96A2' }}
                        stroke="#B1BDC8"
                        tickLine={false}
                        axisLine={{ stroke: '#B1BDC8' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fill: '#8A96A2' }}
                        stroke="#B1BDC8"
                        tickLine={false}
                        axisLine={{ stroke: '#B1BDC8' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ 
                          fontSize: '9px',
                          paddingTop: '12px'
                        }}
                        iconType="circle"
                        iconSize={6}
                      />
                      
                      {/* Barras */}
                      <Bar 
                        dataKey="budget" 
                        name={getBudgetLabels(data.budgetType, year).shortLabel}
                        fill="#8A96A2" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      <Bar 
                        dataKey="executed" 
                        name="Ejecutado" 
                        fill="#71B3FF" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      
                      {/* Provisiones - SOLO en modo Contable */}
                      {mode === "contable" && (
                        <Bar 
                          dataKey="provisions" 
                          name="Provisiones" 
                          fill="#FF429B" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                      
                      {/* Línea de disponible/resultado */}
                      {mode === "execution" ? (
                        <Line 
                          type="monotone" 
                          dataKey="available" 
                          name="Disponible" 
                          stroke="#31D785"
                          strokeWidth={2.5}
                          dot={{ fill: '#31D785', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      ) : (
                        <Line 
                          type="monotone" 
                          dataKey="resultadoContable" 
                          name="Resultado Contable" 
                          stroke="#31D785"
                          strokeWidth={2.5}
                          dot={{ fill: '#31D785', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      )}
                    </ComposedChart>
                  )}
                </div>
              </div>

              {/* CARD LATERAL: TOP 3 MESES (1/3) */}
              <div className="bg-white border border-brand-border rounded-xl p-4 xl:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-brand-primary" />
                  <h3 className="text-[13px] lg:text-[14px] font-semibold text-brand-text-primary uppercase tracking-wide">
                    Top 3 Meses
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-brand-text-secondary mb-4">
                  Meses con mayor ejecución
                </p>

                <div className="space-y-3">
                  {additionalMetrics?.topMonths.map((month, idx) => {
                    const formatCurrency = (val: number) => {
                      return new Intl.NumberFormat("es-PE", {
                        style: "currency",
                        currency: "PEN",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(val);
                    };

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-brand-background rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`
                            flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold
                            ${idx === 0 ? 'bg-brand-primary text-white' : 
                              idx === 1 ? 'bg-brand-primary/70 text-white' : 
                              'bg-brand-primary/40 text-white'}
                          `}>
                            {idx + 1}
                          </div>
                          <span className="text-[13px] font-medium text-brand-text-primary">
                            {month.label}
                          </span>
                        </div>
                        <span className="text-[12px] xl:text-[13px] font-semibold text-brand-text-secondary">
                          {formatCurrency(month.executed)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-brand-border-light">
                  <div className="text-xs text-brand-text-disabled text-center">
                    Basado en ejecución
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN 3: CARDS DE RATIOS Y MÉTRICAS ADICIONALES
                ══════════════════════════════════════════════════════════════ */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Ratio de Ejecución */}
              <div className="bg-white border border-brand-border rounded-xl p-4 xl:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Percent size={16} className="text-brand-primary" />
                    <h4 className="text-[11px] lg:text-[12px] font-semibold text-brand-text-secondary uppercase">
                      % Ejecución
                    </h4>
                  </div>
                </div>
                <div className="text-[26px] xl:text-[28px] font-bold text-brand-text-primary">
                  {additionalMetrics?.executionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Ejecutado / {getBudgetLabels(data.budgetType, year).shortLabel} Total
                </p>
                <div className="mt-3 bg-brand-background rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary transition-all duration-300"
                    style={{ width: `${Math.min(additionalMetrics?.executionRate || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Ratio de Provisiones */}
              {mode === "contable" && (
                <div className="bg-white border border-brand-border rounded-xl p-4 xl:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PieChart size={16} className="text-brand-action" />
                      <h4 className="text-[11px] lg:text-[12px] font-semibold text-brand-text-secondary uppercase">
                        % Provisiones
                      </h4>
                    </div>
                  </div>
                  <div className="text-[26px] xl:text-[28px] font-bold text-brand-text-primary">
                    {additionalMetrics?.provisionsRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    Provisiones / {getBudgetLabels(data.budgetType, year).shortLabel} Total
                  </p>
                  <div className="mt-3 bg-brand-background rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-brand-action transition-all duration-300"
                      style={{ width: `${Math.min(additionalMetrics?.provisionsRate || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Ratio de Disponible */}
              <div className="bg-white border border-brand-border rounded-xl p-4 xl:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-status-success" />
                    <h4 className="text-[11px] lg:text-[12px] font-semibold text-brand-text-secondary uppercase">
                      % Disponible
                    </h4>
                  </div>
                </div>
                <div className="text-[26px] xl:text-[28px] font-bold text-brand-text-primary">
                  {additionalMetrics?.availableRate.toFixed(1)}%
                </div>
                <p className="text-xs text-brand-text-secondary mt-1">
                  {mode === "execution" 
                    ? `Disponible / ${getBudgetLabels(data.budgetType, year).shortLabel} Total` 
                    : `Saldo / ${getBudgetLabels(data.budgetType, year).shortLabel} Total`}
                </p>
                <div className="mt-3 bg-brand-background rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-status-success transition-all duration-300"
                    style={{ width: `${Math.min(additionalMetrics?.availableRate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN 3.5: INDICADORES POR GERENCIA
                ══════════════════════════════════════════════════════════════ */}
            {groupedDetailData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Building2 size={18} className="text-brand-primary" />
                  <h3 className="text-[14px] lg:text-[15px] font-semibold text-brand-text-primary uppercase tracking-wide">
                    Comparativa por Gerencia
                  </h3>
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupedDetailData.map((group) => {
                    const executionRate = group.subtotal.budget > 0 
                      ? (group.subtotal.executed / group.subtotal.budget) * 100 
                      : 0;
                    
                    const isOverBudget = group.subtotal.diferencia < 0;
                    
                    return (
                      <div 
                        key={group.managementName}
                        className="bg-white border border-brand-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        {/* Header */}
                        <div className="flex items-start gap-2 mb-3">
                          <div className="p-2 bg-brand-background rounded-lg">
                            <Users size={16} className="text-brand-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-brand-text-primary truncate">
                              {group.managementName}
                            </h4>
                            <p className="text-xs text-brand-text-secondary">
                              {group.rows.length} {group.rows.length === 1 ? 'sustento' : 'sustentos'}
                            </p>
                          </div>
                        </div>

                        {/* Ejecución Progress */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-brand-text-secondary flex items-center gap-1">
                              <TrendingUp size={12} />
                              {mode === 'execution' ? 'Cierre' : 'Contabilizado'}
                            </span>
                            <span className="text-sm font-bold text-brand-text-primary">
                              {executionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                executionRate >= 90 ? 'bg-green-500' :
                                executionRate >= 70 ? 'bg-blue-500' :
                                executionRate >= 50 ? 'bg-yellow-500' :
                                'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(executionRate, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-brand-text-secondary mt-1">
                            {new Intl.NumberFormat("es-PE", {
                              style: "currency",
                              currency: "PEN",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(group.subtotal.executed)} de{' '}
                            {new Intl.NumberFormat("es-PE", {
                              style: "currency",
                              currency: "PEN",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(group.subtotal.budget)}
                          </p>
                        </div>

                        {/* Diferencia */}
                        <div className={`p-2 rounded-lg ${
                          isOverBudget ? 'bg-red-50' : 'bg-green-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-brand-text-secondary">
                              {isOverBudget ? 'Sobre presupuesto' : 'Disponible'}
                            </span>
                            <span className={`text-sm font-bold ${
                              isOverBudget ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {new Intl.NumberFormat("es-PE", {
                                style: "currency",
                                currency: "PEN",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(Math.abs(group.subtotal.diferencia))}
                              {isOverBudget && ' ⚠️'}
                            </span>
                          </div>
                          {!isOverBudget && (
                            <p className="text-xs text-green-700 mt-1">
                              {((Math.abs(group.subtotal.diferencia) / group.subtotal.budget) * 100).toFixed(1)}% del presupuesto
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN 4: TABLA DE DETALLES POR SUSTENTO
                ══════════════════════════════════════════════════════════════ */}
            {detailData && detailData.rows.length > 0 && (
              <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
                <div className="p-4 xl:p-5 border-b border-brand-border-light">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-brand-primary" />
                    <h3 className="text-[14px] lg:text-[15px] font-semibold text-brand-text-primary uppercase tracking-wide">
                      {getBudgetLabels(data.budgetType, year).detailLabel}
                    </h3>
                  </div>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    Desglose por sustento {mode === "execution" ? "(Vista de Ejecución)" : "(Vista Contable)"}
                  </p>
                </div>
                
                {/* Contenedor con scroll interno y footer sticky */}
                <div className="relative">
                  {/* Contenedor scrolleable con max-height */}
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[20%]" />
                        <col className="w-[30%]" />
                        <col className="w-[15%]" />
                        <col className="w-[15%]" />
                        {mode === "contable" && <col className="w-[15%]" />}
                        <col className="w-[20%]" />
                      </colgroup>
                      {/* Header sticky */}
                      <thead className="bg-brand-background sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="text-left text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                            Gerencia
                          </th>
                          <th className="text-left text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                            Sustento
                          </th>
                          <th className="text-right text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                            {getBudgetLabels(data.budgetType, year).columnLabel}
                          </th>
                          {mode === "execution" ? (
                            <>
                              <th className="text-right text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                                Gasto Real
                              </th>
                              <th className="text-right text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                                Diferencia
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="text-right text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                                Gasto Real
                              </th>
                              <th className="text-right text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                                Provisiones
                              </th>
                              <th className="text-right text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase tracking-wide p-3 border-b border-brand-border-light">
                                Saldo
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {groupedDetailData.map((group) => {
                          const formatCurrency = (val: number) => {
                            return new Intl.NumberFormat("es-PE", {
                              style: "currency",
                              currency: "PEN",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(val);
                          };

                          return (
                            <React.Fragment key={group.managementName}>
                              {/* Filas de sustento por gerencia */}
                              {group.rows.map((row, idx) => (
                                <tr 
                                  key={row.supportId}
                                  className={`
                                    ${idx % 2 === 0 ? 'bg-white' : 'bg-brand-background/30'}
                                    hover:bg-brand-background transition-colors
                                  `}
                                >
                                  {/* Celda de gerencia solo en primera fila del grupo */}
                                  {idx === 0 ? (
                                    <td 
                                      rowSpan={group.rows.length} 
                                      className="p-3 text-xs text-brand-text-secondary font-semibold border-b border-brand-border-light align-top bg-brand-background/50"
                                    >
                                      {group.managementName}
                                    </td>
                                  ) : null}
                                  <td className="p-3 text-xs text-brand-text-primary font-medium border-b border-brand-border-light">
                                    {row.supportName}
                                  </td>
                                  <td className="p-3 text-xs text-brand-text-primary text-right font-medium border-b border-brand-border-light">
                                    {formatCurrency(row.budget)}
                                  </td>
                                  {mode === "execution" ? (
                                    <>
                                      <td className="p-3 text-xs text-brand-text-primary text-right border-b border-brand-border-light">
                                        {formatCurrency(row.executed)}
                                      </td>
                                      <td className={`p-3 text-xs text-right font-semibold border-b border-brand-border-light ${
                                        row.diferencia >= 0 ? 'text-status-success' : 'text-status-error'
                                      }`}>
                                        {formatCurrency(row.diferencia)}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="p-3 text-xs text-brand-text-primary text-right border-b border-brand-border-light">
                                        {formatCurrency(row.executed)}
                                      </td>
                                      <td className="p-3 text-xs text-brand-text-primary text-right border-b border-brand-border-light">
                                        {formatCurrency(row.provisions)}
                                      </td>
                                      <td className={`p-3 text-xs text-right font-semibold border-b border-brand-border-light ${
                                        row.diferencia >= 0 ? 'text-status-success' : 'text-status-error'
                                      }`}>
                                        {formatCurrency(row.diferencia)}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                              {/* Fila de subtotal por gerencia */}
                              <tr className="bg-brand-background/60 font-semibold">
                                <td colSpan={2} className="p-3 text-xs text-brand-text-primary uppercase border-b-2 border-brand-border">
                                  Subtotal {group.managementName}
                                </td>
                                <td className="p-3 text-xs text-brand-text-primary text-right border-b-2 border-brand-border">
                                  {formatCurrency(group.subtotal.budget)}
                                </td>
                                {mode === "execution" ? (
                                  <>
                                    <td className="p-3 text-xs text-brand-text-primary text-right border-b-2 border-brand-border">
                                      {formatCurrency(group.subtotal.executed)}
                                    </td>
                                    <td className={`p-3 text-xs text-right border-b-2 border-brand-border ${
                                      group.subtotal.diferencia >= 0 ? 'text-status-success' : 'text-status-error'
                                    }`}>
                                      {formatCurrency(group.subtotal.diferencia)}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="p-3 text-xs text-brand-text-primary text-right border-b-2 border-brand-border">
                                      {formatCurrency(group.subtotal.executed)}
                                    </td>
                                    <td className="p-3 text-xs text-brand-text-primary text-right border-b-2 border-brand-border">
                                      {formatCurrency(group.subtotal.provisions)}
                                    </td>
                                    <td className={`p-3 text-xs text-right border-b-2 border-brand-border ${
                                      group.subtotal.diferencia >= 0 ? 'text-status-success' : 'text-status-error'
                                    }`}>
                                      {formatCurrency(group.subtotal.diferencia)}
                                    </td>
                                  </>
                                )}
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Footer sticky con total general */}
                  <div className="sticky bottom-0 bg-table-total border-t-2 border-brand-primary shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[20%]" />
                        <col className="w-[30%]" />
                        <col className="w-[15%]" />
                        <col className="w-[15%]" />
                        {mode === "contable" && <col className="w-[15%]" />}
                        <col className="w-[20%]" />
                      </colgroup>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="p-3 text-xs font-bold text-brand-text-primary uppercase">
                            Total
                          </td>
                          <td className="p-3 text-xs font-bold text-brand-text-primary text-right">
                            {new Intl.NumberFormat("es-PE", {
                              style: "currency",
                              currency: "PEN",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(detailData.totals.budget)}
                          </td>
                          {mode === "execution" ? (
                            <>
                              <td className="p-3 text-xs font-bold text-brand-text-primary text-right">
                                {new Intl.NumberFormat("es-PE", {
                                  style: "currency",
                                  currency: "PEN",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(detailData.totals.executed)}
                              </td>
                              <td className={`p-3 text-xs font-bold text-right ${
                                detailData.totals.diferencia >= 0 ? 'text-status-success' : 'text-status-error'
                              }`}>
                                {new Intl.NumberFormat("es-PE", {
                                  style: "currency",
                                  currency: "PEN",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(detailData.totals.diferencia)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 text-xs font-bold text-brand-text-primary text-right">
                                {new Intl.NumberFormat("es-PE", {
                                  style: "currency",
                                  currency: "PEN",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(detailData.totals.executed)}
                              </td>
                              <td className="p-3 text-xs font-bold text-brand-text-primary text-right">
                                {new Intl.NumberFormat("es-PE", {
                                  style: "currency",
                                  currency: "PEN",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(detailData.totals.provisions)}
                              </td>
                              <td className={`p-3 text-xs font-bold text-right ${
                                detailData.totals.diferencia >= 0 ? 'text-status-success' : 'text-status-error'
                              }`}>
                                {new Intl.NumberFormat("es-PE", {
                                  style: "currency",
                                  currency: "PEN",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(detailData.totals.diferencia)}
                              </td>
                            </>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                INFORMACIÓN ADICIONAL
                ══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between text-xs text-brand-text-disabled pt-3 border-t border-brand-border-light">
              <div>
                Versión de presupuesto: {data.versionId ? `#${data.versionId}` : 'No especificada'}
              </div>
              <div>
                Última actualización: {new Date().toLocaleDateString('es-PE')}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

