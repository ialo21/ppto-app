import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
import { formatPeriodLabel } from "../utils/periodFormat";
import {
  calculatePresupuestalReport,
  calculateContableReport,
  calculateMixtoReport,
  filterPeriodsByRange
} from "../utils/reportsCalculations";

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
 * - Toggle "Solo con desviación" (umbral fijo 5%)
 */

type ReportMode = 'presupuestal' | 'contable' | 'mixto';

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

// Helper para formatear números de forma segura
function formatNumber(value: any): string {
  const num = Number(value ?? 0);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

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
    queryKey: ["packages"],
    queryFn: async () => (await api.get("/packages")).data
  });

  const { data: supports } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data
  });

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data
  });

  // Estados de filtros
  // NOTA: Se declaran antes de las queries que los utilizan para evitar "Cannot access before initialization"
  const [mode, setMode] = useState<ReportMode>('presupuestal');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [periodFromId, setPeriodFromId] = useState<number | null>(null);
  const [periodToId, setPeriodToId] = useState<number | null>(null);
  const [managementId, setManagementId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");
  const [supportId, setSupportId] = useState<string>("");
  const [costCenterId, setCostCenterId] = useState<string>("");
  const [currency, setCurrency] = useState<string>("PEN");
  const [showOnlyDeviation, setShowOnlyDeviation] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

  // Áreas filtradas por gerencia
  const filteredAreas = useMemo(() => {
    if (!areas || !managementId) return areas || [];
    return areas.filter((a: any) => String(a.managementId) === managementId);
  }, [areas, managementId]);

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

  // Filtros para cálculos
  const calculationFilters = useMemo(() => ({
    managementId: managementId ? Number(managementId) : null,
    areaId: areaId ? Number(areaId) : null,
    packageId: packageId ? Number(packageId) : null,
    supportId: supportId ? Number(supportId) : null,
    costCenterId: costCenterId ? Number(costCenterId) : null
  }), [managementId, areaId, packageId, supportId, costCenterId]);

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
        // Parsear mesContable para poder ordenar
        const [year, month] = mesContable.split('-').map(Number);
        const period = filteredPeriods.find(p => p.year === year && p.month === month) || { id: 0, year, month };

        const resultadoContable = data.ejecutadoContable + data.provisiones;
        const variacionAbs = resultadoContable - data.pptoAsociado;
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

  // Filtrar filas con desviación si el toggle está activo
  const filteredData = useMemo(() => {
    if (!showOnlyDeviation) return reportData;
    const threshold = 5; // umbral 5%
    return reportData.filter(row => Math.abs(row.variacionPct) > threshold);
  }, [reportData, showOnlyDeviation]);

  // Detalle por paquete de gasto para cada período (modo PRESUPUESTAL)
  const packageDetailsByPeriod = useMemo(() => {
    if (mode !== 'presupuestal') return new Map<number, PackageDetail[]>();
    
    const detailMap = new Map<number, Map<number | null, PackageDetail>>();
    
    // Agrupar budget allocations por período y paquete
    budgetAllocations.forEach(alloc => {
      if (!alloc.periodId) return;
      
      // Aplicar filtros
      if (calculationFilters.managementId && alloc.support?.managementId !== calculationFilters.managementId) return;
      if (calculationFilters.areaId && alloc.support?.areaId !== calculationFilters.areaId) return;
      if (calculationFilters.packageId && alloc.expensePackageId !== calculationFilters.packageId) return;
      if (calculationFilters.supportId && alloc.supportId !== calculationFilters.supportId) return;
      if (calculationFilters.costCenterId && alloc.costCenterId !== calculationFilters.costCenterId) return;
      
      if (!detailMap.has(alloc.periodId)) {
        detailMap.set(alloc.periodId, new Map());
      }
      
      const periodMap = detailMap.get(alloc.periodId)!;
      const packageId = alloc.expensePackageId ?? null;
      const packageName = alloc.expensePackageName || 'Sin paquete';
      
      if (!periodMap.has(packageId)) {
        periodMap.set(packageId, {
          packageId,
          packageName,
          ppto: 0,
          ejecutadoReal: 0
        });
      }
      
      const pkg = periodMap.get(packageId)!;
      pkg.ppto += Number(alloc.amountPen || 0);
    });
    
    // Agregar facturas (ejecutado) al detalle por paquete
    invoices.forEach(inv => {
      const periodIds = inv.periods?.map(p => p.periodId) || [];
      if (periodIds.length === 0) return;
      
      // Aplicar filtros
      const support = inv.oc?.support;
      if (!support) return;
      if (calculationFilters.managementId && support.managementId !== calculationFilters.managementId) return;
      if (calculationFilters.areaId && support.areaId !== calculationFilters.areaId) return;
      if (calculationFilters.packageId && support.expensePackageId !== calculationFilters.packageId) return;
      if (calculationFilters.supportId && support.id !== calculationFilters.supportId) return;
      
      const amountPEN = Number(inv.montoPEN_tcReal ?? inv.montoPEN_tcEstandar ?? 0);
      const amountPerPeriod = amountPEN / periodIds.length;
      
      periodIds.forEach(periodId => {
        if (!detailMap.has(periodId)) {
          detailMap.set(periodId, new Map());
        }
        
        const periodMap = detailMap.get(periodId)!;
        const packageId = support.expensePackageId ?? null;
        const packageName = support.expensePackage?.name || 'Sin paquete';
        
        if (!periodMap.has(packageId)) {
          periodMap.set(packageId, {
            packageId,
            packageName,
            ppto: 0,
            ejecutadoReal: 0
          });
        }
        
        const pkg = periodMap.get(packageId)!;
        pkg.ejecutadoReal += amountPerPeriod;
      });
    });
    
    // Convertir a Map<periodId, PackageDetail[]>
    const result = new Map<number, PackageDetail[]>();
    detailMap.forEach((packageMap, periodId) => {
      const packages = Array.from(packageMap.values());
      packages.sort((a, b) => b.ppto - a.ppto); // Ordenar por PPTO desc
      result.set(periodId, packages);
    });
    
    return result;
  }, [mode, budgetAllocations, invoices, calculationFilters]);

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

  // Función para expandir/colapsar filas
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
          formatNumber(row.ppto),
          formatNumber(row.ejecutadoReal),
          formatNumber(row.variacionAbs),
          formatNumber(row.variacionPct) + '%',
          formatNumber(row.disponible)
        ];
      } else if (mode === 'contable') {
        return [
          row.periodLabel,
          formatNumber(row.ppto),
          formatNumber(row.ejecutadoContable),
          formatNumber(row.provisiones),
          formatNumber(row.resultadoContable),
          formatNumber(row.variacionAbs)
        ];
      } else {
        return [
          row.periodLabel,
          formatNumber(row.ppto),
          formatNumber(row.ejecutadoReal),
          formatNumber(row.resultadoContable),
          formatNumber(row.diferenciaRealContable),
          formatNumber(row.disponible)
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

  // Exportación CSV - Detalle
  const exportCSVDetalle = useCallback(() => {
    // TODO: Implementar exportación detallada con llamada al backend
    // Por ahora, placeholder
    const headers = ['Mes', 'Sustento', 'CECO', 'Tipo', 'Monto', 'Detalle'];
    const csv = [headers.join(','), '(Detalle pendiente de implementar)'].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${mode}_${year}_detalle.csv`;
    link.click();
  }, [mode, year]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reportes</h1>
      </div>

      {/* Filtros Superiores */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Filtros y Configuración</h2>
        </CardHeader>
        <CardContent>
          {/* Fila 1: Año y Modo */}
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Año *</label>
              <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Modo de Reporte *</label>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'presupuestal' ? 'primary' : 'secondary'}
                  onClick={() => setMode('presupuestal')}
                  className="flex-1"
                >
                  Presupuestal
                </Button>
                <Button
                  variant={mode === 'contable' ? 'primary' : 'secondary'}
                  onClick={() => setMode('contable')}
                  className="flex-1"
                >
                  Contable
                </Button>
                <Button
                  variant={mode === 'mixto' ? 'primary' : 'secondary'}
                  onClick={() => setMode('mixto')}
                  className="flex-1"
                >
                  Mixto
                </Button>
              </div>
            </div>
          </div>

          {/* Fila 2: Filtros de catálogos */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Gerencia</label>
              <Select value={managementId} onChange={(e) => {
                setManagementId(e.target.value);
                setAreaId(""); // Reset área
              }}>
                <option value="">Todas</option>
                {(managements || []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Área</label>
              <Select value={areaId} onChange={(e) => setAreaId(e.target.value)} disabled={!managementId}>
                <option value="">Todas</option>
                {filteredAreas.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Paquete de Gasto</label>
              <Select value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                <option value="">Todos</option>
                {(packages || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Fila 3: Sustento, CECO, Moneda */}
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sustento</label>
              <Select value={supportId} onChange={(e) => setSupportId(e.target.value)}>
                <option value="">Todos</option>
                {(supports || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.code ? `${s.code} - ` : ""}{s.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Centro de Costo</label>
              <Select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
                <option value="">Todos</option>
                {(costCenters || []).map((cc: any) => (
                  <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Moneda</label>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="PEN">Soles (PEN)</option>
                <option value="USD">Dólares (USD)</option>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={showOnlyDeviation}
                  onChange={(e) => setShowOnlyDeviation(e.target.checked)}
                  className="rounded"
                />
                Solo con desviación {'>'} 5%
              </label>
            </div>
          </div>

          {/* Fila 4: Rango de períodos (según modo) */}
          {mode !== 'mixto' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {mode === 'presupuestal' ? 'Período Desde' : 'Mes Contable Desde'}
                </label>
                <Select value={periodFromId || ""} onChange={(e) => setPeriodFromId(Number(e.target.value) || null)}>
                  <option value="">Todos los meses</option>
                  {yearPeriods.map(p => (
                    <option key={p.id} value={p.id}>{formatPeriodLabel(p)}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {mode === 'presupuestal' ? 'Período Hasta' : 'Mes Contable Hasta'}
                </label>
                <Select value={periodToId || ""} onChange={(e) => setPeriodToId(Number(e.target.value) || null)}>
                  <option value="">Todos los meses</option>
                  {yearPeriods.map(p => (
                    <option key={p.id} value={p.id}>{formatPeriodLabel(p)}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
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
                              <Td className={`text-right ${row.variacionAbs >= 0 ? 'text-red-600' : 'text-green-600'}`}>
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
                        {/* Fila expandida - Detalle por paquete de gasto */}
                        {expandedRows.has(row.periodId) && mode === 'presupuestal' && (
                          <tr>
                            <Td colSpan={7} className="bg-slate-50 p-4">
                              <div className="text-sm">
                                <p className="font-medium mb-3 text-slate-700">Detalle por Paquete de Gasto:</p>
                                {(() => {
                                  const packages = packageDetailsByPeriod.get(row.periodId) || [];
                                  if (packages.length === 0) {
                                    return <p className="italic text-slate-500">No hay datos para este período.</p>;
                                  }
                                  return (
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-100">
                                        <tr>
                                          <th className="text-left px-3 py-2">Paquete de Gasto</th>
                                          <th className="text-right px-3 py-2">PPTO</th>
                                          <th className="text-right px-3 py-2">Ejecutado Real</th>
                                          <th className="text-right px-3 py-2">Disponible</th>
                                          <th className="text-right px-3 py-2">% Ejecución</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {packages.map((pkg, idx) => {
                                          const disponible = pkg.ppto - pkg.ejecutadoReal;
                                          const pctEjecucion = pkg.ppto > 0 ? (pkg.ejecutadoReal / pkg.ppto) * 100 : 0;
                                          return (
                                            <tr key={pkg.packageId ?? `null-${idx}`} className="border-t border-slate-200">
                                              <td className="px-3 py-2 text-slate-700">{pkg.packageName}</td>
                                              <td className="text-right px-3 py-2">{currency} {formatNumber(pkg.ppto)}</td>
                                              <td className="text-right px-3 py-2">{currency} {formatNumber(pkg.ejecutadoReal)}</td>
                                              <td className={`text-right px-3 py-2 ${disponible < 0 ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                                                {currency} {formatNumber(disponible)}
                                              </td>
                                              <td className={`text-right px-3 py-2 ${pctEjecucion > 100 ? 'text-red-600 font-semibold' : pctEjecucion > 90 ? 'text-orange-600' : 'text-slate-700'}`}>
                                                {formatNumber(pctEjecucion)}%
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
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
                          <Td className={`text-right ${totals.variacionAbs >= 0 ? 'text-red-600' : 'text-green-600'}`}>
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
