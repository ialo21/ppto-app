import React, { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import FilterSelect from "../components/ui/FilterSelect";
import MultiSelectFilter from "../components/ui/MultiSelectFilter";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
import YearMonthPicker from "../components/YearMonthPicker";
import { formatPeriodLabel } from "../utils/periodFormat";
import {
  calculatePresupuestalReport,
  calculateContableReport,
  calculateMixtoReport,
  filterPeriodsByRange
} from "../utils/reportsCalculations";
import { formatNumber, formatNumberForCSV } from "../utils/numberFormat";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * PÁGINA DE REPORTES - MÓDULO DE TABLAS + EXPORTACIÓN CSV
 * 
 * MODOS SOPORTADOS:
 * 
 * 1. PRESUPUESTAL:
 *    - Filas: un registro por mes de período PPTO
 *    - Columnas: Mes periodo, PPTO, Ejecutado real, Variación abs, Variación %, Disponible
 *    - Ejecutado = facturas asignadas a esos períodos normales
 * 
 * 2. CONTABLE:
 *    - Filas: un registro por mes contable
 *    - Columnas: Mes contable, PPTO asociado, Ejecutado contable, Provisiones, Resultado contable, Variación vs PPTO
 *    - Ejecutado = facturas con ese mes contable
 *    - Provisiones = provisiones (+/-) de ese mes contable
 * 
 * 3. MIXTO:
 *    - Filas: un registro por mes de período PPTO
 *    - Columnas: Mes período, PPTO, Ejecutado real, Resultado contable, Diferencia real vs contable, Disponible
 *    - Combina visión presupuestal y contable
 * 
 * EXPORTACIÓN CSV:
 * - Exportar CSV (Resumen): exporta las filas visibles de la tabla principal
 * - Exportar CSV (Detalle): exporta el nivel detallado por sustento/CECO/factura/provisión
 * 
 * FILTROS:
 * - Año, Modo (Presupuestal/Contable/Mixto)
 * - Gerencia, Área, Paquete, Sustento, CECO
 * - Moneda de visualización (PEN/USD)
 * - Rango de meses (según el modo)
 */

type ReportMode = 'presupuestal' | 'contable' | 'mixto';

/**
 * Toggle de modo de reporte (Presupuestal / Contable / Mixto)
 */
function ReportModeToggle({ 
  mode, 
  onChange 
}: { 
  mode: ReportMode; 
  onChange: (mode: ReportMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-brand-border bg-white p-1">
      <button
        onClick={() => onChange("presupuestal")}
        className={`
          px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all
          ${mode === "presupuestal" 
            ? 'bg-brand-primary text-white shadow-sm' 
            : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-background'
          }
        `}
      >
        Presupuestal
      </button>
      <button
        onClick={() => onChange("contable")}
        className={`
          px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all
          ${mode === "contable" 
            ? 'bg-brand-primary text-white shadow-sm' 
            : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-background'
          }
        `}
      >
        Contable
      </button>
      <button
        onClick={() => onChange("mixto")}
        className={`
          px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all
          ${mode === "mixto" 
            ? 'bg-brand-primary text-white shadow-sm' 
            : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-background'
          }
        `}
      >
        Mixto
      </button>
    </div>
  );
}

/**
 * Selector de año con navegación (similar al Dashboard)
 */
function YearSelector({
  year,
  onYearChange,
  availableYears
}: {
  year: number;
  onYearChange: (year: number) => void;
  availableYears: number[];
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onYearChange(year - 1)}
        className="p-1.5 rounded-lg hover:bg-brand-background text-brand-text-secondary transition-colors"
        aria-label="Año anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-sm font-bold text-brand-text-primary min-w-[60px] text-center">
        {year}
      </div>
      <button
        onClick={() => onYearChange(year + 1)}
        className="p-1.5 rounded-lg hover:bg-brand-background text-brand-text-secondary transition-colors"
        aria-label="Año siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

type Period = {
  id: number;
  year: number;
  month: number;
  label?: string;
};

type ReportRow = {
  periodId: number;
  periodLabel: string;
  ppto: number;
  ejecutadoReal: number;
  ejecutadoContable?: number;
  provisiones?: number;
  resultadoContable?: number;
  variacionAbs: number;
  variacionPct: number;
  disponible: number;
  diferenciaRealContable?: number;
};

type PackageDetail = {
  packageId: number | null;
  packageName: string;
  ppto: number;
  ejecutadoReal: number;
};

type InvoiceDetail = {
  id: number;
  numeroFactura: string;  // numberNorm del modelo Invoice
  fecha: string | null;
  monto: number;
  moneda: string;
  cecos: string;
  estado: string;
};

type SupportDetail = {
  supportId: number;
  supportCode: string;
  supportName: string;
  ppto: number;
  ejecutadoReal: number;
  invoices: InvoiceDetail[];
};

type ManagementDetail = {
  managementId: number | null;
  managementName: string;
  ppto: number;
  ejecutadoReal: number;
  supports: SupportDetail[];
};

type PackageDetailExtended = {
  packageId: number | null;
  packageName: string;
  ppto: number;
  ejecutadoReal: number;
  managements: ManagementDetail[];
};

export default function ReportsPage() {
  // Queries para catálogos
  const { data: periods } = useQuery<Period[]>({
    queryKey: ["periods"],
    queryFn: async () => (await api.get("/periods")).data
  });

  const { data: managements } = useQuery({
    queryKey: ["managements"],
    queryFn: async () => (await api.get("/managements")).data
  });

  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/areas")).data
  });

  const { data: packages } = useQuery({
    queryKey: ["expense-packages"],
    queryFn: async () => (await api.get("/expense-packages")).data
  });

  const { data: supports } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data
  });

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data
  });

  // Estados de filtros (ahora multi-select excepto currency y mode)
  // NOTA: Se declaran antes de las queries que los utilizan para evitar "Cannot access before initialization"
  const [mode, setMode] = useState<ReportMode>('presupuestal');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [periodFromId, setPeriodFromId] = useState<number | null>(null);
  const [periodToId, setPeriodToId] = useState<number | null>(null);
  const [managementIds, setManagementIds] = useState<string[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [packageIds, setPackageIds] = useState<string[]>([]);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [costCenterIds, setCostCenterIds] = useState<string[]>([]);
  const [currency, setCurrency] = useState<string>("PEN");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [expandedManagements, setExpandedManagements] = useState<Set<string>>(new Set());
  const [expandedSupports, setExpandedSupports] = useState<Set<string>>(new Set());
  
  // Ref para rastrear cambios programáticos (para futuras funcionalidades)
  const isProgrammaticChangeRef = useRef(false);

  // Queries para datos de reportes
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices")).data
  });

  const { data: provisions = [] } = useQuery({
    queryKey: ["provisions"],
    queryFn: async () => (await api.get("/provisions")).data
  });

  // Query para presupuestos del año seleccionado
  const { data: annualBudgetData = [] } = useQuery({
    queryKey: ["budgets-annual-report", year],
    queryFn: async () => {
      const response = await api.get("/budgets/annual", { params: { year } });
      return response.data;
    },
    enabled: !!year
  });

  // Años disponibles
  const availableYears = useMemo(() => {
    if (!periods || periods.length === 0) return [new Date().getFullYear()];
    const years = [...new Set(periods.map(p => p.year))];
    return years.sort((a, b) => b - a);
  }, [periods]);

  // Períodos del año seleccionado
  const yearPeriods = useMemo(() => {
    if (!periods) return [];
    return periods
      .filter(p => p.year === year)
      .sort((a, b) => a.month - b.month);
  }, [periods, year]);

  // Áreas filtradas por gerencia(s) seleccionada(s)
  const filteredAreas = useMemo(() => {
    if (!areas || managementIds.length === 0) return areas || [];
    return areas.filter((a: any) => managementIds.includes(String(a.managementId)));
  }, [areas, managementIds]);

  // Procesar datos de presupuesto anual para obtener budget allocations
  // NOTA: annualBudgetData.rows tiene estructura: { supportId, costCenterId, months: { '01': { periodId, amountPen }, '02': {...}, ... } }
  const budgetAllocations = useMemo(() => {
    if (!annualBudgetData || !annualBudgetData.rows || !Array.isArray(annualBudgetData.rows)) return [];
    
    const allocations: any[] = [];
    
    annualBudgetData.rows.forEach((row: any) => {
      if (!row.months) return;
      
      // months es un objeto con keys "01", "02", ..., "12"
      Object.entries(row.months).forEach(([monthKey, data]: [string, any]) => {
        if (!data || typeof data !== 'object') return;
        
        const amountPen = Number(data.amountPen || 0);
        
        allocations.push({
          supportId: row.supportId,
          supportName: row.supportName,
          supportCode: row.supportCode,
          costCenterId: row.costCenterId,
          costCenterCode: row.costCenterCode,
          costCenterName: row.costCenterName,
          periodId: data.periodId,
          amountPen: amountPen,
          support: {
            id: row.supportId,
            name: row.supportName,
            managementId: row.managementId,
            areaId: row.areaId,
            expensePackageId: row.expensePackageId,
            expensePackageName: row.expensePackageName
          },
          expensePackageId: row.expensePackageId,
          expensePackageName: row.expensePackageName
        });
      });
    });
    
    return allocations;
  }, [annualBudgetData]);

  // Filtros para cálculos (ahora con soporte para arrays)
  const calculationFilters = useMemo(() => ({
    managementIds: managementIds.map(id => Number(id)),
    areaIds: areaIds.map(id => Number(id)),
    packageIds: packageIds.map(id => Number(id)),
    supportIds: supportIds.map(id => Number(id)),
    costCenterIds: costCenterIds.map(id => Number(id))
  }), [managementIds, areaIds, packageIds, supportIds, costCenterIds]);

  // Períodos filtrados por rango
  const filteredPeriods = useMemo(() => {
    if (mode === 'mixto') return yearPeriods; // Modo mixto usa todo el año
    return filterPeriodsByRange(yearPeriods, periodFromId, periodToId);
  }, [yearPeriods, periodFromId, periodToId, mode]);

  // Calcular datos del reporte según el modo
  const reportData = useMemo(() => {
    // TODO: conversión PEN ↔ USD - por ahora solo mostramos PEN
    if (currency === 'USD') {
      // Placeholder: en el futuro implementar conversión
    }

    if (mode === 'presupuestal') {
      const presupuestalData = calculatePresupuestalReport(
        budgetAllocations,
        invoices,
        filteredPeriods,
        calculationFilters
      );

      return filteredPeriods.map(p => {
        const data = presupuestalData.get(p.id) || { periodId: p.id, ppto: 0, ejecutadoReal: 0 };
        const variacionAbs = data.ejecutadoReal - data.ppto;
        const variacionPct = data.ppto > 0 ? (variacionAbs / data.ppto) * 100 : 0;
        const disponible = data.ppto - data.ejecutadoReal;

        return {
          periodId: p.id,
          periodLabel: formatPeriodLabel(p),
          ppto: data.ppto,
          ejecutadoReal: data.ejecutadoReal,
          variacionAbs,
          variacionPct,
          disponible,
          ejecutadoContable: 0,
          provisiones: 0,
          resultadoContable: 0,
          diferenciaRealContable: 0
        };
      });
    }

    if (mode === 'contable') {
      const contableData = calculateContableReport(
        budgetAllocations,
        invoices,
        provisions,
        filteredPeriods,
        calculationFilters
      );

      // Convertir Map a array ordenado por mes contable
      const rows: ReportRow[] = [];
      contableData.forEach((data, mesContable) => {
        // REGLA DE NEGOCIO: Solo mostrar meses con registros contables reales
        // (facturas con mesContable o provisiones con periodoContable)
        const hasRealActivity = data.ejecutadoContable > 0 || data.provisiones !== 0;
        if (!hasRealActivity) return; // Omitir meses sin actividad contable
        
        // Parsear mesContable para poder ordenar
        const [year, month] = mesContable.split('-').map(Number);
        const period = filteredPeriods.find(p => p.year === year && p.month === month) || { id: 0, year, month };

        const resultadoContable = data.ejecutadoContable + data.provisiones;
        // ⚠️ REGLA DE NEGOCIO CRÍTICA:
        // Variación = PPTO - Resultado Contable
        // Si Resultado < PPTO → ahorro → variación positiva
        // Si Resultado > PPTO → sobregasto → variación negativa
        const variacionAbs = data.pptoAsociado - resultadoContable;
        const variacionPct = data.pptoAsociado > 0 ? (variacionAbs / data.pptoAsociado) * 100 : 0;

        rows.push({
          periodId: period.id,
          periodLabel: mesContable,
          ppto: data.pptoAsociado,
          ejecutadoReal: 0,
          ejecutadoContable: data.ejecutadoContable,
          provisiones: data.provisiones,
          resultadoContable,
          variacionAbs,
          variacionPct,
          disponible: 0,
          diferenciaRealContable: 0
        });
      });

      // Ordenar por año-mes
      return rows.sort((a, b) => {
        const [aY, aM] = a.periodLabel.split('-').map(Number);
        const [bY, bM] = b.periodLabel.split('-').map(Number);
        return (aY * 100 + aM) - (bY * 100 + bM);
      });
    }

    if (mode === 'mixto') {
      const mixtoData = calculateMixtoReport(
        budgetAllocations,
        invoices,
        provisions,
        filteredPeriods,
        calculationFilters
      );

      return filteredPeriods.map(p => {
        const data = mixtoData.get(p.id) || { periodId: p.id, ppto: 0, ejecutadoReal: 0, resultadoContable: 0 };
        const variacionAbs = data.ejecutadoReal - data.ppto;
        const variacionPct = data.ppto > 0 ? (variacionAbs / data.ppto) * 100 : 0;
        const disponible = data.ppto - data.ejecutadoReal;
        const diferenciaRealContable = data.ejecutadoReal - data.resultadoContable;

        return {
          periodId: p.id,
          periodLabel: formatPeriodLabel(p),
          ppto: data.ppto,
          ejecutadoReal: data.ejecutadoReal,
          variacionAbs,
          variacionPct,
          disponible,
          ejecutadoContable: 0,
          provisiones: 0,
          resultadoContable: data.resultadoContable,
          diferenciaRealContable
        };
      });
    }

    return [];
  }, [mode, budgetAllocations, invoices, provisions, filteredPeriods, calculationFilters, currency]);

  // Datos filtrados (sin filtro de desviación)
  const filteredData = reportData;

  // Detalle jerárquico: Paquete → Gerencia → Sustento → Facturas (modo PRESUPUESTAL)
  const hierarchicalDetailsByPeriod = useMemo(() => {
    if (mode !== 'presupuestal') return new Map<number, PackageDetailExtended[]>();
    
    // Crear lookup map para nombres de gerencia
    const managementMap = new Map<number, string>();
    (managements || []).forEach((m: any) => {
      managementMap.set(m.id, m.name);
    });
    
    // Estructura: periodId → packageId → managementId → supportId → data
    const detailMap = new Map<number, Map<number | null, Map<number | null, Map<number, {
      supportId: number;
      supportCode: string;
      supportName: string;
      managementId: number | null;
      managementName: string;
      ppto: number;
      ejecutadoReal: number;
      invoiceIds: Set<number>;
    }>>>>();
    
    // 1. Procesar presupuesto
    budgetAllocations.forEach((alloc: any) => {
      if (!alloc.periodId) return;
      
      // Aplicar filtros (ahora con arrays)
      if (calculationFilters.managementIds.length > 0 && alloc.support?.managementId && !calculationFilters.managementIds.includes(alloc.support.managementId)) return;
      if (calculationFilters.areaIds.length > 0 && alloc.support?.areaId && !calculationFilters.areaIds.includes(alloc.support.areaId)) return;
      if (calculationFilters.packageIds.length > 0 && alloc.expensePackageId && !calculationFilters.packageIds.includes(alloc.expensePackageId)) return;
      if (calculationFilters.supportIds.length > 0 && !calculationFilters.supportIds.includes(alloc.supportId)) return;
      if (calculationFilters.costCenterIds.length > 0 && !calculationFilters.costCenterIds.includes(alloc.costCenterId)) return;
      
      const periodId = alloc.periodId;
      const packageId = alloc.expensePackageId ?? null;
      const managementId = alloc.support?.managementId ?? null;
      const supportId = alloc.supportId;
      
      if (!detailMap.has(periodId)) {
        detailMap.set(periodId, new Map());
      }
      const periodMap = detailMap.get(periodId)!;
      
      if (!periodMap.has(packageId)) {
        periodMap.set(packageId, new Map());
      }
      const pkgMap = periodMap.get(packageId)!;
      
      if (!pkgMap.has(managementId)) {
        pkgMap.set(managementId, new Map());
      }
      const mgmtMap = pkgMap.get(managementId)!;
      
      if (!mgmtMap.has(supportId)) {
        // Obtener nombre de gerencia desde el Map
        const mgmtName = managementId ? managementMap.get(managementId) || 'Sin gerencia' : 'Sin gerencia';
        
        mgmtMap.set(supportId, {
          supportId,
          supportCode: alloc.supportCode || alloc.support?.code || '',
          supportName: alloc.supportName || alloc.support?.name || `Sustento ${supportId}`,
          managementId,
          managementName: mgmtName,
          ppto: 0,
          ejecutadoReal: 0,
          invoiceIds: new Set()
        });
      }
      
      const supportData = mgmtMap.get(supportId)!;
      supportData.ppto += Number(alloc.amountPen || 0);
    });
    
    // 2. Procesar facturas (ejecutado)
    invoices.forEach((inv: any) => {
      const periodIds = inv.periods?.map((p: any) => p.periodId) || [];
      if (periodIds.length === 0) return;
      
      const support = inv.oc?.support;
      if (!support) return;
      
      // Aplicar filtros (ahora con arrays)
      if (calculationFilters.managementIds.length > 0 && support.managementId && !calculationFilters.managementIds.includes(support.managementId)) return;
      if (calculationFilters.areaIds.length > 0 && support.areaId && !calculationFilters.areaIds.includes(support.areaId)) return;
      if (calculationFilters.packageIds.length > 0 && support.expensePackageId && !calculationFilters.packageIds.includes(support.expensePackageId)) return;
      if (calculationFilters.supportIds.length > 0 && !calculationFilters.supportIds.includes(support.id)) return;
      
      const amountPEN = Number(inv.montoPEN_tcReal ?? inv.montoPEN_tcEstandar ?? 0);
      const amountPerPeriod = amountPEN / periodIds.length;
      const packageId = support.expensePackageId ?? null;
      const managementId = support.managementId ?? null;
      const supportId = support.id;
      
      periodIds.forEach((periodId: any) => {
        if (!detailMap.has(periodId)) {
          detailMap.set(periodId, new Map());
        }
        const periodMap = detailMap.get(periodId)!;
        
        if (!periodMap.has(packageId)) {
          periodMap.set(packageId, new Map());
        }
        const pkgMap = periodMap.get(packageId)!;
        
        if (!pkgMap.has(managementId)) {
          pkgMap.set(managementId, new Map());
        }
        const mgmtMap = pkgMap.get(managementId)!;
        
        if (!mgmtMap.has(supportId)) {
          // Obtener nombre de gerencia desde el Map
          const mgmtName = managementId ? managementMap.get(managementId) || 'Sin gerencia' : 'Sin gerencia';
          
          mgmtMap.set(supportId, {
            supportId,
            supportCode: support.code || '',
            supportName: support.name || `Sustento ${supportId}`,
            managementId,
            managementName: mgmtName,
            ppto: 0,
            ejecutadoReal: 0,
            invoiceIds: new Set()
          });
        }
        
        const supportData = mgmtMap.get(supportId)!;
        supportData.ejecutadoReal += amountPerPeriod;
        supportData.invoiceIds.add(inv.id);
      });
    });
    
    // 3. Construir estructura jerárquica final
    const result = new Map<number, PackageDetailExtended[]>();
    
    detailMap.forEach((packageMap, periodId) => {
      const packages: PackageDetailExtended[] = [];
      
      packageMap.forEach((mgmtMap, packageId) => {
        const managements: ManagementDetail[] = [];
        
        mgmtMap.forEach((supportMap, managementId) => {
          const supports: SupportDetail[] = [];
          
          supportMap.forEach((supportData) => {
            // Obtener facturas de este sustento en este período
            const supportInvoices: InvoiceDetail[] = [];
            invoices.forEach((inv: any) => {
              if (!supportData.invoiceIds.has(inv.id)) return;
              
              const periodIds = inv.periods?.map((p: any) => p.periodId) || [];
              if (!periodIds.includes(periodId)) return;
              
              // Extraer CECOs
              const cecos = inv.costCenters?.map((cc: any) => 
                costCenters?.find((c: any) => c.id === cc.costCenterId)?.code || cc.costCenterId
              ).filter(Boolean).join(', ') || 'N/A';
              
              supportInvoices.push({
                id: inv.id,
                numeroFactura: inv.numberNorm || '-',  // Usar numberNorm (campo real en BD)
                fecha: inv.createdAt || null,  // createdAt es el único campo de fecha disponible
                monto: Number(inv.montoPEN_tcReal ?? inv.montoPEN_tcEstandar ?? 0) / periodIds.length,
                moneda: inv.currency || 'PEN',
                cecos,
                estado: inv.statusCurrent || 'INGRESADO'  // statusCurrent es el campo correcto
              });
            });
            
            supports.push({
              supportId: supportData.supportId,
              supportCode: supportData.supportCode,
              supportName: supportData.supportName,
              ppto: supportData.ppto,
              ejecutadoReal: supportData.ejecutadoReal,
              invoices: supportInvoices
            });
          });
          
          // Calcular totales de gerencia
          const mgmtPpto = supports.reduce((sum, s) => sum + s.ppto, 0);
          const mgmtEjecutado = supports.reduce((sum, s) => sum + s.ejecutadoReal, 0);
          
          // Obtener nombre de gerencia del primer sustento
          const mgmtName = supportMap.values().next().value?.managementName || 'Sin gerencia';
          
          managements.push({
            managementId,
            managementName: mgmtName,
            ppto: mgmtPpto,
            ejecutadoReal: mgmtEjecutado,
            supports: supports.sort((a, b) => b.ppto - a.ppto)
          });
        });
        
        // Calcular totales de paquete
        const pkgPpto = managements.reduce((sum, m) => sum + m.ppto, 0);
        const pkgEjecutado = managements.reduce((sum, m) => sum + m.ejecutadoReal, 0);
        
        // Obtener nombre de paquete
        const firstSupport = mgmtMap.values().next().value?.values().next().value;
        const pkgName = packages.find(p => p.packageId === packageId)?.packageName || 
                       (budgetAllocations.find((a: any) => a.expensePackageId === packageId)?.expensePackageName) ||
                       (invoices.find((i: any) => i.oc?.support?.expensePackageId === packageId)?.oc?.support?.expensePackage?.name) ||
                       'Sin paquete';
        
        packages.push({
          packageId,
          packageName: pkgName,
          ppto: pkgPpto,
          ejecutadoReal: pkgEjecutado,
          managements: managements.sort((a, b) => b.ppto - a.ppto)
        });
      });
      
      result.set(periodId, packages.sort((a, b) => b.ppto - a.ppto));
    });
    
    return result;
  }, [mode, budgetAllocations, invoices, calculationFilters, costCenters, managements]);

  // Totales
  const totals = useMemo(() => {
    return filteredData.reduce((acc, row) => ({
      ppto: acc.ppto + Number(row.ppto || 0),
      ejecutadoReal: acc.ejecutadoReal + Number(row.ejecutadoReal || 0),
      ejecutadoContable: acc.ejecutadoContable + Number(row.ejecutadoContable || 0),
      provisiones: acc.provisiones + Number(row.provisiones || 0),
      resultadoContable: acc.resultadoContable + Number(row.resultadoContable || 0),
      variacionAbs: acc.variacionAbs + Number(row.variacionAbs || 0),
      disponible: acc.disponible + Number(row.disponible || 0),
      diferenciaRealContable: acc.diferenciaRealContable + Number(row.diferenciaRealContable || 0)
    }), {
      ppto: 0,
      ejecutadoReal: 0,
      ejecutadoContable: 0,
      provisiones: 0,
      resultadoContable: 0,
      variacionAbs: 0,
      disponible: 0,
      diferenciaRealContable: 0
    });
  }, [filteredData]);

  // Funciones para expandir/colapsar niveles jerárquicos
  const toggleRow = useCallback((periodId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(periodId)) {
        newSet.delete(periodId);
      } else {
        newSet.add(periodId);
      }
      return newSet;
    });
  }, []);
  
  const togglePackage = useCallback((key: string) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);
  
  const toggleManagement = useCallback((key: string) => {
    setExpandedManagements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);
  
  const toggleSupport = useCallback((key: string) => {
    setExpandedSupports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Exportación CSV - Resumen
  // Exporta las filas visibles de la tabla principal con datos reales calculados
  const exportCSVResumen = useCallback(() => {
    const headers = mode === 'presupuestal'
      ? ['Mes', 'PPTO', 'Ejecutado Real', 'Variación Abs', 'Variación %', 'Disponible']
      : mode === 'contable'
      ? ['Mes Contable', 'PPTO Asociado', 'Ejecutado Contable', 'Provisiones', 'Resultado Contable', 'Variación vs PPTO']
      : ['Mes', 'PPTO', 'Ejecutado Real', 'Resultado Contable', 'Diferencia Real vs Contable', 'Disponible'];

    const rows = filteredData.map(row => {
      if (mode === 'presupuestal') {
        return [
          row.periodLabel,
          formatNumberForCSV(row.ppto),
          formatNumberForCSV(row.ejecutadoReal),
          formatNumberForCSV(row.variacionAbs),
          formatNumberForCSV(row.variacionPct) + '%',
          formatNumberForCSV(row.disponible)
        ];
      } else if (mode === 'contable') {
        return [
          row.periodLabel,
          formatNumberForCSV(row.ppto),
          formatNumberForCSV(row.ejecutadoContable),
          formatNumberForCSV(row.provisiones),
          formatNumberForCSV(row.resultadoContable),
          formatNumberForCSV(row.variacionAbs)
        ];
      } else {
        return [
          row.periodLabel,
          formatNumberForCSV(row.ppto),
          formatNumberForCSV(row.ejecutadoReal),
          formatNumberForCSV(row.resultadoContable),
          formatNumberForCSV(row.diferenciaRealContable),
          formatNumberForCSV(row.disponible)
        ];
      }
    });

    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${mode}_${year}_resumen.csv`;
    link.click();
  }, [filteredData, mode, year]);

  // Exportación CSV - Detalle (Multinivel)
  const exportCSVDetalle = useCallback(() => {
    if (mode !== 'presupuestal') {
      // Por ahora solo soporta modo presupuestal
      const headers = ['Mes', 'Paquete', 'Gerencia', 'Sustento', 'Tipo', 'Serie-Número', 'Fecha', 'Monto', 'Moneda', 'CECOs', 'Estado'];
      const csv = [headers.join(','), 'Detalle disponible solo en modo PRESUPUESTAL'].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `reporte_${mode}_${year}_detalle.csv`;
      link.click();
      return;
    }
    
    const headers = ['Año', 'Mes', 'Paquete de Gasto', 'Gerencia', 'Área', 'Sustento', 'Tipo de Fila', 'Serie-Número', 'Fecha', 'Monto (PEN)', 'Moneda', 'CECOs', 'Estado', 'PPTO', 'Ejecutado', 'Disponible', '% Ejecución'];
    const rows: string[] = [];
    
    // Recorrer la estructura jerárquica y generar filas
    filteredData.forEach(row => {
      const packages = hierarchicalDetailsByPeriod.get(row.periodId) || [];
      
      packages.forEach(pkg => {
        pkg.managements.forEach(mgmt => {
          mgmt.supports.forEach(support => {
            // Fila de PPTO para este sustento
            const supportDisponible = support.ppto - support.ejecutadoReal;
            const supportPctEjecucion = support.ppto > 0 ? (support.ejecutadoReal / support.ppto) * 100 : 0;
            
            rows.push([
              year,
              row.periodLabel,
              `"${pkg.packageName.replace(/"/g, '""')}"`,
              `"${mgmt.managementName.replace(/"/g, '""')}"`,
              '', // Área - no disponible en estructura actual
              `"${support.supportCode} - ${support.supportName.replace(/"/g, '""')}"`,
              'PPTO',
              '', // Sin serie-número para fila PPTO
              '', // Sin fecha para fila PPTO
              formatNumberForCSV(support.ppto),
              'PEN',
              '', // Sin CECOs para fila PPTO
              '',
              formatNumberForCSV(support.ppto),
              formatNumberForCSV(support.ejecutadoReal),
              formatNumberForCSV(supportDisponible),
              formatNumberForCSV(supportPctEjecucion) + '%'
            ].join(','));
            
            // Filas de FACTURAS para este sustento
            support.invoices.forEach(invoice => {
              rows.push([
                year,
                row.periodLabel,
                `"${pkg.packageName.replace(/"/g, '""')}"`,
                `"${mgmt.managementName.replace(/"/g, '""')}"`,
                '',
                `"${support.supportCode} - ${support.supportName.replace(/"/g, '""')}"`,
                'FACTURA',
                `"${invoice.numeroFactura}"`,  // Número completo de factura
                invoice.fecha || '',
                formatNumberForCSV(invoice.monto),
                invoice.moneda,
                `"${invoice.cecos.replace(/"/g, '""')}"`,
                invoice.estado,
                '', // PPTO vacío para fila de factura
                formatNumberForCSV(invoice.monto),
                '', // Disponible vacío para fila de factura
                ''
              ].join(','));
            });
          });
        });
      });
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${mode}_${year}_detalle_multinivel.csv`;
    link.click();
  }, [mode, year, filteredData, hierarchicalDetailsByPeriod]);

  return (
    <div className="space-y-4">
      {/* Encabezado con título y modo de reporte */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-text-secondary font-medium">Modo de Vista:</span>
          <ReportModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* Panel de Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-medium">Filtros</h2>
            <div className="flex items-center gap-2">
              <YearSelector 
                year={year} 
                onYearChange={setYear} 
                availableYears={availableYears}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Todos los filtros en un solo grid unificado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Filtros de período (solo si NO es modo mixto) */}
            {mode !== 'mixto' && (
              <>
                <div>
                  <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                    {mode === 'presupuestal' ? 'Período Desde' : 'Mes Contable Desde'}
                  </label>
                  <YearMonthPicker
                    value={periodFromId}
                    onChange={(period) => {
                      const newFromId = period ? period.id : null;
                      setPeriodFromId(newFromId);
                      
                      // Lógica: Si es cambio manual Y periodToId está vacío → copiar Desde a Hasta
                      if (!isProgrammaticChangeRef.current && newFromId !== null && periodToId === null) {
                        setPeriodToId(newFromId);
                      }
                    }}
                    periods={periods || []}
                    maxId={periodToId || undefined}
                    placeholder="Todos los meses"
                    clearable={true}
                  />
                </div>

                <div>
                  <label className="block text-xs text-brand-text-secondary font-medium mb-1">
                    {mode === 'presupuestal' ? 'Período Hasta' : 'Mes Contable Hasta'}
                  </label>
                  <YearMonthPicker
                    value={periodToId}
                    onChange={(period) => setPeriodToId(period ? period.id : null)}
                    periods={periods || []}
                    minId={periodFromId || undefined}
                    placeholder="Todos los meses"
                    clearable={true}
                  />
                </div>
              </>
            )}

            {/* Filtros de catálogos */}
            <MultiSelectFilter
                label="Gerencia"
                placeholder="Todas"
                values={managementIds}
                onChange={(values) => {
                  setManagementIds(values);
                  // Limpiar áreas que no pertenecen a las gerencias seleccionadas
                  if (values.length > 0 && areaIds.length > 0) {
                    const validAreaIds = (areas || [])
                      .filter((a: any) => values.includes(String(a.managementId)))
                      .map((a: any) => String(a.id));
                    setAreaIds(areaIds.filter(id => validAreaIds.includes(id)));
                  }
                }}
                options={(managements || []).map((m: any) => ({
                  value: String(m.id),
                  label: m.name
                }))}
              />

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

              <MultiSelectFilter
                label="Paquete de Gasto"
                placeholder="Todos"
                values={packageIds}
                onChange={setPackageIds}
                options={(packages || []).map((p: any) => ({
                  value: String(p.id),
                  label: p.name
                }))}
              />

              <MultiSelectFilter
                label="Sustento"
                placeholder="Todos"
                values={supportIds}
                onChange={setSupportIds}
                options={(supports || []).map((s: any) => ({
                  value: String(s.id),
                  label: s.code ? `${s.code} - ${s.name}` : s.name,
                  searchText: `${s.code || ''} ${s.name}`
                }))}
              />

              <MultiSelectFilter
                label="Centro de Costo"
                placeholder="Todos"
                values={costCenterIds}
                onChange={setCostCenterIds}
                options={(costCenters || []).map((cc: any) => ({
                  value: String(cc.id),
                  label: `${cc.code} - ${cc.name || ''}`,
                  searchText: `${cc.code} ${cc.name || ''}`
                }))}
              />

              <FilterSelect
                label="Moneda"
                placeholder="Seleccionar moneda"
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: "PEN", label: "Soles (PEN)" },
                  { value: "USD", label: "Dólares (USD)" }
                ]}
                searchable={false}
              />
          </div>

        </CardContent>
      </Card>

      {/* Tabla Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Reporte {mode === 'presupuestal' ? 'Presupuestal' : mode === 'contable' ? 'Contable' : 'Mixto'}
              {' '}- {year}
            </h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={exportCSVResumen}>
                Exportar CSV (Resumen)
              </Button>
              <Button variant="secondary" onClick={exportCSVDetalle}>
                Exportar CSV (Detalle)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th className="w-8"></Th>
                  {mode === 'presupuestal' && (
                    <>
                      <Th>Mes Período</Th>
                      <Th className="text-right">PPTO</Th>
                      <Th className="text-right">Ejecutado Real</Th>
                      <Th className="text-right">Variación Abs</Th>
                      <Th className="text-right">Variación %</Th>
                      <Th className="text-right">Disponible</Th>
                    </>
                  )}
                  {mode === 'contable' && (
                    <>
                      <Th>Mes Contable</Th>
                      <Th className="text-right">PPTO Asociado</Th>
                      <Th className="text-right">Ejecutado Contable</Th>
                      <Th className="text-right">Provisiones</Th>
                      <Th className="text-right">Resultado Contable</Th>
                      <Th className="text-right">Variación vs PPTO</Th>
                    </>
                  )}
                  {mode === 'mixto' && (
                    <>
                      <Th>Mes Período</Th>
                      <Th className="text-right">PPTO</Th>
                      <Th className="text-right">Ejecutado Real</Th>
                      <Th className="text-right">Resultado Contable</Th>
                      <Th className="text-right">Diferencia R vs C</Th>
                      <Th className="text-right">Disponible</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <Td colSpan={7} className="text-center text-slate-500 py-8">
                      No hay datos para los filtros seleccionados
                    </Td>
                  </tr>
                ) : (
                  <>
                    {filteredData.map(row => (
                      <React.Fragment key={row.periodId}>
                        <tr className="hover:bg-slate-50">
                          <Td>
                            <button
                              onClick={() => toggleRow(row.periodId)}
                              className="text-slate-500 hover:text-slate-700"
                            >
                              {expandedRows.has(row.periodId) ? '▼' : '▶'}
                            </button>
                          </Td>
                          {mode === 'presupuestal' && (
                            <>
                              <Td>{row.periodLabel}</Td>
                              <Td className="text-right">{currency} {formatNumber(row.ppto)}</Td>
                              <Td className="text-right">{currency} {formatNumber(row.ejecutadoReal)}</Td>
                              <Td className={`text-right ${row.variacionAbs >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {currency} {formatNumber(row.variacionAbs)}
                              </Td>
                              <Td className={`text-right font-medium ${Math.abs(row.variacionPct) > 5 ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatNumber(row.variacionPct)}%
                              </Td>
                              <Td className="text-right font-semibold">{currency} {formatNumber(row.disponible)}</Td>
                            </>
                          )}
                          {mode === 'contable' && (
                            <>
                              <Td>{row.periodLabel}</Td>
                              <Td className="text-right">{currency} {formatNumber(row.ppto)}</Td>
                              <Td className="text-right">{currency} {formatNumber(row.ejecutadoContable)}</Td>
                              <Td className={`text-right ${Number(row.provisiones || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {currency} {formatNumber(row.provisiones)}
                              </Td>
                              <Td className="text-right font-medium">{currency} {formatNumber(row.resultadoContable)}</Td>
                              <Td className={`text-right ${row.variacionAbs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {currency} {formatNumber(row.variacionAbs)}
                              </Td>
                            </>
                          )}
                          {mode === 'mixto' && (
                            <>
                              <Td>{row.periodLabel}</Td>
                              <Td className="text-right">{currency} {formatNumber(row.ppto)}</Td>
                              <Td className="text-right">{currency} {formatNumber(row.ejecutadoReal)}</Td>
                              <Td className="text-right">{currency} {formatNumber(row.resultadoContable)}</Td>
                              <Td className={`text-right ${Number(row.diferenciaRealContable || 0) >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                                {currency} {formatNumber(row.diferenciaRealContable)}
                              </Td>
                              <Td className="text-right font-semibold">{currency} {formatNumber(row.disponible)}</Td>
                            </>
                          )}
                        </tr>
                        {/* Fila expandida - Detalle jerárquico multinivel */}
                        {expandedRows.has(row.periodId) && mode === 'presupuestal' && (
                          <tr>
                            <Td colSpan={7} className="bg-slate-50 p-4">
                              <div className="text-sm">
                                <p className="font-medium mb-3 text-slate-700">Detalle por Paquete → Gerencia → Sustento → Facturas:</p>
                                {(() => {
                                  const packages = hierarchicalDetailsByPeriod.get(row.periodId) || [];
                                  if (packages.length === 0) {
                                    return <p className="italic text-slate-500">No hay datos para este período.</p>;
                                  }
                                  return (
                                    <div className="space-y-2">
                                      {packages.map((pkg) => {
                                        const pkgKey = `${row.periodId}-pkg-${pkg.packageId}`;
                                        const pkgDisponible = pkg.ppto - pkg.ejecutadoReal;
                                        const pkgPctEjecucion = pkg.ppto > 0 ? (pkg.ejecutadoReal / pkg.ppto) * 100 : 0;
                                        const isPkgExpanded = expandedPackages.has(pkgKey);
                                        
                                        return (
                                          <div key={pkgKey} className="border border-slate-300 rounded-lg">
                                            {/* NIVEL 1: Paquete */}
                                            <div 
                                              className="bg-blue-50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
                                              onClick={() => togglePackage(pkgKey)}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="text-blue-700">{isPkgExpanded ? '▼' : '▶'}</span>
                                                <span className="font-semibold text-blue-900">📦 {pkg.packageName}</span>
                                              </div>
                                              <div className="flex gap-6 text-xs">
                                                <span>PPTO: {currency} {formatNumber(pkg.ppto)}</span>
                                                <span>Ejecutado: {currency} {formatNumber(pkg.ejecutadoReal)}</span>
                                                <span className={pkgDisponible < 0 ? 'text-red-600 font-semibold' : ''}>
                                                  Disponible: {currency} {formatNumber(pkgDisponible)}
                                                </span>
                                                <span className={pkgPctEjecucion > 100 ? 'text-red-600 font-semibold' : pkgPctEjecucion > 90 ? 'text-orange-600' : ''}>
                                                  {formatNumber(pkgPctEjecucion)}%
                                                </span>
                                              </div>
                                            </div>
                                            
                                            {/* NIVEL 2: Gerencias */}
                                            {isPkgExpanded && (
                                              <div className="p-2 space-y-2">
                                                {pkg.managements.map((mgmt) => {
                                                  const mgmtKey = `${pkgKey}-mgmt-${mgmt.managementId}`;
                                                  const mgmtDisponible = mgmt.ppto - mgmt.ejecutadoReal;
                                                  const mgmtPctEjecucion = mgmt.ppto > 0 ? (mgmt.ejecutadoReal / mgmt.ppto) * 100 : 0;
                                                  const isMgmtExpanded = expandedManagements.has(mgmtKey);
                                                  
                                                  return (
                                                    <div key={mgmtKey} className="border border-slate-200 rounded">
                                                      <div 
                                                        className="bg-green-50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors"
                                                        onClick={() => toggleManagement(mgmtKey)}
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-green-700 ml-4">{isMgmtExpanded ? '▼' : '▶'}</span>
                                                          <span className="font-medium text-green-900">🏢 {mgmt.managementName}</span>
                                                        </div>
                                                        <div className="flex gap-4 text-xs">
                                                          <span>PPTO: {currency} {formatNumber(mgmt.ppto)}</span>
                                                          <span>Ejecutado: {currency} {formatNumber(mgmt.ejecutadoReal)}</span>
                                                          <span className={mgmtDisponible < 0 ? 'text-red-600 font-semibold' : ''}>
                                                            Disponible: {currency} {formatNumber(mgmtDisponible)}
                                                          </span>
                                                          <span className={mgmtPctEjecucion > 100 ? 'text-red-600 font-semibold' : mgmtPctEjecucion > 90 ? 'text-orange-600' : ''}>
                                                            {formatNumber(mgmtPctEjecucion)}%
                                                          </span>
                                                        </div>
                                                      </div>
                                                      
                                                      {/* NIVEL 3: Sustentos */}
                                                      {isMgmtExpanded && (
                                                        <div className="p-2 space-y-1">
                                                          {mgmt.supports.map((support) => {
                                                            const supportKey = `${mgmtKey}-support-${support.supportId}`;
                                                            const supportDisponible = support.ppto - support.ejecutadoReal;
                                                            const supportPctEjecucion = support.ppto > 0 ? (support.ejecutadoReal / support.ppto) * 100 : 0;
                                                            const isSupportExpanded = expandedSupports.has(supportKey);
                                                            
                                                            return (
                                                              <div key={supportKey} className="border border-slate-100 rounded">
                                                                <div 
                                                                  className="bg-amber-50 px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
                                                                  onClick={() => toggleSupport(supportKey)}
                                                                >
                                                                  <div className="flex items-center gap-2">
                                                                    <span className="text-amber-700 ml-8">{isSupportExpanded ? '▼' : '▶'}</span>
                                                                    <span className="text-amber-900">📝 {support.supportCode} - {support.supportName}</span>
                                                                  </div>
                                                                  <div className="flex gap-3 text-xs">
                                                                    <span>PPTO: {currency} {formatNumber(support.ppto)}</span>
                                                                    <span>Ejecutado: {currency} {formatNumber(support.ejecutadoReal)}</span>
                                                                    <span className={supportDisponible < 0 ? 'text-red-600 font-semibold' : ''}>
                                                                      Disp: {currency} {formatNumber(supportDisponible)}
                                                                    </span>
                                                                    <span className={supportPctEjecucion > 100 ? 'text-red-600 font-semibold' : supportPctEjecucion > 90 ? 'text-orange-600' : ''}>
                                                                      {formatNumber(supportPctEjecucion)}%
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                                
                                                                {/* NIVEL 4: Facturas */}
                                                                {isSupportExpanded && support.invoices.length > 0 && (
                                                                  <div className="p-2">
                                                                    <table className="w-full text-xs">
                                                                      <thead className="bg-slate-100">
                                                                        <tr>
                                                                          <th className="text-left px-2 py-1">Serie-Nº</th>
                                                                          <th className="text-left px-2 py-1">Fecha</th>
                                                                          <th className="text-right px-2 py-1">Monto</th>
                                                                          <th className="text-left px-2 py-1">Moneda</th>
                                                                          <th className="text-left px-2 py-1">CECOs</th>
                                                                          <th className="text-left px-2 py-1">Estado</th>
                                                                        </tr>
                                                                      </thead>
                                                                      <tbody>
                                                                        {support.invoices.map((inv) => (
                                                                          <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                                                                            <td className="px-2 py-1 text-slate-700">{inv.numeroFactura}</td>
                                                                            <td className="px-2 py-1 text-slate-600">{inv.fecha ? new Date(inv.fecha).toLocaleDateString('es-PE') : 'N/A'}</td>
                                                                            <td className="text-right px-2 py-1 font-medium">{currency} {formatNumber(inv.monto)}</td>
                                                                            <td className="px-2 py-1">{inv.moneda}</td>
                                                                            <td className="px-2 py-1 text-slate-600 text-xs">{inv.cecos}</td>
                                                                            <td className="px-2 py-1">
                                                                              <span className={`px-2 py-0.5 rounded text-xs ${
                                                                                inv.estado === 'CONTABILIZADO' ? 'bg-green-100 text-green-700' :
                                                                                inv.estado === 'PROCESADO' ? 'bg-blue-100 text-blue-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                              }`}>
                                                                                {inv.estado}
                                                                              </span>
                                                                            </td>
                                                                          </tr>
                                                                        ))}
                                                                      </tbody>
                                                                    </table>
                                                                  </div>
                                                                )}
                                                                {isSupportExpanded && support.invoices.length === 0 && (
                                                                  <div className="p-2 text-xs text-slate-500 italic ml-12">
                                                                    Sin facturas registradas
                                                                  </div>
                                                                )}
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            </Td>
                          </tr>
                        )}
                        {expandedRows.has(row.periodId) && mode !== 'presupuestal' && (
                          <tr>
                            <Td colSpan={7} className="bg-slate-50 p-4">
                              <div className="text-sm text-slate-600">
                                <p className="italic">Detalle disponible solo en modo PRESUPUESTAL.</p>
                              </div>
                            </Td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {/* Fila de totales */}
                    <tr className="border-t-2 border-slate-300 font-bold bg-slate-100">
                      <Td></Td>
                      {mode === 'presupuestal' && (
                        <>
                          <Td>TOTALES</Td>
                          <Td className="text-right">{currency} {formatNumber(totals.ppto)}</Td>
                          <Td className="text-right">{currency} {formatNumber(totals.ejecutadoReal)}</Td>
                          <Td className={`text-right ${totals.variacionAbs >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {currency} {formatNumber(totals.variacionAbs)}
                          </Td>
                          <Td className="text-right">
                            {totals.ppto > 0 ? formatNumber((totals.variacionAbs / totals.ppto) * 100) : '0.00'}%
                          </Td>
                          <Td className="text-right">{currency} {formatNumber(totals.disponible)}</Td>
                        </>
                      )}
                      {mode === 'contable' && (
                        <>
                          <Td>TOTALES</Td>
                          <Td className="text-right">{currency} {formatNumber(totals.ppto)}</Td>
                          <Td className="text-right">{currency} {formatNumber(totals.ejecutadoContable)}</Td>
                          <Td className={`text-right ${totals.provisiones >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {currency} {formatNumber(totals.provisiones)}
                          </Td>
                          <Td className="text-right">{currency} {formatNumber(totals.resultadoContable)}</Td>
                          <Td className={`text-right ${totals.variacionAbs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {currency} {formatNumber(totals.variacionAbs)}
                          </Td>
                        </>
                      )}
                      {mode === 'mixto' && (
                        <>
                          <Td>TOTALES</Td>
                          <Td className="text-right">{currency} {formatNumber(totals.ppto)}</Td>
                          <Td className="text-right">{currency} {formatNumber(totals.ejecutadoReal)}</Td>
                          <Td className="text-right">{currency} {formatNumber(totals.resultadoContable)}</Td>
                          <Td className={`text-right ${totals.diferenciaRealContable >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                            {currency} {formatNumber(totals.diferenciaRealContable)}
                          </Td>
                          <Td className="text-right">{currency} {formatNumber(totals.disponible)}</Td>
                        </>
                      )}
                    </tr>
                  </>
                )}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Leyenda de colores */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span>Sobregasto / Provisión positiva</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span>Ahorro / Liberación</span>
            </div>
            {mode === 'mixto' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-600 rounded"></div>
                  <span>Diferencia Real {'>'} Contable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span>Diferencia Contable {'>'} Real</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
