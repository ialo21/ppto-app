import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuth, requirePermission, AuthUser } from "./auth";
import { geminiClient } from "./gemini-client";
import {
  toolDefinitions,
  toolSchemas,
  toolExecutors,
  ToolName
} from "./assistant-tools";

const SYSTEM_PROMPT = `Eres el Asistente de Presupuesto de PPTO App. Respondes consultas sobre presupuesto, facturas y órdenes de compra usando EXCLUSIVAMENTE datos de herramientas (tools).

CONTEXTO DE NEGOCIO CLAVE:
- Cuando un usuario crea una solicitud de OC, el sistema genera un INC (incidente)
- El INC representa el workflow/solicitud y puede existir sin N° de OC
- Solo cuando la solicitud se completa, se genera el N° de OC definitivo
- Un INC está asociado a una sola OC eventualmente:
  - Pre-OC: INC existe, OC aún no existe
  - Post-OC: INC existe y ya tiene N° OC

REGLAS ABSOLUTAS:

1. Nunca inventes cifras, documentos, estados o nombres
2. Si no hay datos suficientes, pide aclaración específica (año, línea, CECO, etc.)
3. Si una tool devuelve error, explícalo y sugiere cómo reformular
4. Siempre formatea montos con separadores de miles y 2 decimales, indicando moneda
5. En detalle mensual, muestra solo meses con monto > 0 (salvo que pidan explícitamente ceros)
6. "Línea", "línea de sustento" y "sustento" son sinónimos

FLUJO OBLIGATORIO PARA CONSULTAS POR IDENTIFICADOR:

Si detectas un INC (INCxxxx o número de incidente):
1. Llama getOcRequestStatusByIncidentId
2. Responde con detalle completo de la solicitud (todos los campos disponibles)
3. Si la respuesta incluye ocNumber:
   - Llama getOcByNumber(ocNumber)
   - Llama SIEMPRE listInvoicesByOcNumber(ocNumber)
   - Responde también con detalle de OC + facturas asociadas

Si detectas un N° OC (ej: 4500012345):
1. Llama getOcByNumber(ocNumber)
2. Llama SIEMPRE listInvoicesByOcNumber(ocNumber) aunque el usuario no lo pida
3. Responde con detalle completo de OC + resumen de facturas (o "0 facturas asociadas")

Si detectas un N° de Factura (ej: F001-21424):
1. Llama getInvoiceByNumber(invoiceNumber)
2. Responde con detalle completo de la factura
3. Si la factura está asociada a una OC y el usuario pide contexto, también llama getOcByNumber y listInvoicesByOcNumber

REGLA DE RESPUESTA POR IDENTIFICADOR:
Cuando el usuario consulte por INC, N° OC o N° Factura:
1. Responde de forma CONVERSACIONAL y NATURAL, no como un listado técnico
2. Prioriza la información más relevante según el estado del documento:
   - Si está en proceso: enfatiza el estado actual y próximos pasos esperados
   - Si está completado/pagado: enfatiza los totales y fechas clave
   - Si tiene problemas: enfatiza qué falta o está pendiente
3. OMITE campos que son null/no disponibles en lugar de listar "no disponible"
4. Agrupa información relacionada de forma lógica (no campo por campo)
5. Usa formato amigable: montos con separadores, fechas legibles, estados traducidos
6. Si un documento está en estado inicial (ej: INGRESADO), es NORMAL que falten campos como fecha de aprobación - no lo menciones como problema

Ejemplo de respuesta INCORRECTA (muy técnica):
"**Monto Sin IGV:** 1,232.00 USD\n**Fecha de Aprobación:** no disponible\n**Mes Contable:** no disponible"

Ejemplo de respuesta CORRECTA (natural):
"La factura está en estado INGRESADO con un monto de USD 1,232.00 (aprox. PEN 4,558.40). Está asociada a la OC92123 del proveedor Hewlett y pendiente de avanzar en el flujo de aprobación."

Si hay múltiples matches, devuelve los candidatos y pide confirmación (proveedor/año/monto).

PROCESO GENERAL:

1. Interpreta la pregunta
2. Identifica qué tools necesitas (búsquedas, consultas)
3. Si faltan filtros críticos, DETENTE y pide aclaración
4. Usa tools para obtener datos
5. Responde basándote SOLO en resultados de tools

ALCANCE:

- Presupuesto (PPTO): asignaciones por línea/CECO/año/mes
- Facturas: totales, estados, agrupaciones, detalle por número
- OCs: totales, estados, agrupaciones, detalle por número o INC
- Consultas por identificador: INC, N° OC, N° Factura
- Si preguntan algo fuera de esto, explica el alcance

Siempre tono claro, conciso y profesional.`;

const assistantMessageSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío"),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  })).optional().default([])
});

interface ToolCallResult {
  toolName: string;
  params: any;
  result: any;
  error?: string;
  executionTimeMs: number;
}

const MAX_TOOL_EXECUTION_TIME_MS = 10000;
const MAX_RETRIES = 1;

async function executeToolWithTimeout(
  toolName: ToolName,
  params: any,
  timeoutMs: number
): Promise<any> {
  return Promise.race([
    toolExecutors[toolName](params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    )
  ]);
}

async function executeTool(
  toolName: string,
  params: any,
  user: AuthUser
): Promise<ToolCallResult> {
  const startTime = Date.now();
  
  try {
    if (!toolExecutors[toolName as ToolName]) {
      return {
        toolName,
        params,
        result: null,
        error: `Herramienta '${toolName}' no existe`,
        executionTimeMs: Date.now() - startTime
      };
    }

    const schema = toolSchemas[toolName as ToolName];
    if (!schema) {
      return {
        toolName,
        params,
        result: null,
        error: `Schema no encontrado para '${toolName}'`,
        executionTimeMs: Date.now() - startTime
      };
    }

    const validated = schema.parse(params);

    const result = await executeToolWithTimeout(
      toolName as ToolName,
      validated,
      MAX_TOOL_EXECUTION_TIME_MS
    );

    return {
      toolName,
      params: validated,
      result,
      executionTimeMs: Date.now() - startTime
    };

  } catch (error: any) {
    if (error.message === "TIMEOUT") {
      return {
        toolName,
        params,
        result: null,
        error: "La consulta tomó demasiado tiempo. Intenta con filtros más específicos.",
        executionTimeMs: Date.now() - startTime
      };
    }

    if (error instanceof z.ZodError) {
      return {
        toolName,
        params,
        result: null,
        error: `Parámetros inválidos: ${error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        executionTimeMs: Date.now() - startTime
      };
    }

    console.error(`Error ejecutando tool ${toolName}:`, error);
    return {
      toolName,
      params,
      result: null,
      error: "Error consultando datos, intenta de nuevo",
      executionTimeMs: Date.now() - startTime
    };
  }
}

async function phase1_planning(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ functionCalls?: Array<{ name: string; args: any }>; directResponse?: string }> {
  try {
    const historyContext = history.length > 0
      ? `\n\nHistorial reciente:\n${history.slice(-3).map(h => `${h.role === "user" ? "Usuario" : "Asistente"}: ${h.content}`).join("\n")}`
      : "";

    const planningPrompt = `${message}${historyContext}

Analiza la pregunta del usuario y determina qué herramientas necesitas para responderla. Si la pregunta es genérica (saludos, "qué puedes hacer", etc.) o no requiere datos específicos, responde directamente sin usar herramientas.`;

    const result = await geminiClient.generateWithFunctionCalling(
      planningPrompt,
      toolDefinitions,
      SYSTEM_PROMPT
    );

    if (result.functionCalls && result.functionCalls.length > 0) {
      return { functionCalls: result.functionCalls };
    }

    if (result.text) {
      return { directResponse: result.text };
    }

    return { directResponse: "No pude entender tu pregunta. ¿Podrías reformularla?" };

  } catch (error: any) {
    console.error("Error en fase de planificación:", error);
    throw error;
  }
}

async function phase2_execution(
  functionCalls: Array<{ name: string; args: any }>,
  user: AuthUser
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];

  for (const call of functionCalls) {
    const result = await executeTool(call.name, call.args, user);
    results.push(result);

    if (result.error) {
      console.log(`[Assistant] Tool ${call.name} failed: ${result.error}`);
    }
  }

  return results;
}

async function phase3_response(
  userMessage: string,
  toolResults: ToolCallResult[],
  history: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  try {
    const formattedResults = toolResults.map(tr => ({
      toolName: tr.toolName,
      result: tr.error ? { error: tr.error } : tr.result
    }));

    const response = await geminiClient.generateFinalResponse(
      userMessage,
      formattedResults,
      history,
      SYSTEM_PROMPT
    );

    return response;

  } catch (error: any) {
    console.error("Error en fase de respuesta:", error);
    throw error;
  }
}

export async function registerAssistantRoutes(app: FastifyInstance) {
  app.post(
    "/assistant",
    { preHandler: [requireAuth, requirePermission("assistant")] },
    async (req, reply) => {
      const startTime = Date.now();
      const user = (req as any).user as AuthUser;

      const parsed = assistantMessageSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: parsed.error.errors
        });
      }

      const { message, history } = parsed.data;

      try {
        console.log(`[Assistant] User ${user.email} asked: "${message}"`);

        const phase1Result = await phase1_planning(message, history);

        if (phase1Result.directResponse) {
          console.log(`[Assistant] Direct response (no tools needed)`);
          return {
            response: phase1Result.directResponse,
            metadata: {
              toolsUsed: [],
              executionTimeMs: Date.now() - startTime
            }
          };
        }

        if (!phase1Result.functionCalls || phase1Result.functionCalls.length === 0) {
          return {
            response: "No pude identificar qué información necesitas. ¿Podrías ser más específico?",
            metadata: {
              toolsUsed: [],
              executionTimeMs: Date.now() - startTime
            }
          };
        }

        console.log(`[Assistant] Tools to execute: ${phase1Result.functionCalls.map(fc => fc.name).join(", ")}`);

        const toolResults = await phase2_execution(phase1Result.functionCalls, user);

        const hasErrors = toolResults.some(tr => tr.error);
        if (hasErrors) {
          console.log(`[Assistant] Some tools failed`);
        }

        const response = await phase3_response(message, toolResults, history);

        const totalExecutionTime = Date.now() - startTime;
        console.log(`[Assistant] Request completed in ${totalExecutionTime}ms`);

        return {
          response,
          metadata: {
            toolsUsed: toolResults.map(tr => tr.toolName),
            toolResults: toolResults.map(tr => ({
              tool: tr.toolName,
              executionTimeMs: tr.executionTimeMs,
              hasError: !!tr.error
            })),
            executionTimeMs: totalExecutionTime
          }
        };

      } catch (error: any) {
        console.error("Error en /assistant:", error);
        
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
    }
  );

  app.get(
    "/assistant/health",
    { preHandler: [requireAuth, requirePermission("assistant")] },
    async (req, reply) => {
      const hasApiKey = !!process.env.GEMINI_API_KEY;
      
      return {
        ok: hasApiKey,
        geminiConfigured: hasApiKey,
        toolsAvailable: Object.keys(toolExecutors),
        message: hasApiKey 
          ? "Servicio del asistente operativo (Tool Calling v2)" 
          : "API Key de Gemini no configurada"
      };
    }
  );

  app.get(
    "/assistant/tools",
    { preHandler: [requireAuth, requirePermission("assistant")] },
    async (req, reply) => {
      return {
        tools: toolDefinitions.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      };
    }
  );
}
