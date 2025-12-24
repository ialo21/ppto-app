import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Use lazy initialization to avoid blocking on import
let prisma: PrismaClient;

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

const MAX_RESULTS = 100;
const MAX_DATE_RANGE_MONTHS = 24;

function normalizeText(text: string): string {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export const toolSchemas = {
  searchSupports: z.object({
    query: z.string().min(1, "La consulta no puede estar vacía"),
    limit: z.number().int().min(1).max(MAX_RESULTS).optional().default(10)
  }),
  
  searchCostCenters: z.object({
    query: z.string().min(1, "La consulta no puede estar vacía"),
    limit: z.number().int().min(1).max(MAX_RESULTS).optional().default(10)
  }),
  
  getBudgetSummary: z.object({
    year: z.number().int().min(2020).max(2100),
    supportId: z.number().int().positive().optional(),
    costCenterId: z.number().int().positive().optional()
  }),
  
  getInvoicesSummary: z.object({
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12).optional(),
    supportId: z.number().int().positive().optional(),
    costCenterId: z.number().int().positive().optional(),
    providerId: z.number().int().positive().optional()
  }),
  
  getPurchaseOrdersSummary: z.object({
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12).optional(),
    supportId: z.number().int().positive().optional(),
    costCenterId: z.number().int().positive().optional(),
    status: z.string().optional()
  }),
  
  getTopSupports: z.object({
    year: z.number().int().min(2020).max(2100),
    metric: z.enum(["budget", "invoices", "ocs"]),
    limit: z.number().int().min(1).max(50).optional().default(10)
  }),
  
  getOcRequestStatusByIncidentId: z.object({
    incidentId: z.string().min(1, "El ID del incidente no puede estar vacío")
  }),
  
  getOcByNumber: z.object({
    ocNumber: z.string().min(1, "El número de OC no puede estar vacío")
  }),
  
  listInvoicesByOcNumber: z.object({
    ocNumber: z.string().min(1, "El número de OC no puede estar vacío")
  }),
  
  getInvoiceByNumber: z.object({
    invoiceNumber: z.string().min(1, "El número de factura no puede estar vacío"),
    year: z.number().int().min(2020).max(2100).optional()
  }),
  
  getBudgetBySupport: z.object({
    supportName: z.string().min(1, "El nombre de la línea de sustento no puede estar vacío"),
    year: z.number().int().min(2020).max(2100)
  })
};

export type ToolName = keyof typeof toolSchemas;

export const toolDefinitions = [
  {
    name: "searchSupports",
    description: "Busca líneas de sustento por texto usando fuzzy matching. Útil cuando el usuario menciona una línea o sustento por nombre o código.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Texto de búsqueda (nombre o código de la línea/sustento)"
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados (default: 10, max: 100)",
          default: 10
        }
      },
      required: ["query"]
    }
  },
  {
    name: "searchCostCenters",
    description: "Busca centros de costo (CECO) por código o nombre. Útil cuando el usuario menciona un CECO específico.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Texto de búsqueda (código o nombre del CECO)"
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados (default: 10, max: 100)",
          default: 10
        }
      },
      required: ["query"]
    }
  },
  {
    name: "getBudgetSummary",
    description: "Obtiene el resumen de presupuesto (PPTO) de la versión activa. Puede filtrar por línea de sustento y/o CECO. Agrupa por mes.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Año del presupuesto (ej: 2025)"
        },
        supportId: {
          type: "number",
          description: "ID de la línea de sustento (opcional, usar searchSupports primero para obtener el ID)"
        },
        costCenterId: {
          type: "number",
          description: "ID del centro de costo (opcional, usar searchCostCenters primero para obtener el ID)"
        }
      },
      required: ["year"]
    }
  },
  {
    name: "getInvoicesSummary",
    description: "Obtiene el resumen de facturas con filtros opcionales. Agrupa por mes si no se especifica mes concreto.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Año de las facturas"
        },
        month: {
          type: "number",
          description: "Mes específico (1-12, opcional)"
        },
        supportId: {
          type: "number",
          description: "ID de la línea de sustento (opcional)"
        },
        costCenterId: {
          type: "number",
          description: "ID del centro de costo (opcional)"
        },
        providerId: {
          type: "number",
          description: "ID del proveedor (opcional)"
        }
      },
      required: ["year"]
    }
  },
  {
    name: "getPurchaseOrdersSummary",
    description: "Obtiene el resumen de órdenes de compra (OC) con filtros opcionales. Agrupa por mes y estado.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Año de las órdenes de compra"
        },
        month: {
          type: "number",
          description: "Mes específico (1-12, opcional)"
        },
        supportId: {
          type: "number",
          description: "ID de la línea de sustento (opcional)"
        },
        costCenterId: {
          type: "number",
          description: "ID del centro de costo (opcional)"
        },
        status: {
          type: "string",
          description: "Estado de la OC (PENDIENTE, PROCESADO, etc., opcional)"
        }
      },
      required: ["year"]
    }
  },
  {
    name: "getTopSupports",
    description: "Obtiene las N líneas de sustento con mayor presupuesto, facturas u órdenes de compra en un año específico.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Año para el análisis"
        },
        metric: {
          type: "string",
          enum: ["budget", "invoices", "ocs"],
          description: "Métrica para el ranking: 'budget' (presupuesto), 'invoices' (facturas), 'ocs' (órdenes de compra)"
        },
        limit: {
          type: "number",
          description: "Número de líneas a retornar (default: 10, max: 50)",
          default: 10
        }
      },
      required: ["year", "metric"]
    }
  },
  {
    name: "getOcRequestStatusByIncidentId",
    description: "Obtiene el estado y detalle completo de una solicitud de OC por su número de incidente (INC). Retorna información del workflow, solicitante, y si ya existe N° de OC asociado.",
    parameters: {
      type: "object",
      properties: {
        incidentId: {
          type: "string",
          description: "Número de incidente (INC) de la solicitud, ej: INC12345 o 12345"
        }
      },
      required: ["incidentId"]
    }
  },
  {
    name: "getOcByNumber",
    description: "Obtiene el detalle completo de una Orden de Compra por su número (N° OC). Incluye estado, proveedor, montos, línea de sustento, CECOs, períodos presupuestales y más.",
    parameters: {
      type: "object",
      properties: {
        ocNumber: {
          type: "string",
          description: "Número de la OC, ej: 4500012345"
        }
      },
      required: ["ocNumber"]
    }
  },
  {
    name: "listInvoicesByOcNumber",
    description: "Lista todas las facturas asociadas a una OC por su número. Retorna número, estado, monto, moneda, fecha y proveedor de cada factura, más totales.",
    parameters: {
      type: "object",
      properties: {
        ocNumber: {
          type: "string",
          description: "Número de la OC para buscar facturas asociadas"
        }
      },
      required: ["ocNumber"]
    }
  },
  {
    name: "getInvoiceByNumber",
    description: "Obtiene el detalle completo de una factura por su número. Incluye estado, proveedor, montos, fechas y OC asociada si existe.",
    parameters: {
      type: "object",
      properties: {
        invoiceNumber: {
          type: "string",
          description: "Número de la factura (serie-correlativo), ej: F001-21424"
        },
        year: {
          type: "number",
          description: "Año de la factura (opcional, para desambiguar si hay múltiples)"
        }
      },
      required: ["invoiceNumber"]
    }
  },
  {
    name: "getBudgetBySupport",
    description: "Obtiene el presupuesto de una línea de sustento usando búsqueda fuzzy automática. Útil cuando el usuario pregunta directamente por el presupuesto de una línea usando lenguaje natural (ej: 'infraestructura', 'seguridad', 'servicios externos'). Esta herramienta busca automáticamente la línea más apropiada y retorna el presupuesto.",
    parameters: {
      type: "object",
      properties: {
        supportName: {
          type: "string",
          description: "Nombre o parte del nombre de la línea de sustento (ej: 'infraestructura', 'seguridad', 'servicios externos'). Acepta texto parcial, abreviaciones o con typos menores."
        },
        year: {
          type: "number",
          description: "Año del presupuesto (ej: 2025)"
        }
      },
      required: ["supportName", "year"]
    }
  }
];

export async function searchSupports(params: z.infer<typeof toolSchemas.searchSupports>) {
  const validated = toolSchemas.searchSupports.parse(params);
  
  const allSupports = await getPrisma().support.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true },
    take: 1000
  });

  if (allSupports.length === 0) {
    return { results: [], message: "No hay líneas de sustento activas en el sistema" };
  }

  const normalizedQuery = normalizeText(validated.query);
  
  interface SupportMatch {
    id: number;
    name: string;
    code: string | null;
    matchScore: number;
    matchType: "exact" | "startsWith" | "partial" | "fuzzy";
  }
  
  const matches: SupportMatch[] = [];

  for (const support of allSupports) {
    const normalizedName = normalizeText(support.name);
    const normalizedCode = support.code ? normalizeText(support.code) : "";

    if (normalizedName === normalizedQuery || normalizedCode === normalizedQuery) {
      matches.push({
        id: support.id,
        name: support.name,
        code: support.code,
        matchScore: 1000,
        matchType: "exact"
      });
      continue;
    }

    if (normalizedName.startsWith(normalizedQuery) || normalizedCode.startsWith(normalizedQuery)) {
      const nameScore = normalizedName.startsWith(normalizedQuery) ? 100 - (normalizedName.length - normalizedQuery.length) : 0;
      const codeScore = normalizedCode.startsWith(normalizedQuery) ? 100 - (normalizedCode.length - normalizedQuery.length) : 0;
      matches.push({
        id: support.id,
        name: support.name,
        code: support.code,
        matchScore: Math.max(nameScore, codeScore),
        matchType: "startsWith"
      });
      continue;
    }

    if (normalizedName.includes(normalizedQuery) || normalizedCode.includes(normalizedQuery)) {
      matches.push({
        id: support.id,
        name: support.name,
        code: support.code,
        matchScore: 50,
        matchType: "partial"
      });
      continue;
    }

    if (normalizedQuery.length >= 3) {
      const nameDistance = levenshteinDistance(normalizedQuery, normalizedName);
      const codeDistance = normalizedCode ? levenshteinDistance(normalizedQuery, normalizedCode) : Infinity;
      const minDistance = Math.min(nameDistance, codeDistance);
      
      const maxAllowedDistance = Math.max(2, Math.floor(normalizedQuery.length * 0.4));
      
      if (minDistance <= maxAllowedDistance) {
        const score = Math.max(0, 30 - minDistance * 5);
        matches.push({
          id: support.id,
          name: support.name,
          code: support.code,
          matchScore: score,
          matchType: "fuzzy"
        });
      }
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  const limitedMatches = matches.slice(0, validated.limit);
  
  return {
    results: limitedMatches.map(m => ({
      id: m.id,
      name: m.name,
      code: m.code,
      matchScore: m.matchScore,
      matchType: m.matchType
    })),
    totalFound: matches.length
  };
}

export async function searchCostCenters(params: z.infer<typeof toolSchemas.searchCostCenters>) {
  const validated = toolSchemas.searchCostCenters.parse(params);
  
  const allCostCenters = await getPrisma().costCenter.findMany({
    select: { id: true, code: true, name: true },
    take: 1000
  });

  if (allCostCenters.length === 0) {
    return { results: [], message: "No hay centros de costo en el sistema" };
  }

  const normalizedQuery = normalizeText(validated.query);
  
  interface CostCenterMatch {
    id: number;
    code: string;
    name: string | null;
    matchScore: number;
    matchType: "exact" | "startsWith" | "partial" | "fuzzy";
  }
  
  const matches: CostCenterMatch[] = [];

  for (const cc of allCostCenters) {
    const normalizedCode = normalizeText(cc.code);
    const normalizedName = cc.name ? normalizeText(cc.name) : "";

    if (normalizedCode === normalizedQuery || normalizedName === normalizedQuery) {
      matches.push({
        id: cc.id,
        code: cc.code,
        name: cc.name,
        matchScore: 1000,
        matchType: "exact"
      });
      continue;
    }

    if (normalizedCode.startsWith(normalizedQuery) || normalizedName.startsWith(normalizedQuery)) {
      const codeScore = normalizedCode.startsWith(normalizedQuery) ? 100 - (normalizedCode.length - normalizedQuery.length) : 0;
      const nameScore = normalizedName.startsWith(normalizedQuery) ? 100 - (normalizedName.length - normalizedQuery.length) : 0;
      matches.push({
        id: cc.id,
        code: cc.code,
        name: cc.name,
        matchScore: Math.max(codeScore, nameScore),
        matchType: "startsWith"
      });
      continue;
    }

    if (normalizedCode.includes(normalizedQuery) || normalizedName.includes(normalizedQuery)) {
      matches.push({
        id: cc.id,
        code: cc.code,
        name: cc.name,
        matchScore: 50,
        matchType: "partial"
      });
      continue;
    }

    if (normalizedQuery.length >= 3) {
      const codeDistance = levenshteinDistance(normalizedQuery, normalizedCode);
      const nameDistance = normalizedName ? levenshteinDistance(normalizedQuery, normalizedName) : Infinity;
      const minDistance = Math.min(codeDistance, nameDistance);
      
      const maxAllowedDistance = Math.max(2, Math.floor(normalizedQuery.length * 0.4));
      
      if (minDistance <= maxAllowedDistance) {
        const score = Math.max(0, 30 - minDistance * 5);
        matches.push({
          id: cc.id,
          code: cc.code,
          name: cc.name,
          matchScore: score,
          matchType: "fuzzy"
        });
      }
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  const limitedMatches = matches.slice(0, validated.limit);
  
  return {
    results: limitedMatches.map(m => ({
      id: m.id,
      code: m.code,
      name: m.name,
      matchScore: m.matchScore,
      matchType: m.matchType
    })),
    totalFound: matches.length
  };
}

export async function getBudgetSummary(params: z.infer<typeof toolSchemas.getBudgetSummary>) {
  const validated = toolSchemas.getBudgetSummary.parse(params);
  
  const version = await getPrisma().budgetVersion.findFirst({
    where: { status: "ACTIVE" }
  });

  if (!version) {
    return { error: "No hay versión de presupuesto activa en el sistema" };
  }

  const periods = await getPrisma().period.findMany({
    where: { year: validated.year },
    orderBy: { month: "asc" }
  });

  if (periods.length === 0) {
    return { error: `No hay períodos registrados para el año ${validated.year}` };
  }

  const whereClause: any = {
    versionId: version.id,
    periodId: { in: periods.map(p => p.id) }
  };

  if (validated.supportId) {
    whereClause.supportId = validated.supportId;
  }

  if (validated.costCenterId) {
    whereClause.costCenterId = validated.costCenterId;
  }

  const allocations = await getPrisma().budgetAllocation.findMany({
    where: whereClause,
    include: {
      period: true,
      support: { select: { id: true, name: true, code: true } },
      costCenter: { select: { id: true, code: true, name: true } }
    }
  });

  const monthlyData: { [key: number]: { month: number, amount: number } } = {};
  let totalAnnual = 0;

  periods.forEach(period => {
    const monthAllocations = allocations.filter(a => a.periodId === period.id);
    const monthTotal = monthAllocations.reduce(
      (sum, alloc) => sum + Number(alloc.amountLocal),
      0
    );
    
    monthlyData[period.month] = {
      month: period.month,
      amount: monthTotal
    };
    
    totalAnnual += monthTotal;
  });

  const monthlyArray = Object.values(monthlyData).filter(m => m.amount > 0);

  let support = null;
  let costCenter = null;

  if (validated.supportId && allocations.length > 0) {
    support = {
      id: allocations[0].support.id,
      name: allocations[0].support.name,
      code: allocations[0].support.code
    };
  }

  if (validated.costCenterId && allocations.length > 0 && allocations[0].costCenter) {
    costCenter = {
      id: allocations[0].costCenter.id,
      code: allocations[0].costCenter.code,
      name: allocations[0].costCenter.name
    };
  }

  return {
    year: validated.year,
    support,
    costCenter,
    currency: "PEN",
    totalAnnual,
    monthlyData: monthlyArray,
    versionId: version.id,
    versionName: version.name
  };
}

export async function getInvoicesSummary(params: z.infer<typeof toolSchemas.getInvoicesSummary>) {
  const validated = toolSchemas.getInvoicesSummary.parse(params);
  
  const periods = await getPrisma().period.findMany({
    where: {
      year: validated.year,
      ...(validated.month && { month: validated.month })
    },
    orderBy: { month: "asc" }
  });

  if (periods.length === 0) {
    return {
      filters: { year: validated.year, month: validated.month },
      currency: "PEN",
      totalAmount: 0,
      count: 0,
      message: `No hay períodos registrados para ${validated.month ? `${validated.year}-${validated.month}` : validated.year}`
    };
  }

  const periodIds = periods.map(p => p.id);

  const whereInvoice: any = {};
  
  if (validated.supportId) {
    whereInvoice.oc = {
      supportId: validated.supportId
    };
  }

  if (validated.providerId) {
    whereInvoice.vendorId = validated.providerId;
  }

  const invoicesWithPeriods = await getPrisma().invoice.findMany({
    where: {
      ...whereInvoice,
      periods: {
        some: {
          periodId: { in: periodIds }
        }
      }
    },
    include: {
      periods: {
        where: {
          periodId: { in: periodIds }
        },
        include: {
          period: true
        }
      },
      costCenters: validated.costCenterId ? {
        where: {
          costCenterId: validated.costCenterId
        }
      } : true,
      oc: {
        select: {
          id: true,
          supportId: true,
          support: { select: { id: true, name: true, code: true } }
        }
      }
    }
  });

  const filteredInvoices = validated.costCenterId
    ? invoicesWithPeriods.filter(inv => inv.costCenters.length > 0)
    : invoicesWithPeriods;

  let totalAmount = 0;
  const byStatus: { [key: string]: { count: number; amount: number } } = {};
  const byMonth: { [key: number]: { month: number; amount: number; count: number } } = {};

  for (const invoice of filteredInvoices) {
    const amount = Number(invoice.montoSinIgv || invoice.totalLocal || 0);
    totalAmount += amount;

    const status = invoice.statusCurrent;
    if (!byStatus[status]) {
      byStatus[status] = { count: 0, amount: 0 };
    }
    byStatus[status].count += 1;
    byStatus[status].amount += amount;

    if (!validated.month) {
      for (const ip of invoice.periods) {
        const month = ip.period.month;
        if (!byMonth[month]) {
          byMonth[month] = { month, amount: 0, count: 0 };
        }
        byMonth[month].amount += amount / invoice.periods.length;
        byMonth[month].count += 1;
      }
    }
  }

  return {
    filters: {
      year: validated.year,
      month: validated.month,
      supportId: validated.supportId,
      costCenterId: validated.costCenterId,
      providerId: validated.providerId
    },
    currency: "PEN",
    totalAmount,
    count: filteredInvoices.length,
    byStatus,
    ...((!validated.month && Object.keys(byMonth).length > 0) && {
      monthlyData: Object.values(byMonth).sort((a, b) => a.month - b.month)
    })
  };
}

export async function getPurchaseOrdersSummary(params: z.infer<typeof toolSchemas.getPurchaseOrdersSummary>) {
  const validated = toolSchemas.getPurchaseOrdersSummary.parse(params);
  
  const periods = await getPrisma().period.findMany({
    where: {
      year: validated.year,
      ...(validated.month && { month: validated.month })
    },
    orderBy: { month: "asc" }
  });

  if (periods.length === 0) {
    return {
      filters: { year: validated.year, month: validated.month },
      currency: "PEN",
      totalAmount: 0,
      count: 0,
      byStatus: {},
      message: `No hay períodos registrados para ${validated.month ? `${validated.year}-${validated.month}` : validated.year}`
    };
  }

  const periodIds = periods.map(p => p.id);

  const whereOC: any = {
    OR: [
      { budgetPeriodFromId: { in: periodIds } },
      { budgetPeriodToId: { in: periodIds } }
    ]
  };

  if (validated.supportId) {
    whereOC.supportId = validated.supportId;
  }

  if (validated.status) {
    whereOC.estado = validated.status;
  }

  const ocs = await getPrisma().oC.findMany({
    where: whereOC,
    include: {
      support: { select: { id: true, name: true, code: true } },
      budgetPeriodFrom: true,
      budgetPeriodTo: true,
      costCenters: validated.costCenterId ? {
        where: {
          costCenterId: validated.costCenterId
        }
      } : true
    }
  });

  const filteredOCs = validated.costCenterId
    ? ocs.filter(oc => oc.costCenters.length > 0)
    : ocs;

  let totalAmount = 0;
  const byStatus: { [key: string]: { count: number; amount: number } } = {};
  const byMonth: { [key: number]: { month: number; amount: number; count: number } } = {};

  for (const oc of filteredOCs) {
    const amount = Number(oc.importeSinIgv);
    totalAmount += amount;

    const status = oc.estado;
    if (!byStatus[status]) {
      byStatus[status] = { count: 0, amount: 0 };
    }
    byStatus[status].count += 1;
    byStatus[status].amount += amount;

    if (!validated.month) {
      const registrationMonth = oc.fechaRegistro.getMonth() + 1;
      const registrationYear = oc.fechaRegistro.getFullYear();
      
      if (registrationYear === validated.year) {
        if (!byMonth[registrationMonth]) {
          byMonth[registrationMonth] = { month: registrationMonth, amount: 0, count: 0 };
        }
        byMonth[registrationMonth].amount += amount;
        byMonth[registrationMonth].count += 1;
      }
    }
  }

  return {
    filters: {
      year: validated.year,
      month: validated.month,
      supportId: validated.supportId,
      costCenterId: validated.costCenterId,
      status: validated.status
    },
    currency: "PEN",
    totalAmount,
    count: filteredOCs.length,
    byStatus,
    ...((!validated.month && Object.keys(byMonth).length > 0) && {
      monthlyData: Object.values(byMonth).sort((a, b) => a.month - b.month)
    })
  };
}

export async function getTopSupports(params: z.infer<typeof toolSchemas.getTopSupports>) {
  const validated = toolSchemas.getTopSupports.parse(params);
  
  const periods = await getPrisma().period.findMany({
    where: { year: validated.year },
    select: { id: true }
  });

  if (periods.length === 0) {
    return {
      year: validated.year,
      metric: validated.metric,
      results: [],
      message: `No hay períodos registrados para el año ${validated.year}`
    };
  }

  const periodIds = periods.map(p => p.id);

  let topSupports: Array<{ supportId: number; supportName: string; supportCode: string | null; amount: number }> = [];

  if (validated.metric === "budget") {
    const version = await getPrisma().budgetVersion.findFirst({
      where: { status: "ACTIVE" }
    });

    if (!version) {
      return {
        year: validated.year,
        metric: validated.metric,
        results: [],
        message: "No hay versión de presupuesto activa"
      };
    }

    const allocations = await getPrisma().budgetAllocation.findMany({
      where: {
        versionId: version.id,
        periodId: { in: periodIds }
      },
      include: {
        support: { select: { id: true, name: true, code: true } }
      }
    });

    const supportTotals = new Map<number, { name: string; code: string | null; amount: number }>();

    for (const alloc of allocations) {
      const amount = Number(alloc.amountLocal);
      const existing = supportTotals.get(alloc.supportId);
      if (existing) {
        existing.amount += amount;
      } else {
        supportTotals.set(alloc.supportId, {
          name: alloc.support.name,
          code: alloc.support.code,
          amount
        });
      }
    }

    topSupports = Array.from(supportTotals.entries())
      .map(([id, data]) => ({
        supportId: id,
        supportName: data.name,
        supportCode: data.code,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, validated.limit);

  } else if (validated.metric === "invoices") {
    const invoices = await getPrisma().invoice.findMany({
      where: {
        periods: {
          some: {
            periodId: { in: periodIds }
          }
        },
        ocId: { not: null }
      },
      include: {
        oc: {
          select: {
            supportId: true,
            support: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });

    const supportTotals = new Map<number, { name: string; code: string | null; amount: number }>();

    for (const invoice of invoices) {
      if (invoice.oc) {
        const amount = Number(invoice.montoSinIgv || invoice.totalLocal || 0);
        const supportId = invoice.oc.supportId;
        const existing = supportTotals.get(supportId);
        if (existing) {
          existing.amount += amount;
        } else {
          supportTotals.set(supportId, {
            name: invoice.oc.support.name,
            code: invoice.oc.support.code,
            amount
          });
        }
      }
    }

    topSupports = Array.from(supportTotals.entries())
      .map(([id, data]) => ({
        supportId: id,
        supportName: data.name,
        supportCode: data.code,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, validated.limit);

  } else if (validated.metric === "ocs") {
    const ocs = await getPrisma().oC.findMany({
      where: {
        OR: [
          { budgetPeriodFromId: { in: periodIds } },
          { budgetPeriodToId: { in: periodIds } }
        ]
      },
      include: {
        support: { select: { id: true, name: true, code: true } }
      }
    });

    const supportTotals = new Map<number, { name: string; code: string | null; amount: number }>();

    for (const oc of ocs) {
      const amount = Number(oc.importeSinIgv);
      const supportId = oc.supportId;
      const existing = supportTotals.get(supportId);
      if (existing) {
        existing.amount += amount;
      } else {
        supportTotals.set(supportId, {
          name: oc.support.name,
          code: oc.support.code,
          amount
        });
      }
    }

    topSupports = Array.from(supportTotals.entries())
      .map(([id, data]) => ({
        supportId: id,
        supportName: data.name,
        supportCode: data.code,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, validated.limit);
  }

  return {
    year: validated.year,
    metric: validated.metric,
    results: topSupports
  };
}

function extractIncidentVariants(input: string): string[] {
  const cleaned = input.toUpperCase().replace(/\s+/g, "");
  const digitsOnly = cleaned.replace(/\D/g, "");
  
  const variants = new Set<string>();
  
  variants.add(cleaned);
  variants.add(input.trim());
  
  if (digitsOnly) {
    variants.add(digitsOnly);
    variants.add(`INC${digitsOnly}`);
    variants.add(`INC ${digitsOnly}`);
  }
  
  if (cleaned.startsWith("INC")) {
    const withoutPrefix = cleaned.substring(3);
    variants.add(withoutPrefix);
  }
  
  return Array.from(variants).filter(v => v.length > 0);
}

export async function getOcRequestStatusByIncidentId(params: z.infer<typeof toolSchemas.getOcRequestStatusByIncidentId>) {
  const validated = toolSchemas.getOcRequestStatusByIncidentId.parse(params);
  const variants = extractIncidentVariants(validated.incidentId);
  const digitsOnly = validated.incidentId.replace(/\D/g, "");
  
  const ocs = await getPrisma().oC.findMany({
    where: {
      OR: [
        ...variants.map(v => ({ incidenteOc: { equals: v, mode: "insensitive" as const } })),
        ...(digitsOnly ? [{ incidenteOc: { contains: digitsOnly, mode: "insensitive" as const } }] : [])
      ]
    },
    include: {
      support: { select: { id: true, name: true, code: true } },
      budgetPeriodFrom: { select: { year: true, month: true } },
      budgetPeriodTo: { select: { year: true, month: true } },
      costCenters: {
        include: {
          costCenter: { select: { id: true, code: true, name: true } }
        }
      },
      articulo: { select: { code: true, name: true } },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        take: 5,
        select: { status: true, changedAt: true, note: true }
      }
    }
  });

  if (ocs.length === 0) {
    return {
      found: false,
      incidentId: validated.incidentId,
      message: `No se encontró ninguna solicitud con INC "${validated.incidentId}". Verifica que el número sea correcto.`
    };
  }

  if (ocs.length > 1) {
    return {
      found: true,
      multipleMatches: true,
      incidentId: validated.incidentId,
      matches: ocs.map(oc => ({
        incidenteOc: oc.incidenteOc,
        solicitudOc: oc.solicitudOc,
        numeroOc: oc.numeroOc,
        estado: oc.estado,
        proveedor: oc.proveedor,
        fechaRegistro: oc.fechaRegistro.toISOString()
      })),
      message: "Se encontraron múltiples solicitudes. Por favor confirma cuál deseas consultar."
    };
  }

  const oc = ocs[0];
  
  return {
    found: true,
    incidentId: oc.incidenteOc || validated.incidentId,
    requestStatus: oc.estado,
    solicitudOc: oc.solicitudOc || "no disponible",
    fechaRegistro: oc.fechaRegistro.toISOString(),
    fechaActualizacion: oc.updatedAt.toISOString(),
    solicitante: {
      nombre: oc.nombreSolicitante,
      correo: oc.correoSolicitante
    },
    ocNumber: oc.numeroOc || null,
    ocExists: oc.numeroOc !== null,
    ocStatus: oc.numeroOc ? oc.estado : null,
    proveedor: {
      nombre: oc.proveedor,
      ruc: oc.ruc
    },
    monto: {
      importeSinIgv: Number(oc.importeSinIgv),
      moneda: oc.moneda
    },
    lineaSustento: {
      id: oc.support.id,
      nombre: oc.support.name,
      codigo: oc.support.code
    },
    cecos: oc.costCenters.map(cc => ({
      codigo: cc.costCenter.code,
      nombre: cc.costCenter.name
    })),
    periodoPresupuestal: {
      desde: `${oc.budgetPeriodFrom.year}-${String(oc.budgetPeriodFrom.month).padStart(2, "0")}`,
      hasta: `${oc.budgetPeriodTo.year}-${String(oc.budgetPeriodTo.month).padStart(2, "0")}`
    },
    descripcion: oc.descripcion || "no disponible",
    articulo: oc.articulo ? { codigo: oc.articulo.code, nombre: oc.articulo.name } : null,
    comentario: oc.comentario || null,
    linkCotizacion: oc.linkCotizacion || null,
    historialEstados: oc.statusHistory.map(h => ({
      estado: h.status,
      fecha: h.changedAt.toISOString(),
      nota: h.note
    }))
  };
}

export async function getOcByNumber(params: z.infer<typeof toolSchemas.getOcByNumber>) {
  const validated = toolSchemas.getOcByNumber.parse(params);
  
  const oc = await getPrisma().oC.findFirst({
    where: {
      OR: [
        { numeroOc: { equals: validated.ocNumber, mode: "insensitive" } },
        { numeroOc: { contains: validated.ocNumber, mode: "insensitive" } }
      ]
    },
    include: {
      support: { select: { id: true, name: true, code: true } },
      budgetPeriodFrom: { select: { year: true, month: true } },
      budgetPeriodTo: { select: { year: true, month: true } },
      costCenters: {
        include: {
          costCenter: { select: { id: true, code: true, name: true } }
        }
      },
      articulo: { select: { code: true, name: true } },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        take: 5,
        select: { status: true, changedAt: true, note: true }
      },
      invoices: {
        select: { id: true }
      }
    }
  });

  if (!oc) {
    return {
      found: false,
      ocNumber: validated.ocNumber,
      message: `No se encontró ninguna OC con número "${validated.ocNumber}". Verifica que el número sea correcto.`
    };
  }

  return {
    found: true,
    ocId: oc.id,
    ocNumber: oc.numeroOc,
    incidenteOc: oc.incidenteOc || "no disponible",
    solicitudOc: oc.solicitudOc || "no disponible",
    estado: oc.estado,
    proveedor: {
      nombre: oc.proveedor,
      ruc: oc.ruc
    },
    monto: {
      importeSinIgv: Number(oc.importeSinIgv),
      moneda: oc.moneda
    },
    lineaSustento: {
      id: oc.support.id,
      nombre: oc.support.name,
      codigo: oc.support.code
    },
    cecos: oc.costCenters.map(cc => ({
      codigo: cc.costCenter.code,
      nombre: cc.costCenter.name
    })),
    periodoPresupuestal: {
      desde: `${oc.budgetPeriodFrom.year}-${String(oc.budgetPeriodFrom.month).padStart(2, "0")}`,
      hasta: `${oc.budgetPeriodTo.year}-${String(oc.budgetPeriodTo.month).padStart(2, "0")}`
    },
    fechaRegistro: oc.fechaRegistro.toISOString(),
    fechaActualizacion: oc.updatedAt.toISOString(),
    solicitante: {
      nombre: oc.nombreSolicitante,
      correo: oc.correoSolicitante
    },
    descripcion: oc.descripcion || "no disponible",
    articulo: oc.articulo ? { codigo: oc.articulo.code, nombre: oc.articulo.name } : null,
    comentario: oc.comentario || null,
    linkCotizacion: oc.linkCotizacion || null,
    cantidadFacturas: oc.invoices.length,
    historialEstados: oc.statusHistory.map(h => ({
      estado: h.status,
      fecha: h.changedAt.toISOString(),
      nota: h.note
    }))
  };
}

export async function listInvoicesByOcNumber(params: z.infer<typeof toolSchemas.listInvoicesByOcNumber>) {
  const validated = toolSchemas.listInvoicesByOcNumber.parse(params);
  
  const oc = await getPrisma().oC.findFirst({
    where: {
      OR: [
        { numeroOc: { equals: validated.ocNumber, mode: "insensitive" } },
        { numeroOc: { contains: validated.ocNumber, mode: "insensitive" } }
      ]
    },
    select: { id: true, numeroOc: true }
  });

  if (!oc) {
    return {
      found: false,
      ocNumber: validated.ocNumber,
      message: `No se encontró ninguna OC con número "${validated.ocNumber}".`
    };
  }

  const invoices = await getPrisma().invoice.findMany({
    where: { ocId: oc.id },
    include: {
      vendor: { select: { legalName: true, taxId: true } },
      periods: {
        include: { period: { select: { year: true, month: true } } },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.montoSinIgv || inv.totalLocal || 0), 0);
  const currencies = [...new Set(invoices.map(inv => inv.currency))];

  return {
    found: true,
    ocNumber: oc.numeroOc,
    cantidadFacturas: invoices.length,
    totalMonto: totalAmount,
    monedas: currencies,
    facturas: invoices.map(inv => ({
      id: inv.id,
      numero: inv.numberNorm || "no disponible",
      tipo: inv.docType,
      estado: inv.statusCurrent,
      monto: Number(inv.montoSinIgv || inv.totalLocal || 0),
      moneda: inv.currency,
      proveedor: inv.vendor ? {
        nombre: inv.vendor.legalName,
        ruc: inv.vendor.taxId
      } : null,
      fechaCreacion: inv.createdAt.toISOString(),
      periodo: inv.periods[0] ? `${inv.periods[0].period.year}-${String(inv.periods[0].period.month).padStart(2, "0")}` : "no disponible",
      detalle: inv.detalle || null
    })),
    resumen: {
      porEstado: invoices.reduce((acc, inv) => {
        const status = inv.statusCurrent;
        if (!acc[status]) acc[status] = { cantidad: 0, monto: 0 };
        acc[status].cantidad += 1;
        acc[status].monto += Number(inv.montoSinIgv || inv.totalLocal || 0);
        return acc;
      }, {} as Record<string, { cantidad: number; monto: number }>)
    }
  };
}

export async function getBudgetBySupport(params: z.infer<typeof toolSchemas.getBudgetBySupport>) {
  const validated = toolSchemas.getBudgetBySupport.parse(params);
  
  const allSupports = await getPrisma().support.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true },
    take: 1000
  });

  if (allSupports.length === 0) {
    return {
      error: "No hay líneas de sustento activas en el sistema",
      suggestion: "Contacta al administrador"
    };
  }

  const normalizedQuery = normalizeText(validated.supportName);
  
  interface SupportMatch {
    id: number;
    name: string;
    code: string | null;
    matchScore: number;
    matchType: "exact" | "startsWith" | "partial" | "fuzzy";
  }
  
  const matches: SupportMatch[] = [];

  for (const support of allSupports) {
    const normalizedName = normalizeText(support.name);
    const normalizedCode = support.code ? normalizeText(support.code) : "";

    if (normalizedName === normalizedQuery || normalizedCode === normalizedQuery) {
      matches.push({
        id: support.id,
        name: support.name,
        code: support.code,
        matchScore: 1000,
        matchType: "exact"
      });
      continue;
    }

    if (normalizedName.startsWith(normalizedQuery) || normalizedCode.startsWith(normalizedQuery)) {
      const nameScore = normalizedName.startsWith(normalizedQuery) ? 100 - (normalizedName.length - normalizedQuery.length) : 0;
      const codeScore = normalizedCode.startsWith(normalizedQuery) ? 100 - (normalizedCode.length - normalizedQuery.length) : 0;
      matches.push({
        id: support.id,
        name: support.name,
        code: support.code,
        matchScore: Math.max(nameScore, codeScore),
        matchType: "startsWith"
      });
      continue;
    }

    if (normalizedName.includes(normalizedQuery) || normalizedCode.includes(normalizedQuery)) {
      matches.push({
        id: support.id,
        name: support.name,
        code: support.code,
        matchScore: 50,
        matchType: "partial"
      });
      continue;
    }

    if (normalizedQuery.length >= 3) {
      const nameDistance = levenshteinDistance(normalizedQuery, normalizedName);
      const codeDistance = normalizedCode ? levenshteinDistance(normalizedQuery, normalizedCode) : Infinity;
      const minDistance = Math.min(nameDistance, codeDistance);
      
      const maxAllowedDistance = Math.max(2, Math.floor(normalizedQuery.length * 0.4));
      
      if (minDistance <= maxAllowedDistance) {
        const score = Math.max(0, 30 - minDistance * 5);
        matches.push({
          id: support.id,
          name: support.name,
          code: support.code,
          matchScore: score,
          matchType: "fuzzy"
        });
      }
    }
  }

  if (matches.length === 0) {
    return { 
      error: `No se encontró ninguna línea de sustento que se parezca a "${validated.supportName}"`,
      suggestion: "Por favor, verifica el nombre. Puedes escribir el nombre completo o una parte significativa del mismo.",
      availableSupportsHint: allSupports.length > 0 
        ? `Algunas líneas disponibles: ${allSupports.slice(0, 5).map(s => s.name).join(", ")}...`
        : undefined
    };
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  const bestMatch = matches[0];

  const version = await getPrisma().budgetVersion.findFirst({
    where: { status: "ACTIVE" }
  });

  if (!version) {
    return { error: "No hay versión de presupuesto activa en el sistema" };
  }

  const periods = await getPrisma().period.findMany({
    where: { year: validated.year },
    orderBy: { month: "asc" }
  });

  if (periods.length === 0) {
    return {
      error: `No hay períodos registrados para el año ${validated.year}`,
      suggestion: "Verifica que el año sea correcto"
    };
  }

  const allocations = await getPrisma().budgetAllocation.findMany({
    where: {
      versionId: version.id,
      supportId: bestMatch.id,
      periodId: { in: periods.map(p => p.id) }
    },
    include: {
      period: true,
      costCenter: true
    }
  });

  const monthlyData: { [key: number]: { month: number, amount: number } } = {};
  let totalAnnual = 0;

  periods.forEach(period => {
    const monthAllocations = allocations.filter(a => a.periodId === period.id);
    const monthTotal = monthAllocations.reduce(
      (sum, alloc) => sum + Number(alloc.amountLocal),
      0
    );
    
    monthlyData[period.month] = {
      month: period.month,
      amount: monthTotal
    };
    
    totalAnnual += monthTotal;
  });

  const monthlyArray = Object.values(monthlyData).filter(m => m.amount > 0);

  return {
    success: true,
    year: validated.year,
    support: {
      id: bestMatch.id,
      name: bestMatch.name,
      code: bestMatch.code
    },
    matchInfo: {
      inputOriginal: validated.supportName,
      matchedName: bestMatch.name,
      matchType: bestMatch.matchType,
      wasExactMatch: bestMatch.matchType === "exact"
    },
    currency: "PEN",
    totalAnnual,
    monthlyData: monthlyArray,
    versionId: version.id,
    versionName: version.name
  };
}

export async function getInvoiceByNumber(params: z.infer<typeof toolSchemas.getInvoiceByNumber>) {
  const validated = toolSchemas.getInvoiceByNumber.parse(params);
  
  const whereClause: any = {
    OR: [
      { numberNorm: { equals: validated.invoiceNumber, mode: "insensitive" } },
      { numberNorm: { contains: validated.invoiceNumber, mode: "insensitive" } }
    ]
  };

  const invoices = await getPrisma().invoice.findMany({
    where: whereClause,
    include: {
      vendor: { select: { legalName: true, taxId: true } },
      oc: {
        select: {
          id: true,
          numeroOc: true,
          estado: true,
          proveedor: true,
          ruc: true,
          support: { select: { name: true, code: true } }
        }
      },
      periods: {
        include: { period: { select: { year: true, month: true } } }
      },
      costCenters: {
        include: { costCenter: { select: { code: true, name: true } } }
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        take: 5,
        select: { status: true, changedAt: true, note: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (invoices.length === 0) {
    return {
      found: false,
      invoiceNumber: validated.invoiceNumber,
      message: `No se encontró ninguna factura con número "${validated.invoiceNumber}". Verifica el formato (ej: F001-21424).`
    };
  }

  let filteredInvoices = invoices;
  if (validated.year && invoices.length > 1) {
    filteredInvoices = invoices.filter(inv => 
      inv.periods.some(p => p.period.year === validated.year) ||
      inv.createdAt.getFullYear() === validated.year
    );
    if (filteredInvoices.length === 0) {
      filteredInvoices = invoices;
    }
  }

  if (filteredInvoices.length > 1) {
    return {
      found: true,
      multipleMatches: true,
      invoiceNumber: validated.invoiceNumber,
      matches: filteredInvoices.map(inv => ({
        id: inv.id,
        numero: inv.numberNorm,
        estado: inv.statusCurrent,
        monto: Number(inv.montoSinIgv || inv.totalLocal || 0),
        moneda: inv.currency,
        fechaCreacion: inv.createdAt.toISOString(),
        proveedor: inv.vendor?.legalName || inv.oc?.proveedor || "no disponible"
      })),
      message: "Se encontraron múltiples facturas. Especifica el año para desambiguar."
    };
  }

  const invoice = filteredInvoices[0];
  
  return {
    found: true,
    invoiceId: invoice.id,
    numero: invoice.numberNorm || "no disponible",
    tipo: invoice.docType,
    estado: invoice.statusCurrent,
    monto: {
      sinIgv: Number(invoice.montoSinIgv || 0),
      totalLocal: Number(invoice.totalLocal || 0),
      totalForeign: invoice.totalForeign ? Number(invoice.totalForeign) : null,
      moneda: invoice.currency
    },
    proveedor: invoice.vendor ? {
      nombre: invoice.vendor.legalName,
      ruc: invoice.vendor.taxId
    } : (invoice.oc ? {
      nombre: invoice.oc.proveedor,
      ruc: invoice.oc.ruc
    } : null),
    ocAsociada: invoice.oc ? {
      numeroOc: invoice.oc.numeroOc || "no disponible",
      estado: invoice.oc.estado,
      lineaSustento: invoice.oc.support ? {
        nombre: invoice.oc.support.name,
        codigo: invoice.oc.support.code
      } : null
    } : null,
    periodos: invoice.periods.map(p => `${p.period.year}-${String(p.period.month).padStart(2, "0")}`),
    cecos: invoice.costCenters.map(cc => ({
      codigo: cc.costCenter.code,
      nombre: cc.costCenter.name,
      monto: cc.amount ? Number(cc.amount) : null,
      porcentaje: cc.percentage ? Number(cc.percentage) : null
    })),
    fechaCreacion: invoice.createdAt.toISOString(),
    fechaActualizacion: invoice.updatedAt.toISOString(),
    fechaAprobacion: invoice.approvedAt?.toISOString() || null,
    detalle: invoice.detalle || null,
    ultimusIncident: invoice.ultimusIncident || null,
    datosContables: {
      mesContable: invoice.mesContable || null,
      tcEstandar: invoice.tcEstandar ? Number(invoice.tcEstandar) : null,
      tcReal: invoice.tcReal ? Number(invoice.tcReal) : null,
      montoPEN_tcEstandar: invoice.montoPEN_tcEstandar ? Number(invoice.montoPEN_tcEstandar) : null,
      montoPEN_tcReal: invoice.montoPEN_tcReal ? Number(invoice.montoPEN_tcReal) : null,
      diferenciaTC: invoice.diferenciaTC ? Number(invoice.diferenciaTC) : null
    },
    historialEstados: invoice.statusHistory.map(h => ({
      estado: h.status,
      fecha: h.changedAt.toISOString(),
      nota: h.note
    }))
  };
}

export const toolExecutors = {
  searchSupports,
  searchCostCenters,
  getBudgetSummary,
  getInvoicesSummary,
  getPurchaseOrdersSummary,
  getTopSupports,
  getOcRequestStatusByIncidentId,
  getOcByNumber,
  listInvoicesByOcNumber,
  getInvoiceByNumber,
  getBudgetBySupport
};
