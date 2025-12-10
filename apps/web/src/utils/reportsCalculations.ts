/**
 * CÁLCULOS Y AGREGACIONES PARA REPORTES
 * 
 * Funciones para procesar datos de PPTO, Facturas y Provisiones
 * y generar las vistas presupuestal, contable y mixta.
 * 
 * REGLAS DE NEGOCIO:
 * - Provisiones y contabilidad siempre en PEN
 * - Facturas pueden estar en USD o PEN
 * - Para USD: usar tcReal si existe y mesContable está definido, sino tcEstandar
 * - montoPen = montoPEN_tcReal ?? montoPEN_tcEstandar ?? (montoSinIgv * tcReal ?? tcEstandar)
 */

type Period = {
  id: number;
  year: number;
  month: number;
  label?: string;
};

type Invoice = {
  id: number;
  ocId: number | null;
  currency: string;
  montoSinIgv: number | null;
  exchangeRateOverride: number | null;
  mesContable: string | null;
  tcEstandar: number | null;
  tcReal: number | null;
  montoPEN_tcEstandar: number | null;
  montoPEN_tcReal: number | null;
  periods?: { periodId: number; period: { id: number; year: number; month: number } }[];
  costCenters?: { costCenterId: number; amount?: number; percentage?: number }[];
  oc: {
    support: {
      id: number;
      managementId?: number;
      areaId?: number;
      expensePackageId?: number;
    };
  } | null;
};

type Provision = {
  id: number;
  sustentoId: number;
  periodoPpto: string; // YYYY-MM
  periodoContable: string; // YYYY-MM
  montoPen: number; // positivo = provisión, negativo = liberación
  sustento: {
    id: number;
    managementId?: number;
    areaId?: number;
    expensePackageId?: number;
  };
};

type BudgetAllocation = {
  supportId: number;
  costCenterId: number;
  periodId: number;
  amountPen: number;
  support?: {
    id: number;
    managementId?: number;
    areaId?: number;
    expensePackageId?: number;
  };
};

type Filters = {
  managementIds?: number[];
  areaIds?: number[];
  packageIds?: number[];
  supportIds?: number[];
  costCenterIds?: number[];
};

/**
 * Obtiene el monto en PEN de una factura según reglas contables
 */
export function getInvoiceAmountPEN(invoice: Invoice): number {
  // Si tiene montoPEN_tcReal (procesado contablemente), usar ese
  if (invoice.montoPEN_tcReal !== null && invoice.montoPEN_tcReal !== undefined) {
    return invoice.montoPEN_tcReal;
  }
  
  // Si tiene montoPEN_tcEstandar, usar ese
  if (invoice.montoPEN_tcEstandar !== null && invoice.montoPEN_tcEstandar !== undefined) {
    return invoice.montoPEN_tcEstandar;
  }
  
  // Calcular manualmente
  const amount = invoice.montoSinIgv || 0;
  if (invoice.currency === 'PEN') {
    return amount;
  }
  
  // USD: usar tcReal si existe y hay mes contable, sino tcEstandar
  const tc = (invoice.mesContable && invoice.tcReal) ? invoice.tcReal : (invoice.tcEstandar || 1);
  return amount * tc;
}

/**
 * Parsea un string YYYY-MM a { year, month }
 */
function parsePeriodString(periodStr: string): { year: number; month: number } | null {
  const match = periodStr.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return { year: parseInt(match[1]), month: parseInt(match[2]) };
}

/**
 * Aplica filtros a un registro con support/sustento
 * Ahora soporta arrays de IDs para multi-select
 */
function matchesFilters(
  support: { managementId?: number; areaId?: number; expensePackageId?: number; id: number } | undefined,
  filters: Filters
): boolean {
  if (!support) return true; // Si no hay support, no filtrar
  
  // Filtro por supportIds (array)
  if (filters.supportIds && filters.supportIds.length > 0 && !filters.supportIds.includes(support.id)) {
    return false;
  }
  
  // Filtro por managementIds (array)
  if (filters.managementIds && filters.managementIds.length > 0 && support.managementId) {
    if (!filters.managementIds.includes(support.managementId)) return false;
  } else if (filters.managementIds && filters.managementIds.length > 0 && !support.managementId) {
    return false;
  }
  
  // Filtro por areaIds (array)
  if (filters.areaIds && filters.areaIds.length > 0 && support.areaId) {
    if (!filters.areaIds.includes(support.areaId)) return false;
  } else if (filters.areaIds && filters.areaIds.length > 0 && !support.areaId) {
    return false;
  }
  
  // Filtro por packageIds (array)
  if (filters.packageIds && filters.packageIds.length > 0 && support.expensePackageId) {
    if (!filters.packageIds.includes(support.expensePackageId)) return false;
  } else if (filters.packageIds && filters.packageIds.length > 0 && !support.expensePackageId) {
    return false;
  }
  
  return true;
}

/**
 * MODO PRESUPUESTAL
 * Agrupa por período PPTO y calcula PPTO vs Ejecutado Real
 */
export function calculatePresupuestalReport(
  budgetAllocations: BudgetAllocation[],
  invoices: Invoice[],
  periods: Period[],
  filters: Filters
): Map<number, {
  periodId: number;
  ppto: number;
  ejecutadoReal: number;
}> {
  const result = new Map<number, { periodId: number; ppto: number; ejecutadoReal: number }>();
  
  // Inicializar con períodos
  periods.forEach(p => {
    result.set(p.id, { periodId: p.id, ppto: 0, ejecutadoReal: 0 });
  });
  
  // Sumar PPTO
  budgetAllocations.forEach(alloc => {
    if (!matchesFilters(alloc.support, filters)) return;
    // Filtro por costCenterIds (array)
    if (filters.costCenterIds && filters.costCenterIds.length > 0) {
      if (!filters.costCenterIds.includes(alloc.costCenterId)) return;
    }
    
    const row = result.get(alloc.periodId);
    if (row) {
      row.ppto += alloc.amountPen;
    }
  });
  
  // Sumar facturas (ejecutado real por períodos PPTO)
  invoices.forEach(inv => {
    if (!matchesFilters(inv.oc?.support, filters)) return;
    
    const amountPEN = getInvoiceAmountPEN(inv);
    const periodIds = inv.periods?.map(p => p.periodId) || [];
    
    if (periodIds.length === 0) return;
    
    // Distribuir el monto entre los períodos de la factura
    const amountPerPeriod = amountPEN / periodIds.length;
    
    periodIds.forEach(periodId => {
      const row = result.get(periodId);
      if (row) {
        row.ejecutadoReal += amountPerPeriod;
      }
    });
  });
  
  return result;
}

/**
 * MODO CONTABLE
 * Agrupa por mes contable y calcula Ejecutado Contable + Provisiones
 * 
 * REGLA DE NEGOCIO CRÍTICA:
 * - PPTO Asociado = PPTO del mes contable (no derivado de facturas/provisiones)
 * - Ejecutado Contable = facturas con mesContable definido
 * - Provisiones = provisiones con periodoContable definido
 * - Solo se muestran meses con registros contables reales (ejecutado > 0 o provisiones !== 0)
 */
export function calculateContableReport(
  budgetAllocations: BudgetAllocation[],
  invoices: Invoice[],
  provisions: Provision[],
  periods: Period[],
  filters: Filters
): Map<string, {
  mesContable: string;
  pptoAsociado: number;
  ejecutadoContable: number;
  provisiones: number;
}> {
  const result = new Map<string, {
    mesContable: string;
    pptoAsociado: number;
    ejecutadoContable: number;
    provisiones: number;
  }>();
  
  // 1. Sumar facturas por mes contable
  invoices.forEach(inv => {
    if (!inv.mesContable) return; // Solo facturas con mes contable
    if (!matchesFilters(inv.oc?.support, filters)) return;
    
    const mesContable = inv.mesContable; // ya está en formato YYYY-MM
    const amountPEN = getInvoiceAmountPEN(inv);
    
    if (!result.has(mesContable)) {
      result.set(mesContable, {
        mesContable,
        pptoAsociado: 0,
        ejecutadoContable: 0,
        provisiones: 0
      });
    }
    
    const row = result.get(mesContable)!;
    row.ejecutadoContable += amountPEN;
  });
  
  // 2. Sumar provisiones por período contable
  provisions.forEach(prov => {
    if (!matchesFilters(prov.sustento, filters)) return;
    
    const mesContable = prov.periodoContable;
    
    if (!result.has(mesContable)) {
      result.set(mesContable, {
        mesContable,
        pptoAsociado: 0,
        ejecutadoContable: 0,
        provisiones: 0
      });
    }
    
    const row = result.get(mesContable)!;
    row.provisiones += prov.montoPen; // Ya viene con signo correcto
  });
  
  // 3. Calcular PPTO Asociado para cada mes contable
  // IMPORTANTE: El PPTO es el del MES CONTABLE, no derivado de facturas/provisiones
  result.forEach((row, mesContable) => {
    const mesContableData = parsePeriodString(mesContable);
    if (!mesContableData) return;
    
    // Buscar el periodo correspondiente al mes contable
    const period = periods.find(p => p.year === mesContableData.year && p.month === mesContableData.month);
    if (!period) return;
    
    // Sumar todo el PPTO de ese mes con los filtros aplicados
    budgetAllocations.forEach(alloc => {
      if (alloc.periodId !== period.id) return;
      if (!matchesFilters(alloc.support, filters)) return;
      // Filtro por costCenterIds (array)
      if (filters.costCenterIds && filters.costCenterIds.length > 0) {
        if (!filters.costCenterIds.includes(alloc.costCenterId)) return;
      }
      
      row.pptoAsociado += alloc.amountPen;
    });
  });
  
  return result;
}

/**
 * MODO MIXTO
 * Combina visión presupuestal (ejecutado real) con contable por período PPTO
 */
export function calculateMixtoReport(
  budgetAllocations: BudgetAllocation[],
  invoices: Invoice[],
  provisions: Provision[],
  periods: Period[],
  filters: Filters
): Map<number, {
  periodId: number;
  ppto: number;
  ejecutadoReal: number;
  resultadoContable: number;
}> {
  const result = new Map<number, {
    periodId: number;
    ppto: number;
    ejecutadoReal: number;
    resultadoContable: number;
  }>();
  
  // Inicializar con datos presupuestales
  const presupuestal = calculatePresupuestalReport(budgetAllocations, invoices, periods, filters);
  presupuestal.forEach((data, periodId) => {
    result.set(periodId, { ...data, resultadoContable: 0 });
  });
  
  // Agregar resultado contable (facturas con mes contable + provisiones) mapeado a períodos PPTO
  invoices.forEach(inv => {
    if (!inv.mesContable) return;
    if (!matchesFilters(inv.oc?.support, filters)) return;
    
    const amountPEN = getInvoiceAmountPEN(inv);
    const periodIds = inv.periods?.map(p => p.periodId) || [];
    
    if (periodIds.length === 0) return;
    
    const amountPerPeriod = amountPEN / periodIds.length;
    
    periodIds.forEach(periodId => {
      const row = result.get(periodId);
      if (row) {
        row.resultadoContable += amountPerPeriod;
      }
    });
  });
  
  // Agregar provisiones mapeadas a su período PPTO
  provisions.forEach(prov => {
    if (!matchesFilters(prov.sustento, filters)) return;
    
    const periodoPptoData = parsePeriodString(prov.periodoPpto);
    if (!periodoPptoData) return;
    
    const period = periods.find(p => p.year === periodoPptoData.year && p.month === periodoPptoData.month);
    if (!period) return;
    
    const row = result.get(period.id);
    if (row) {
      row.resultadoContable += prov.montoPen;
    }
  });
  
  return result;
}

/**
 * Filtra períodos por rango
 */
export function filterPeriodsByRange(
  periods: Period[],
  fromId: number | null,
  toId: number | null
): Period[] {
  if (!fromId && !toId) return periods;
  
  return periods.filter(p => {
    if (fromId && toId) {
      const from = periods.find(x => x.id === fromId);
      const to = periods.find(x => x.id === toId);
      if (!from || !to) return true;
      
      const pValue = p.year * 100 + p.month;
      const fromValue = from.year * 100 + from.month;
      const toValue = to.year * 100 + to.month;
      
      return pValue >= fromValue && pValue <= toValue;
    }
    
    if (fromId) {
      const from = periods.find(x => x.id === fromId);
      if (!from) return true;
      const pValue = p.year * 100 + p.month;
      const fromValue = from.year * 100 + from.month;
      return pValue >= fromValue;
    }
    
    if (toId) {
      const to = periods.find(x => x.id === toId);
      if (!to) return true;
      const pValue = p.year * 100 + p.month;
      const toValue = to.year * 100 + to.month;
      return pValue <= toValue;
    }
    
    return true;
  });
}
