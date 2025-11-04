import { FastifyInstance, FastifyRequest } from "fastify";
import { PrismaClient, ExpenseType } from "@prisma/client";
import { z } from "zod";
import multipart, { MultipartFile } from "@fastify/multipart";

const prisma = new PrismaClient();

// Función para sanitizar valores: trim y convertir vacíos en undefined
function sanitizeValue(val: any): string | undefined {
  if (val === null || val === undefined) return undefined;
  const trimmed = String(val).trim();
  return trimmed === "" ? undefined : trimmed;
}

function sanitizeRow(raw: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    sanitized[key] = sanitizeValue(value);
  }
  return sanitized;
}

// Esquemas Zod específicos por tipo de entidad
const typeEnum = z.enum([
  "Management",
  "Area",
  "ExpensePackage",
  "ExpenseConcept",
  "CostCenter",
  "Articulo",
  "Support"
]);

const activeTransform = z.string().optional().transform(val => {
  if (!val) return true;
  const lower = val.toLowerCase();
  return lower === "true" || lower === "1" || lower === "yes" || lower === "sí" || lower === "si";
});

// Management: solo requiere name
const managementSchema = z.object({
  type: z.literal("Management"),
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().optional(),
  active: activeTransform
});

// Area: requiere name y managementName
const areaSchema = z.object({
  type: z.literal("Area"),
  name: z.string().min(1, "El nombre es obligatorio"),
  managementName: z.string().min(1, "managementName es obligatorio"),
  code: z.string().optional(),
  active: activeTransform
});

// ExpensePackage: solo requiere name
const expensePackageSchema = z.object({
  type: z.literal("ExpensePackage"),
  name: z.string().min(1, "El nombre es obligatorio")
});

// ExpenseConcept: requiere name y packageName
const expenseConceptSchema = z.object({
  type: z.literal("ExpenseConcept"),
  name: z.string().min(1, "El nombre es obligatorio"),
  packageName: z.string().min(1, "packageName es obligatorio")
});

// CostCenter: requiere code, name opcional
const costCenterSchema = z.object({
  type: z.literal("CostCenter"),
  name: z.string().optional(),
  code: z.string().min(1, "El código es obligatorio")
});

// Articulo: requiere code y name
const articuloSchema = z.object({
  type: z.literal("Articulo"),
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio")
});

// Support: requiere name, referencias opcionales
const supportSchema = z.object({
  type: z.literal("Support"),
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().optional(),
  managementName: z.string().optional(),
  areaName: z.string().optional(),
  packageName: z.string().optional(),
  conceptName: z.string().optional(),
  costCenterCode: z.string().optional(),  // DEPRECATED: usar costCenterCodes
  costCenterCodes: z.string().optional(),  // M:N: códigos separados por ";"
  expenseType: z.enum(["ADMINISTRATIVO", "PRODUCTO", "DISTRIBUIBLE"]).optional(),
  active: activeTransform
});

// Mapa de esquemas por tipo
const schemasByType: Record<string, z.ZodSchema> = {
  Management: managementSchema,
  Area: areaSchema,
  ExpensePackage: expensePackageSchema,
  ExpenseConcept: expenseConceptSchema,
  CostCenter: costCenterSchema,
  Articulo: articuloSchema,
  Support: supportSchema
};

type CsvRow = 
  | z.infer<typeof managementSchema>
  | z.infer<typeof areaSchema>
  | z.infer<typeof expensePackageSchema>
  | z.infer<typeof expenseConceptSchema>
  | z.infer<typeof costCenterSchema>
  | z.infer<typeof articuloSchema>
  | z.infer<typeof supportSchema>;

type RowResult = {
  row: number;
  type: string;
  action: "created" | "updated" | "skipped" | "error";
  message: string;
  issues?: Array<{ path: string[]; message: string }>;
};

type BulkResponse = {
  dryRun: boolean;
  summary: { created: number; updated: number; skipped: number; errors: number };
  byType: Record<string, { created: number; updated: number; skipped: number; errors: number }>;
  rows: RowResult[];
};

// Parser CSV robusto
function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue; // skip empty rows
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Generador de CSV de plantilla
function generateTemplateCSV(): string {
  const headers = [
    "type",
    "name",
    "code",
    "managementName",
    "areaName",
    "packageName",
    "conceptName",
    "costCenterCode",
    "costCenterCodes",
    "expenseType",
    "active"
  ];

  const examples = [
    // Managements
    ["Management", "Gerencia de Tecnología", "", "", "", "", "", "", "", "", "true"],
    ["Management", "Gerencia Comercial", "", "", "", "", "", "", "", "", "true"],
    
    // Areas
    ["Area", "Desarrollo", "", "Gerencia de Tecnología", "", "", "", "", "", "", "true"],
    ["Area", "Infraestructura", "", "Gerencia de Tecnología", "", "", "", "", "", "", "true"],
    ["Area", "Ventas", "", "Gerencia Comercial", "", "", "", "", "", "", "true"],
    
    // ExpensePackages
    ["ExpensePackage", "Hardware", "", "", "", "", "", "", "", "", ""],
    ["ExpensePackage", "Software", "", "", "", "", "", "", "", "", ""],
    
    // ExpenseConcepts
    ["ExpenseConcept", "Laptops", "", "", "", "Hardware", "", "", "", "", ""],
    ["ExpenseConcept", "Servidores", "", "", "", "Hardware", "", "", "", "", ""],
    ["ExpenseConcept", "Licencias Microsoft", "", "", "", "Software", "", "", "", "", ""],
    
    // CostCenters (código único, nombres pueden duplicarse)
    ["CostCenter", "Tecnología", "CC-001", "", "", "", "", "", "", "", ""],
    ["CostCenter", "Operaciones", "CC-002", "", "", "", "", "", "", "", ""],
    ["CostCenter", "Tecnología", "CC-003", "", "", "", "", "", "", "", ""],
    
    // Articulos (código único, nombres pueden duplicarse)
    ["Articulo", "Servicios Profesionales", "ART-001", "", "", "", "", "", "", "", ""],
    ["Articulo", "Servicios Profesionales", "ART-002", "", "", "", "", "", "", "", ""],
    ["Articulo", "Hardware", "ART-003", "", "", "", "", "", "", "", ""],
    
    // Supports (M:N con CECOs: usar costCenterCodes con ";" para múltiples)
    ["Support", "Soporte TI - Hardware", "SUP-001", "Gerencia de Tecnología", "Desarrollo", "Hardware", "Laptops", "", "CC-001;CC-003", "ADMINISTRATIVO", "true"],
    ["Support", "Soporte Ventas - Software", "SUP-002", "Gerencia Comercial", "Ventas", "Software", "Licencias Microsoft", "", "CC-002;CC-001", "PRODUCTO", "true"],
    ["Support", "Soporte Infraestructura", "SUP-003", "Gerencia de Tecnología", "Infraestructura", "Hardware", "Servidores", "", "CC-001;CC-002;CC-003", "DISTRIBUIBLE", "true"]
  ];

  const lines = [headers.join(",")];
  examples.forEach(row => {
    const escaped = row.map(cell => {
      if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    lines.push(escaped.join(","));
  });

  return lines.join("\n");
}

// Procesador principal de carga masiva
async function processBulkCSV(rows: CsvRow[], dryRun: boolean): Promise<BulkResponse> {
  const results: RowResult[] = [];
  const byType: Record<string, { created: number; updated: number; skipped: number; errors: number }> = {};

  const initTypeStats = (type: string) => {
    if (!byType[type]) {
      byType[type] = { created: 0, updated: 0, skipped: 0, errors: 0 };
    }
  };

  // Ordenar filas por tipo según dependencias
  const typeOrder = ["Management", "ExpensePackage", "CostCenter", "Articulo", "Area", "ExpenseConcept", "Support"];
  const sortedRows = rows
    .map((row, idx) => ({ row, originalIndex: idx + 2 })) // +2 porque row 1 es headers, 0-indexed
    .sort((a, b) => {
      const orderA = typeOrder.indexOf(a.row.type);
      const orderB = typeOrder.indexOf(b.row.type);
      return orderA - orderB;
    });

  for (const { row: data, originalIndex } of sortedRows) {
    const rowNum = originalIndex;
    const type = data.type;
    initTypeStats(type);

    try {
      let result: RowResult;

      switch (type) {
        case "Management":
          result = await processManagement(data, rowNum, dryRun);
          break;
        case "Area":
          result = await processArea(data, rowNum, dryRun);
          break;
        case "ExpensePackage":
          result = await processExpensePackage(data, rowNum, dryRun);
          break;
        case "ExpenseConcept":
          result = await processExpenseConcept(data, rowNum, dryRun);
          break;
        case "CostCenter":
          result = await processCostCenter(data, rowNum, dryRun);
          break;
        case "Articulo":
          result = await processArticulo(data, rowNum, dryRun);
          break;
        case "Support":
          result = await processSupport(data, rowNum, dryRun);
          break;
        default:
          result = {
            row: rowNum,
            type,
            action: "error",
            message: `Tipo desconocido: ${type}`,
            issues: [{ path: ["type"], message: "Tipo no válido" }]
          };
      }

      results.push(result);
      // Mapear action a la clave correcta en byType (error -> errors)
      const statsKey = result.action === "error" ? "errors" : result.action;
      byType[type][statsKey]++;
    } catch (error: any) {
      const errorResult: RowResult = {
        row: rowNum,
        type,
        action: "error",
        message: error.message || "Error inesperado",
        issues: [{ path: ["_general"], message: error.message }]
      };
      results.push(errorResult);
      byType[type].errors++;
    }
  }

  const summary = {
    created: results.filter(r => r.action === "created").length,
    updated: results.filter(r => r.action === "updated").length,
    skipped: results.filter(r => r.action === "skipped").length,
    errors: results.filter(r => r.action === "error").length
  };

  return { dryRun, summary, byType, rows: results };
}

// Procesadores por tipo de entidad
async function processManagement(data: any, rowNum: number, dryRun: boolean): Promise<RowResult> {
  const name = data.name?.trim();
  if (!name) {
    return {
      row: rowNum,
      type: "Management",
      action: "error",
      message: "Nombre es obligatorio",
      issues: [{ path: ["name"], message: "Campo requerido" }]
    };
  }

  const existing = await prisma.management.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });

  if (existing) {
    return {
      row: rowNum,
      type: "Management",
      action: "skipped",
      message: `Gerencia "${name}" ya existe`
    };
  }

  if (!dryRun) {
    await prisma.management.create({
      data: { name, code: data.code || null, active: data.active ?? true }
    });
  }

  return {
    row: rowNum,
    type: "Management",
    action: "created",
    message: `Gerencia "${name}" creada`
  };
}

async function processArea(data: any, rowNum: number, dryRun: boolean): Promise<RowResult> {
  const name = data.name?.trim();
  const managementName = data.managementName?.trim();

  if (!name) {
    return {
      row: rowNum,
      type: "Area",
      action: "error",
      message: "Nombre es obligatorio",
      issues: [{ path: ["name"], message: "Campo requerido" }]
    };
  }

  if (!managementName) {
    return {
      row: rowNum,
      type: "Area",
      action: "error",
      message: "managementName es obligatorio",
      issues: [{ path: ["managementName"], message: "Campo requerido" }]
    };
  }

  const management = await prisma.management.findFirst({
    where: { name: { equals: managementName, mode: "insensitive" } }
  });

  if (!management) {
    return {
      row: rowNum,
      type: "Area",
      action: "error",
      message: `Gerencia "${managementName}" no encontrada`,
      issues: [{ path: ["managementName"], message: "Gerencia no existe" }]
    };
  }

  const existing = await prisma.area.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });

  if (existing) {
    // Verificar si necesita actualización
    if (existing.managementId !== management.id) {
      if (!dryRun) {
        await prisma.area.update({
          where: { id: existing.id },
          data: { managementId: management.id, code: data.code || null, active: data.active ?? true }
        });
      }
      return {
        row: rowNum,
        type: "Area",
        action: "updated",
        message: `Área "${name}" actualizada`
      };
    }
    return {
      row: rowNum,
      type: "Area",
      action: "skipped",
      message: `Área "${name}" ya existe`
    };
  }

  if (!dryRun) {
    await prisma.area.create({
      data: {
        name,
        managementId: management.id,
        code: data.code || null,
        active: data.active ?? true
      }
    });
  }

  return {
    row: rowNum,
    type: "Area",
    action: "created",
    message: `Área "${name}" creada en gerencia "${managementName}"`
  };
}

async function processExpensePackage(data: any, rowNum: number, dryRun: boolean): Promise<RowResult> {
  const name = data.name?.trim();
  if (!name) {
    return {
      row: rowNum,
      type: "ExpensePackage",
      action: "error",
      message: "Nombre es obligatorio",
      issues: [{ path: ["name"], message: "Campo requerido" }]
    };
  }

  const existing = await prisma.expensePackage.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });

  if (existing) {
    return {
      row: rowNum,
      type: "ExpensePackage",
      action: "skipped",
      message: `Paquete "${name}" ya existe`
    };
  }

  if (!dryRun) {
    await prisma.expensePackage.create({ data: { name } });
  }

  return {
    row: rowNum,
    type: "ExpensePackage",
    action: "created",
    message: `Paquete "${name}" creado`
  };
}

async function processExpenseConcept(data: any, rowNum: number, dryRun: boolean): Promise<RowResult> {
  const name = data.name?.trim();
  const packageName = data.packageName?.trim();

  if (!name) {
    return {
      row: rowNum,
      type: "ExpenseConcept",
      action: "error",
      message: "Nombre es obligatorio",
      issues: [{ path: ["name"], message: "Campo requerido" }]
    };
  }

  if (!packageName) {
    return {
      row: rowNum,
      type: "ExpenseConcept",
      action: "error",
      message: "packageName es obligatorio",
      issues: [{ path: ["packageName"], message: "Campo requerido" }]
    };
  }

  const pkg = await prisma.expensePackage.findFirst({
    where: { name: { equals: packageName, mode: "insensitive" } }
  });

  if (!pkg) {
    return {
      row: rowNum,
      type: "ExpenseConcept",
      action: "error",
      message: `Paquete "${packageName}" no encontrado`,
      issues: [{ path: ["packageName"], message: "Paquete no existe" }]
    };
  }

  const existing = await prisma.expenseConcept.findFirst({
    where: {
      packageId: pkg.id,
      name: { equals: name, mode: "insensitive" }
    }
  });

  if (existing) {
    return {
      row: rowNum,
      type: "ExpenseConcept",
      action: "skipped",
      message: `Concepto "${name}" en paquete "${packageName}" ya existe`
    };
  }

  if (!dryRun) {
    await prisma.expenseConcept.create({
      data: { name, packageId: pkg.id }
    });
  }

  return {
    row: rowNum,
    type: "ExpenseConcept",
    action: "created",
    message: `Concepto "${name}" creado en paquete "${packageName}"`
  };
}

async function processCostCenter(data: any, rowNum: number, dryRun: boolean): Promise<RowResult> {
  const code = data.code?.trim();
  const name = data.name?.trim() || null;

  if (!code) {
    return {
      row: rowNum,
      type: "CostCenter",
      action: "error",
      message: "Código es obligatorio",
      issues: [{ path: ["code"], message: "Campo requerido" }]
    };
  }

  // Buscar por código (case-insensitive) - código es la clave única
  const existingByCode = await prisma.costCenter.findFirst({
    where: { code: { equals: code, mode: "insensitive" } }
  });

  if (existingByCode) {
    // Actualizar nombre si cambió (nombres pueden duplicarse, o ser null)
    if (existingByCode.name !== name) {
      if (!dryRun) {
        await prisma.costCenter.update({
          where: { id: existingByCode.id },
          data: { name }
        });
      }
      return {
        row: rowNum,
        type: "CostCenter",
        action: "updated",
        message: `Centro de costo [${code}] actualizado${name ? ` (nombre: "${name}")` : ""}`
      };
    }
    return {
      row: rowNum,
      type: "CostCenter",
      action: "skipped",
      message: `Centro de costo [${code}] ya existe sin cambios`
    };
  }

  if (!dryRun) {
    await prisma.costCenter.create({ data: { code, name } });
  }

  return {
    row: rowNum,
    type: "CostCenter",
    action: "created",
    message: `Centro de costo [${code}]${name ? ` "${name}"` : ""} creado`
  };
}

async function processArticulo(data: any, rowNum: number, dryRun: boolean): Promise<RowResult> {
  const code = data.code?.trim();
  const name = data.name?.trim();

  if (!code || !name) {
    return {
      row: rowNum,
      type: "Articulo",
      action: "error",
      message: "Código y nombre son obligatorios",
      issues: [
        ...(!code ? [{ path: ["code"], message: "Campo requerido" }] : []),
        ...(!name ? [{ path: ["name"], message: "Campo requerido" }] : [])
      ]
    };
  }

  // Buscar por código (case-insensitive) - código es la clave única
  const existingByCode = await prisma.articulo.findFirst({
    where: { code: { equals: code, mode: "insensitive" } }
  });

  if (existingByCode) {
    // Actualizar nombre si cambió (nombres pueden duplicarse)
    if (existingByCode.name !== name) {
      if (!dryRun) {
        await prisma.articulo.update({
          where: { id: existingByCode.id },
          data: { name }
        });
      }
      return {
        row: rowNum,
        type: "Articulo",
        action: "updated",
        message: `Artículo [${code}] actualizado (nombre: "${name}")`
      };
    }
    return {
      row: rowNum,
      type: "Articulo",
      action: "skipped",
      message: `Artículo [${code}] ya existe sin cambios`
    };
  }

  if (!dryRun) {
    await prisma.articulo.create({ data: { code, name } });
  }

  return {
    row: rowNum,
    type: "Articulo",
    action: "created",
    message: `Artículo [${code}] "${name}" creado`
  };
}

async function processSupport(data: any, rowNum: number, dryRun: boolean): Promise<RowResult> {
  const name = data.name?.trim();
  if (!name) {
    return {
      row: rowNum,
      type: "Support",
      action: "error",
      message: "Nombre es obligatorio",
      issues: [{ path: ["name"], message: "Campo requerido" }]
    };
  }

  // Resolver referencias
  let managementId: number | null = null;
  if (data.managementName?.trim()) {
    const mgmt = await prisma.management.findFirst({
      where: { name: { equals: data.managementName.trim(), mode: "insensitive" } }
    });
    if (!mgmt) {
      return {
        row: rowNum,
        type: "Support",
        action: "error",
        message: `Gerencia "${data.managementName}" no encontrada`,
        issues: [{ path: ["managementName"], message: "Gerencia no existe" }]
      };
    }
    managementId = mgmt.id;
  }

  let areaId: number | null = null;
  if (data.areaName?.trim()) {
    const area = await prisma.area.findFirst({
      where: { name: { equals: data.areaName.trim(), mode: "insensitive" } }
    });
    if (!area) {
      return {
        row: rowNum,
        type: "Support",
        action: "error",
        message: `Área "${data.areaName}" no encontrada`,
        issues: [{ path: ["areaName"], message: "Área no existe" }]
      };
    }
    areaId = area.id;
  }

  // DEPRECATED: costCenterCode (mantener por compatibilidad)
  let costCenterId: number | null = null;
  if (data.costCenterCode?.trim()) {
    const cc = await prisma.costCenter.findUnique({
      where: { code: data.costCenterCode.trim() }
    });
    if (!cc) {
      return {
        row: rowNum,
        type: "Support",
        action: "error",
        message: `Centro de costo "${data.costCenterCode}" no encontrado`,
        issues: [{ path: ["costCenterCode"], message: "Centro de costo no existe" }]
      };
    }
    costCenterId = cc.id;
  }

  // M:N: Parsear múltiples CECOs separados por ";"
  const costCenterIds: number[] = [];
  if (data.costCenterCodes?.trim()) {
    const codesRaw = String(data.costCenterCodes).split(";").map((c: string) => c.trim()).filter((c: string) => c);
    const uniqueCodes = [...new Set(codesRaw)];  // De-duplicar
    
    // Debug log
    console.log(`[Bulk Support] Fila ${rowNum}: parseando costCenterCodes`, {
      raw: data.costCenterCodes,
      parsed: uniqueCodes,
      supportName: name
    });
    
    for (const code of uniqueCodes) {
      const cc = await prisma.costCenter.findFirst({
        where: { code: { equals: String(code), mode: "insensitive" } }
      });
      if (!cc) {
        return {
          row: rowNum,
          type: "Support",
          action: "error",
          message: `Centro de costo "${code}" no encontrado`,
          issues: [{ path: ["costCenterCodes"], message: `CECO "${code}" no existe` }]
        };
      }
      costCenterIds.push(cc.id);
    }
    
    // Debug log
    console.log(`[Bulk Support] Fila ${rowNum}: CECOs resueltos`, {
      codes: uniqueCodes,
      ids: costCenterIds,
      count: costCenterIds.length
    });
  }

  let expensePackageId: number | null = null;
  let expenseConceptId: number | null = null;

  if (data.conceptName?.trim()) {
    // Si especifica concepto, debe especificar paquete también
    if (!data.packageName?.trim()) {
      return {
        row: rowNum,
        type: "Support",
        action: "error",
        message: "Si especificas conceptName, debes especificar packageName",
        issues: [{ path: ["packageName"], message: "Campo requerido cuando hay conceptName" }]
      };
    }

    const pkg = await prisma.expensePackage.findFirst({
      where: { name: { equals: data.packageName.trim(), mode: "insensitive" } }
    });
    if (!pkg) {
      return {
        row: rowNum,
        type: "Support",
        action: "error",
        message: `Paquete "${data.packageName}" no encontrado`,
        issues: [{ path: ["packageName"], message: "Paquete no existe" }]
      };
    }

    const concept = await prisma.expenseConcept.findFirst({
      where: {
        packageId: pkg.id,
        name: { equals: data.conceptName.trim(), mode: "insensitive" }
      }
    });
    if (!concept) {
      return {
        row: rowNum,
        type: "Support",
        action: "error",
        message: `Concepto "${data.conceptName}" no encontrado en paquete "${data.packageName}"`,
        issues: [{ path: ["conceptName"], message: "Concepto no existe en el paquete especificado" }]
      };
    }

    expensePackageId = pkg.id;
    expenseConceptId = concept.id;
  } else if (data.packageName?.trim()) {
    // Solo paquete sin concepto
    const pkg = await prisma.expensePackage.findFirst({
      where: { name: { equals: data.packageName.trim(), mode: "insensitive" } }
    });
    if (!pkg) {
      return {
        row: rowNum,
        type: "Support",
        action: "error",
        message: `Paquete "${data.packageName}" no encontrado`,
        issues: [{ path: ["packageName"], message: "Paquete no existe" }]
      };
    }
    expensePackageId = pkg.id;
  }

  const existing = await prisma.support.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });

  const supportData: any = {
    name,
    code: data.code?.trim() || null,
    managementId,
    areaId,
    costCenterId,
    expensePackageId,
    expenseConceptId,
    expenseType: data.expenseType || "ADMINISTRATIVO",
    active: data.active ?? true
  };

  if (existing) {
    // Actualizar
    if (!dryRun) {
      await prisma.$transaction(async tx => {
        await tx.support.update({
          where: { id: existing.id },
          data: supportData
        });

        // Actualizar asociaciones M:N con CECOs
        // IMPORTANTE: Solo actualizar si se especifica costCenterCodes en el CSV
        // De lo contrario, mantener las relaciones existentes
        if (data.costCenterCodes !== undefined && data.costCenterCodes !== null) {
          // Eliminar asociaciones actuales
          await tx.supportCostCenter.deleteMany({ where: { supportId: existing.id } });
          // Crear nuevas asociaciones
          if (costCenterIds.length > 0) {
            await tx.supportCostCenter.createMany({
              data: costCenterIds.map(ccId => ({ supportId: existing.id, costCenterId: ccId })),
              skipDuplicates: true
            });
          }
          console.log(`[Bulk Support] Fila ${rowNum}: Actualizadas ${costCenterIds.length} asociaciones M:N para Support ID ${existing.id}`);
        }
      });
    }
    
    // Mensaje incluye CECO info incluso en dry-run
    const cecoMessage = costCenterIds.length > 0 
      ? ` vinculando ${costCenterIds.length} CECO(s)` 
      : data.costCenterCodes?.trim() ? " (sin CECOs)" : "";
    
    return {
      row: rowNum,
      type: "Support",
      action: "updated",
      message: `Sustento "${name}" actualizado${cecoMessage}`
    };
  }

  if (!dryRun) {
    await prisma.$transaction(async tx => {
      const newSupport = await tx.support.create({ data: supportData });
      
      // Crear asociaciones M:N con CECOs
      if (costCenterIds.length > 0) {
        await tx.supportCostCenter.createMany({
          data: costCenterIds.map(ccId => ({ supportId: newSupport.id, costCenterId: ccId })),
          skipDuplicates: true
        });
        console.log(`[Bulk Support] Fila ${rowNum}: Creadas ${costCenterIds.length} asociaciones M:N para nuevo Support ID ${newSupport.id}`);
      }
    });
  }

  // Mensaje incluye CECO info incluso en dry-run
  const cecoMessage = costCenterIds.length > 0 
    ? ` con ${costCenterIds.length} CECO(s)` 
    : data.costCenterCodes?.trim() ? " (sin CECOs válidos)" : "";

  return {
    row: rowNum,
    type: "Support",
    action: "created",
    message: `Sustento "${name}" creado${cecoMessage}`
  };
}

export async function registerBulkRoutes(app: FastifyInstance) {
  // Registrar plugin multipart para subida de archivos
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1
    }
  });

  // Endpoint para descargar plantilla CSV
  app.get("/bulk/template", async (req, reply) => {
    const csv = generateTemplateCSV();
    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="catalogs_template.csv"')
      .send("\uFEFF" + csv); // BOM para UTF-8
  });

  // Endpoint para procesar CSV
  app.post("/bulk/catalogs", async (req: FastifyRequest, reply) => {
    try {
      // @ts-ignore - @fastify/multipart adds file() method to request
      const data: MultipartFile = await req.file();
      
      if (!data) {
        return reply.code(400).send({ error: "No se recibió ningún archivo" });
      }

      // Leer el archivo
      const buffer = await data.toBuffer();
      const content = buffer.toString("utf-8").replace(/^\uFEFF/, ""); // remover BOM si existe

      // Parsear CSV
      const rawRows = parseCSV(content);
      
      if (rawRows.length === 0) {
        return reply.code(422).send({
          error: "El archivo CSV está vacío o no tiene datos válidos"
        });
      }

      // Validar cada fila con esquema específico por tipo
      const validatedRows: CsvRow[] = [];
      const validationErrors: Array<{ row: number; type: string; issues: any[] }> = [];

      rawRows.forEach((raw, idx) => {
        // Paso 1: Sanitizar la fila (trim, vacíos → undefined)
        const sanitized = sanitizeRow(raw);
        
        // Paso 2: Validar que tenga un tipo válido
        const typeValidation = typeEnum.safeParse(sanitized.type);
        if (!typeValidation.success) {
          validationErrors.push({
            row: idx + 2,
            type: sanitized.type || "Unknown",
            issues: [{ path: ["type"], message: "Tipo de entidad no válido o faltante" }]
          });
          return;
        }
        
        const rowType = typeValidation.data;
        
        // Paso 3: Aplicar el esquema específico del tipo
        const schema = schemasByType[rowType];
        const parsed = schema.safeParse(sanitized);
        
        if (!parsed.success) {
          validationErrors.push({
            row: idx + 2,
            type: rowType,
            issues: parsed.error.errors.map(err => ({
              path: err.path,
              message: err.message
            }))
          });
        } else {
          validatedRows.push(parsed.data as CsvRow);
        }
      });

      if (validationErrors.length > 0) {
        // Formato consistente con BulkResponse
        const errorRows: RowResult[] = validationErrors.map(ve => ({
          row: ve.row,
          type: ve.type,
          action: "error",
          message: `Error de validación en fila ${ve.row}`,
          issues: ve.issues
        }));
        
        const byType: Record<string, { created: number; updated: number; skipped: number; errors: number }> = {};
        errorRows.forEach(r => {
          if (!byType[r.type]) {
            byType[r.type] = { created: 0, updated: 0, skipped: 0, errors: 0 };
          }
          byType[r.type].errors++;
        });

        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          summary: { created: 0, updated: 0, skipped: 0, errors: errorRows.length },
          byType,
          rows: errorRows
        });
      }

      // Determinar si es dry-run desde query params
      const dryRun = (req.query as any).dryRun !== "false";

      // Procesar
      const result = await processBulkCSV(validatedRows, dryRun);

      // Si hay errores en el procesamiento, devolver 422
      if (result.summary.errors > 0) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          ...result
        });
      }

      return result;
    } catch (error: any) {
      console.error("Error processing bulk CSV:", error);
      return reply.code(500).send({
        error: "Error al procesar el archivo CSV",
        message: error.message
      });
    }
  });
}

