import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import YearMonthPicker from "../components/YearMonthPicker";
import { 
  ResponsiveContainer, 
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
  PieChart
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

interface Period {
  id: number;
  year: number;
  month: number;
  label?: string;
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
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

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
        {formatCurrency(value)}
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
  
  // Filtros
  const [supportId, setSupportId] = useState<string>("");
  const [costCenterId, setCostCenterId] = useState<string>("");
  const [managementId, setManagementId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");
  const [periodFromId, setPeriodFromId] = useState<number | null>(null);
  const [periodToId, setPeriodToId] = useState<number | null>(null);
  
  // Ref para rastrear si estamos en un cambio programático (trimestre) o manual (usuario)
  const isProgrammaticChangeRef = useRef(false);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);

  // ══════════════════════════════════════════════════════════════
  // QUERIES - Catálogos
  // ══════════════════════════════════════════════════════════════
  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: ["periods"],
    queryFn: async () => (await api.get("/periods")).data,
  });

  const { data: supports = [] } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data,
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data,
  });

  const { data: managements = [] } = useQuery({
    queryKey: ["managements"],
    queryFn: async () => (await api.get("/managements")).data,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/areas")).data,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => (await api.get("/packages")).data,
  });

  // Áreas filtradas por gerencia
  const filteredAreas = useMemo(() => {
    if (!managementId) return areas;
    return areas.filter((a: any) => String(a.managementId) === managementId);
  }, [areas, managementId]);

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
    queryKey: ["dashboard", year, mode, supportId, costCenterId, managementId, areaId, packageId, periodFromId, periodToId],
    queryFn: async () => {
      const params: any = { year, mode };
      if (supportId) params.supportId = supportId;
      if (costCenterId) params.costCenterId = costCenterId;
      if (managementId) params.managementId = managementId;
      if (areaId) params.areaId = areaId;
      if (packageId) params.packageId = packageId;
      if (periodFromId) params.periodFromId = periodFromId;
      if (periodToId) params.periodToId = periodToId;
      
      return (await api.get("/reports/dashboard", { params })).data;
    },
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
    return !!(supportId || costCenterId || managementId || areaId || packageId || periodFromId || periodToId);
  }, [supportId, costCenterId, managementId, areaId, packageId, periodFromId, periodToId]);

  const clearFilters = () => {
    setSupportId("");
    setCostCenterId("");
    setManagementId("");
    setAreaId("");
    setPackageId("");
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
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-text-primary">
                Dashboard
              </h1>
              <p className="text-sm text-brand-text-secondary mt-1">
                Vista de presupuesto y ejecución
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
                  {[supportId, costCenterId, managementId, areaId, packageId].filter(Boolean).length}
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
                <div>
                  <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                    Sustento
                  </label>
                  <Select
                    value={supportId}
                    onChange={(e) => setSupportId(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                  >
                    <option value="">Todos</option>
                    {supports.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* CECO */}
                <div>
                  <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                    Centro de Costo
                  </label>
                  <Select
                    value={costCenterId}
                    onChange={(e) => setCostCenterId(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                  >
                    <option value="">Todos</option>
                    {costCenters.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Gerencia */}
                <div>
                  <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                    Gerencia
                  </label>
                  <Select
                    value={managementId}
                    onChange={(e) => {
                      setManagementId(e.target.value);
                      setAreaId(""); // Limpiar área al cambiar gerencia
                    }}
                    className="h-9 text-xs sm:text-sm"
                  >
                    <option value="">Todas</option>
                    {managements.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Área */}
                <div>
                  <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                    Área
                  </label>
                  <Select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                    disabled={!managementId}
                  >
                    <option value="">Todas</option>
                    {filteredAreas.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Paquete de Gasto */}
                <div>
                  <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                    Paquete de Gasto
                  </label>
                  <Select
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                  >
                    <option value="">Todos</option>
                    {packages.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
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
                title="PPTO"
                value={data.totals.budget}
                icon={Wallet}
                description={`Presupuesto total ${year}`}
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
                  description="PPTO - Ejecutado Real"
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
                
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
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
                        name="PPTO" 
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
                  </ResponsiveContainer>
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
                  Ejecutado / PPTO Total
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
                    Provisiones / PPTO Total
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
                  {mode === "execution" ? "Disponible / PPTO Total" : "Saldo / PPTO Total"}
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

