import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY no está configurada en las variables de entorno");
}

// Crear instancia de cliente Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
}

// Exportar instancia singleton
export const geminiClient = new GeminiClient();
