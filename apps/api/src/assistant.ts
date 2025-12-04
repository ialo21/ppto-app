import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requirePermission } from "./auth";
import { geminiClient } from "./gemini-client";

const prisma = new PrismaClient();

// Schema de validación para el mensaje del asistente
const assistantMessageSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío"),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  })).optional().default([])
});

// Prompt de sistema para Gemini
const SYSTEM_PROMPT = `Eres el asistente de presupuesto de la aplicación 'PPTO App'.
Tu función es responder preguntas sobre presupuesto, facturas y provisiones usando EXCLUSIVAMENTE los datos de PPTO que recibes en la sección PPTO_DATA.

Reglas importantes:
- Si no hay datos suficientes en PPTO_DATA para responder con certeza, dilo explícitamente y pide al usuario que aclare (por ejemplo, que indique el año o la línea de sustento).
- No inventes montos ni meses; si no hay información, responde que no hay datos disponibles.
- Cuando respondas sobre presupuesto:
  * Indica el total anual en PEN con dos decimales.
  * Si se incluye detalle mensual, muestra solo los meses con presupuesto > 0.
  * Usa un tono claro, conciso y profesional.
  * Si matchInfo.wasExactMatch es false, menciona amablemente el nombre real de la línea que encontraste.
    Ejemplo: "Encontré la línea 'Servicio Gestión de Infraestructura' en base a tu búsqueda..."
- Si el usuario pregunta algo que no está relacionado con presupuesto/PPTO o que no puedes responder con datos proporcionados, aclara el alcance y sugiere qué tipo de consulta sí puedes resolver.
- El término "línea" o "línea de sustento" o simplemente "sustento" se refiere a lo mismo.
- Los años válidos son aquellos para los que hay datos en PPTO_DATA.
- Siempre formatea los montos con separadores de miles y dos decimales.`;

// ══════════════════════════════════════════════════════════════
// UTILIDADES DE FUZZY MATCHING PARA LÍNEAS/SUSTENTO
// ══════════════════════════════════════════════════════════════

/**
 * Normaliza un texto para comparación:
 * - Convierte a minúsculas
 * - Elimina tildes/acentos
 * - Elimina caracteres especiales (excepto letras, números, espacios)
 * - Trim de espacios
 */
function normalizeText(text: string): string {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .normalize("NFD") // Descompone caracteres con tildes
    .replace(/[\u0300-\u036f]/g, "") // Elimina marcas diacríticas
    .replace(/[^a-z0-9\s]/g, "") // Solo letras, números y espacios
    .trim()
    .replace(/\s+/g, " "); // Múltiples espacios a uno solo
}

/**
 * Calcula la distancia de Levenshtein entre dos strings.
 * Representa el número mínimo de operaciones (inserción, eliminación, sustitución)
 * necesarias para transformar una cadena en otra.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Inicializar primera fila y columna
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Llenar la matriz
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Sustitución
          matrix[i][j - 1] + 1,     // Inserción
          matrix[i - 1][j] + 1      // Eliminación
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

interface SupportMatch {
  id: number;
  name: string;
  code: string | null;
  score: number;
  matchType: "exact" | "partial" | "startsWith" | "fuzzy";
}

/**
 * Busca la mejor coincidencia para una línea/sustento usando fuzzy matching.
 * 
 * Estrategia (en orden de preferencia):
 * 1. Coincidencia exacta normalizada (nombre o código)
 * 2. Coincidencia por inicio (startsWith) - ideal para abreviaciones
 * 3. Coincidencia parcial (contains) - búsqueda flexible
 * 4. Distancia de Levenshtein (fuzzy) - para typos menores
 * 
 * @param input - Texto de entrada del usuario (ej: "seguri", "infra")
 * @param supports - Lista de supports disponibles en BD
 * @returns El mejor match encontrado o null si no hay coincidencia razonable
 */
function findBestSupportMatch(
  input: string,
  supports: Array<{ id: number; name: string; code: string | null }>
): SupportMatch | null {
  if (!input || supports.length === 0) return null;

  const normalizedInput = normalizeText(input);
  const candidates: SupportMatch[] = [];

  // Evaluar cada support
  for (const support of supports) {
    const normalizedName = normalizeText(support.name);
    const normalizedCode = support.code ? normalizeText(support.code) : "";

    // 1. COINCIDENCIA EXACTA (máxima prioridad)
    if (normalizedName === normalizedInput || normalizedCode === normalizedInput) {
      candidates.push({
        ...support,
        score: 1000, // Score muy alto
        matchType: "exact"
      });
      continue;
    }

    // 2. COINCIDENCIA POR INICIO (startsWith) - bueno para abreviaciones
    if (normalizedName.startsWith(normalizedInput) || normalizedCode.startsWith(normalizedInput)) {
      // Score basado en cuán cerca está del match completo
      const nameScore = normalizedName.startsWith(normalizedInput) ? 100 - (normalizedName.length - normalizedInput.length) : 0;
      const codeScore = normalizedCode.startsWith(normalizedInput) ? 100 - (normalizedCode.length - normalizedInput.length) : 0;
      candidates.push({
        ...support,
        score: Math.max(nameScore, codeScore),
        matchType: "startsWith"
      });
      continue;
    }

    // 3. COINCIDENCIA PARCIAL (contains)
    if (normalizedName.includes(normalizedInput) || normalizedCode.includes(normalizedInput)) {
      // Score menor que startsWith pero aún válido
      const nameScore = normalizedName.includes(normalizedInput) ? 50 : 0;
      const codeScore = normalizedCode.includes(normalizedInput) ? 50 : 0;
      candidates.push({
        ...support,
        score: Math.max(nameScore, codeScore),
        matchType: "partial"
      });
      continue;
    }

    // 4. FUZZY MATCHING (Levenshtein) - último recurso
    // Solo aplicar si el input tiene al menos 3 caracteres para evitar matches espurios
    if (normalizedInput.length >= 3) {
      const nameDistance = levenshteinDistance(normalizedInput, normalizedName);
      const codeDistance = normalizedCode ? levenshteinDistance(normalizedInput, normalizedCode) : Infinity;
      const minDistance = Math.min(nameDistance, codeDistance);
      
      // Umbral: aceptar solo si la distancia es pequeña relativa a la longitud del input
      // Ej: input de 5 chars acepta hasta distancia de 2 (40%)
      const maxAllowedDistance = Math.max(2, Math.floor(normalizedInput.length * 0.4));
      
      if (minDistance <= maxAllowedDistance) {
        // Score inversamente proporcional a la distancia
        const score = Math.max(0, 30 - minDistance * 5);
        candidates.push({
          ...support,
          score,
          matchType: "fuzzy"
        });
      }
    }
  }

  // Si no hay candidatos, retornar null
  if (candidates.length === 0) return null;

  // Ordenar por score (mayor a menor)
  candidates.sort((a, b) => b.score - a.score);

  // Retornar el mejor candidato
  // Si hay múltiples con score muy similar (diferencia < 5), hay ambigüedad
  const best = candidates[0];
  const secondBest = candidates[1];
  
  // Si hay ambigüedad significativa, retornar null para que el asistente pida clarificación
  if (secondBest && Math.abs(best.score - secondBest.score) < 5 && best.matchType !== "exact") {
    console.log(`[Assistant] Ambigüedad detectada entre "${best.name}" y "${secondBest.name}" para input "${input}"`);
    return null;
  }

  return best;
}

// ══════════════════════════════════════════════════════════════
// PARSING DE INTENCIÓN Y CONSULTAS
// ══════════════════════════════════════════════════════════════

/**
 * Intenta extraer la intención del usuario usando Gemini
 */
async function parseUserIntent(message: string): Promise<{
  needsData: boolean;
  lineaSustento?: string;
  anio?: number;
  tipoConsulta?: string;
  missingInfo?: string[];
}> {
  const intentPrompt = `Analiza la siguiente pregunta del usuario y determina qué información necesita sobre presupuesto.

Pregunta del usuario: "${message}"

Responde SOLO con un objeto JSON válido (sin markdown, sin explicaciones adicionales) con esta estructura:
{
  "needsData": true/false,
  "lineaSustento": "nombre de la línea o sustento mencionado (si se menciona)",
  "anio": número del año (si se menciona),
  "tipoConsulta": "presupuestoLineaAnual" | "comparativoAnios" | "detallesMensual" | "generico",
  "missingInfo": ["lista de datos que faltan, ej: 'año', 'línea de sustento'"]
}

Ejemplos:
- "¿Cuánto presupuesto hay para la línea SEGURIDAD en 2025?" → {"needsData": true, "lineaSustento": "SEGURIDAD", "anio": 2025, "tipoConsulta": "presupuestoLineaAnual", "missingInfo": []}
- "Dame el total de Infraestructura" → {"needsData": true, "lineaSustento": "Infraestructura", "tipoConsulta": "presupuestoLineaAnual", "missingInfo": ["año"]}
- "Hola, ¿qué puedes hacer?" → {"needsData": false, "tipoConsulta": "generico", "missingInfo": []}`;

  try {
    const response = await geminiClient.generateContent(intentPrompt);
    
    // Limpiar la respuesta (remover markdown si existe)
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
    }
    
    const intent = JSON.parse(cleanedResponse);
    return intent;
  } catch (error) {
    console.error("Error parseando intención:", error);
    // Si falla el parsing, asumir que necesita datos genéricos
    return {
      needsData: false,
      tipoConsulta: "generico",
      missingInfo: []
    };
  }
}

/**
 * Consulta el presupuesto por línea de sustento y año.
 * Utiliza fuzzy matching para encontrar la línea más apropiada.
 * 
 * CASOS DE USO ESPERADOS:
 * 1. Input exacto: "SEGURIDAD" → match directo
 * 2. Input simplificado: "seguridad" → normalización + match
 * 3. Input abreviado: "infra" → startsWith "infraestructura"
 * 4. Input con typo: "seguidad" → fuzzy matching con Levenshtein
 * 5. Input imposible: "INVENTADA XYZ" → retorna error sin inventar datos
 */
async function queryBudgetData(lineaSustento: string, anio: number) {
  try {
    // Buscar la versión activa
    const version = await prisma.budgetVersion.findFirst({
      where: { status: "ACTIVE" }
    });

    if (!version) {
      return { error: "No hay versión de presupuesto activa en el sistema" };
    }

    // FUZZY MATCHING: Obtener todos los supports activos y buscar el mejor match
    const allSupports = await prisma.support.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true }
    });

    if (allSupports.length === 0) {
      return {
        error: "No hay líneas de sustento activas en el sistema",
        suggestion: "Contacta al administrador"
      };
    }

    // Buscar el mejor match usando fuzzy matching
    const matchResult = findBestSupportMatch(lineaSustento, allSupports);

    if (!matchResult) {
      // No se encontró ningún match razonable
      return { 
        error: `No se encontró ninguna línea de sustento que se parezca a "${lineaSustento}"`,
        suggestion: "Por favor, verifica el nombre. Puedes escribir el nombre completo o una parte significativa del mismo.",
        availableSupportsHint: allSupports.length > 0 
          ? `Algunas líneas disponibles: ${allSupports.slice(0, 5).map(s => s.name).join(", ")}...`
          : undefined
      };
    }

    // Match encontrado - obtener el support completo
    const support = await prisma.support.findUnique({
      where: { id: matchResult.id }
    });

    if (!support) {
      return { 
        error: `Error inesperado: la línea encontrada ya no existe`,
        suggestion: "Intenta de nuevo"
      };
    }

    // Log del match para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      console.log(`[Assistant] Fuzzy match: "${lineaSustento}" → "${support.name}" (type: ${matchResult.matchType}, score: ${matchResult.score})`);
    }

    // Obtener todos los periodos del año
    const periods = await prisma.period.findMany({
      where: { year: anio },
      orderBy: { month: "asc" }
    });

    if (periods.length === 0) {
      return {
        error: `No hay periodos registrados para el año ${anio}`,
        suggestion: "Verifica que el año sea correcto"
      };
    }

    // Obtener todas las asignaciones de presupuesto para este sustento en este año
    const allocations = await prisma.budgetAllocation.findMany({
      where: {
        versionId: version.id,
        supportId: support.id,
        periodId: { in: periods.map(p => p.id) }
      },
      include: {
        period: true,
        costCenter: true
      }
    });

    // Agrupar por mes y sumar
    const monthlyData = new Map<number, { period: string; amount: number }>();
    let totalAnual = 0;

    periods.forEach(period => {
      const monthAllocations = allocations.filter(a => a.periodId === period.id);
      const monthTotal = monthAllocations.reduce(
        (sum, alloc) => sum + Number(alloc.amountLocal),
        0
      );
      
      const periodLabel = `${period.year}-${String(period.month).padStart(2, "0")}`;
      monthlyData.set(period.month, {
        period: periodLabel,
        amount: monthTotal
      });
      
      totalAnual += monthTotal;
    });

    // Filtrar solo meses con presupuesto > 0
    const mesesConPresupuesto = Array.from(monthlyData.entries())
      .filter(([_, data]) => data.amount > 0)
      .map(([mes, data]) => ({
        mes: data.period,
        monto: data.amount
      }));

    return {
      success: true,
      data: {
        tipoConsulta: "presupuestoLineaAnual",
        anio,
        linea: support.name,
        lineaCode: support.code,
        moneda: "PEN",
        totalAnual,
        meses: mesesConPresupuesto,
        versionId: version.id,
        versionName: version.name,
        // Metadata del match para que el asistente pueda mencionarlo si es relevante
        matchInfo: {
          inputOriginal: lineaSustento,
          matchedName: support.name,
          matchType: matchResult.matchType,
          wasExactMatch: matchResult.matchType === "exact"
        }
      }
    };
  } catch (error: any) {
    console.error("Error consultando presupuesto:", error);
    return {
      error: "Error al consultar la base de datos",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    };
  }
}

/**
 * Registra las rutas del asistente
 */
export async function registerAssistantRoutes(app: FastifyInstance) {
  /**
   * POST /assistant
   * Endpoint principal del asistente conversacional
   */
  app.post("/assistant", { preHandler: [requireAuth, requirePermission("assistant")] }, async (req, reply) => {
    // Validar entrada
    const parsed = assistantMessageSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors
      });
    }

    const { message, history } = parsed.data;

    try {
      // 1. Parsear la intención del usuario
      const intent = await parseUserIntent(message);
      
      // 2. Si no necesita datos, responder directamente con contexto general
      if (!intent.needsData || intent.tipoConsulta === "generico") {
        const genericPrompt = `${SYSTEM_PROMPT}

Usuario: ${message}

Responde de manera amigable explicando qué tipo de consultas puedes resolver (presupuesto por línea/sustento y año, detalles mensuales, comparativos). No inventes datos.`;

        const response = await geminiClient.generateContent(genericPrompt);
        
        return {
          response,
          intent,
          dataQueried: false
        };
      }

      // 3. Verificar si falta información crítica
      if (intent.missingInfo && intent.missingInfo.length > 0) {
        const missingPrompt = `${SYSTEM_PROMPT}

El usuario preguntó: "${message}"

Falta la siguiente información: ${intent.missingInfo.join(", ")}

Responde de manera amigable pidiendo al usuario que proporcione esa información. Sé específico sobre qué necesitas (por ejemplo, "¿Para qué año?" o "¿De qué línea de sustento?").`;

        const response = await geminiClient.generateContent(missingPrompt);
        
        return {
          response,
          intent,
          dataQueried: false,
          missingInfo: intent.missingInfo
        };
      }

      // 4. Consultar la base de datos
      let pptoData = null;
      
      if (intent.lineaSustento && intent.anio) {
        pptoData = await queryBudgetData(intent.lineaSustento, intent.anio);
      }

      // 5. Verificar si hubo error en la consulta
      if (pptoData && pptoData.error) {
        const errorPrompt = `${SYSTEM_PROMPT}

El usuario preguntó: "${message}"

Se intentó buscar datos pero ocurrió un problema: ${pptoData.error}
${pptoData.suggestion ? `Sugerencia: ${pptoData.suggestion}` : ""}

Responde al usuario explicando el problema de manera clara y sugiere cómo puede reformular su pregunta o qué información necesitas.`;

        const response = await geminiClient.generateContent(errorPrompt);
        
        return {
          response,
          intent,
          dataQueried: true,
          error: pptoData.error
        };
      }

      // 6. Construir el prompt final con los datos
      const dataSection = pptoData && pptoData.success 
        ? `
PPTO_DATA:
${JSON.stringify(pptoData.data, null, 2)}
`
        : "PPTO_DATA: No hay datos disponibles";

      // Incluir historial si existe (limitar a últimos 5 mensajes para no saturar el prompt)
      const recentHistory = history.slice(-5);
      const historySection = recentHistory.length > 0
        ? `\n\nHistorial reciente de conversación:\n${recentHistory.map(h => `${h.role === "user" ? "Usuario" : "Asistente"}: ${h.content}`).join("\n")}`
        : "";

      const finalPrompt = `${SYSTEM_PROMPT}
${historySection}

${dataSection}

Usuario: ${message}

Responde usando ÚNICAMENTE los datos de PPTO_DATA. Formatea los montos claramente con separadores de miles y dos decimales. Si la pregunta es sobre totales y detalles mensuales, proporciona ambos.`;

      const response = await geminiClient.generateContent(finalPrompt);

      return {
        response,
        intent,
        dataQueried: true,
        data: pptoData?.success ? pptoData.data : null
      };

    } catch (error: any) {
      console.error("Error en /assistant:", error);
      
      // Manejar errores de Gemini específicamente
      if (error.message?.includes("API_KEY_ERROR")) {
        return reply.code(500).send({
          error: "El servicio del asistente no está configurado correctamente. Por favor contacta al administrador.",
          response: "Lo siento, actualmente no puedo procesar tu solicitud debido a un problema de configuración. Por favor intenta más tarde."
        });
      }
      
      if (error.message?.includes("RATE_LIMIT")) {
        return reply.code(429).send({
          error: "Se ha excedido el límite de consultas al asistente",
          response: "Lo siento, he recibido demasiadas consultas en poco tiempo. Por favor intenta de nuevo en unos momentos."
        });
      }

      return reply.code(500).send({
        error: "Error interno del servidor",
        response: "Lo siento, tuve un problema al procesar tu solicitud. Por favor inténtalo de nuevo más tarde.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  });

  /**
   * GET /assistant/health
   * Verifica el estado del servicio del asistente
   */
  app.get("/assistant/health", { preHandler: [requireAuth, requirePermission("assistant")] }, async (req, reply) => {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    return {
      ok: hasApiKey,
      geminiConfigured: hasApiKey,
      message: hasApiKey 
        ? "Servicio del asistente operativo" 
        : "API Key de Gemini no configurada"
    };
  });
}
