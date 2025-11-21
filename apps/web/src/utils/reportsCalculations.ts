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
  managementId?: number | null;
  areaId?: number | null;
  packageId?: number | null;
  supportId?: number | null;
  costCenterId?: number | null;
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
 */
function matchesFilters(
  support: { managementId?: number; areaId?: number; expensePackageId?: number; id: number } | undefined,
  filters: Filters
): boolean {
  if (!support) return true; // Si no hay support, no filtrar
  
  if (filters.supportId && support.id !== filters.supportId) return false;
  if (filters.managementId && support.managementId !== filters.managementId) return false;
  if (filters.areaId && support.areaId !== filters.areaId) return false;
  if (filters.packageId && support.expensePackageId !== filters.packageId) return false;
  
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
    if (filters.costCenterId && alloc.costCenterId !== filters.costCenterId) return;
    
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
    
    // PPTO asociado: sumar PPTO de los períodos de esta factura
    const periodIds = inv.periods?.map(p => p.periodId) || [];
    periodIds.forEach(periodId => {
      budgetAllocations.forEach(alloc => {
        if (alloc.periodId === periodId) {
          if (!matchesFilters(alloc.support, filters)) return;
          if (filters.costCenterId && alloc.costCenterId !== filters.costCenterId) return;
          row.pptoAsociado += alloc.amountPen / periodIds.length; // Distribuir proporcionalmente
        }
      });
    });
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
    
    // PPTO asociado de la provisión: usar el periodoPpto
    const periodoPptoData = parsePeriodString(prov.periodoPpto);
    if (periodoPptoData) {
      const period = periods.find(p => p.year === periodoPptoData.year && p.month === periodoPptoData.month);
      if (period) {
        budgetAllocations.forEach(alloc => {
          if (alloc.periodId === period.id) {
            if (!matchesFilters(alloc.support, filters)) return;
            if (alloc.supportId === prov.sustentoId) {
              row.pptoAsociado += alloc.amountPen; // TODO: revisar si esto es correcto
            }
          }
        });
      }
    }
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

