import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY no está configurada en las variables de entorno");
}

// Crear instancia de cliente Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

/**
 * Cliente para interactuar con Gemini 2.5 Flash
 */
export class GeminiClient {
  private model;

  constructor() {
    // Usar el modelo Gemini 2.5 Flash
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash" 
    });
  }

  /**
   * Genera contenido usando Gemini con un prompt y contexto
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error: any) {
      console.error("Error llamando a Gemini API:", error);
      
      // Manejar errores específicos
      if (error.message?.includes("API key")) {
        throw new Error("API_KEY_ERROR: La clave de API de Gemini no es válida o no está configurada");
      }
      
      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        throw new Error("RATE_LIMIT: Se ha excedido el límite de solicitudes a Gemini");
      }
      
      throw new Error(`GEMINI_ERROR: ${error.message || "Error desconocido al llamar a Gemini"}`);
    }
  }

  /**
   * Genera contenido con historial de chat
   */
  async chat(messages: Array<{ role: "user" | "assistant"; content: string }>, newMessage: string): Promise<string> {
    try {
      // Convertir historial a formato de Gemini
      const history = messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      const chat = this.model.startChat({ history });
      const result = await chat.sendMessage(newMessage);
      return result.response.text();
    } catch (error: any) {
      console.error("Error en chat con Gemini:", error);
      
      if (error.message?.includes("API key")) {
        throw new Error("API_KEY_ERROR: La clave de API de Gemini no es válida o no está configurada");
      }
      
      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        throw new Error("RATE_LIMIT: Se ha excedido el límite de solicitudes a Gemini");
      }
      
      throw new Error(`GEMINI_ERROR: ${error.message || "Error desconocido al llamar a Gemini"}`);
    }
  }

  /**
   * Genera contenido con function calling
   */
  async generateWithFunctionCalling(
    prompt: string,
    tools: ToolDefinition[],
    systemInstruction?: string
  ): Promise<{ text?: string; functionCalls?: FunctionCall[] }> {
    try {
      const formattedTools = [{
        functionDeclarations: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "OBJECT" as any,
            properties: tool.parameters.properties,
            required: tool.parameters.required
          }
        }))
      }];

      const modelWithTools = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: formattedTools as any,
        ...(systemInstruction && { systemInstruction })
      });

      const result = await modelWithTools.generateContent(prompt);
      const response = result.response;

      const functionCalls: FunctionCall[] = [];
      
      const candidates = response.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        
        for (const part of parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args || {}
            });
          }
        }
      }

      if (functionCalls.length > 0) {
        return { functionCalls };
      }

      return { text: response.text() };
    } catch (error: any) {
      console.error("Error en generateWithFunctionCalling:", error);
      
      if (error.message?.includes("API key")) {
        throw new Error("API_KEY_ERROR: La clave de API de Gemini no es válida o no está configurada");
      }
      
      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        throw new Error("RATE_LIMIT: Se ha excedido el límite de solicitudes a Gemini");
      }
      
      throw new Error(`GEMINI_ERROR: ${error.message || "Error desconocido al llamar a Gemini"}`);
    }
  }

  /**
   * Genera la respuesta final con resultados de herramientas
   */
  async generateFinalResponse(
    userMessage: string,
    toolResults: Array<{ toolName: string; result: any }>,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemInstruction: string
  ): Promise<string> {
    try {
      const historyContext = history.length > 0
        ? history.slice(-5).map(h => `${h.role === "user" ? "Usuario" : "Asistente"}: ${h.content}`).join("\n")
        : "";

      const toolResultsText = toolResults.map(tr => 
        `Herramienta: ${tr.toolName}\nResultado: ${JSON.stringify(tr.result, null, 2)}`
      ).join("\n\n");

      const finalPrompt = `${systemInstruction}

${historyContext ? `Historial reciente:\n${historyContext}\n\n` : ""}DATOS DE HERRAMIENTAS:
${toolResultsText}

Pregunta del usuario: ${userMessage}

Responde EXCLUSIVAMENTE basándote en los datos de las herramientas anteriores. Formatea los montos con separadores de miles y dos decimales. Si no hay datos suficientes, explica por qué y pide aclaración específica.`;

      const result = await this.model.generateContent(finalPrompt);
      return result.response.text();
    } catch (error: any) {
      console.error("Error generando respuesta final:", error);
      
      if (error.message?.includes("API key")) {
        throw new Error("API_KEY_ERROR: La clave de API de Gemini no es válida o no está configurada");
      }
      
      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        throw new Error("RATE_LIMIT: Se ha excedido el límite de solicitudes a Gemini");
      }
      
      throw new Error(`GEMINI_ERROR: ${error.message || "Error desconocido al llamar a Gemini"}`);
    }
  }
}

// Exportar instancia singleton
export const geminiClient = new GeminiClient();
