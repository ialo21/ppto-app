import React, { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
import Button from "../components/ui/Button";
import { Send, Sparkles, MessageSquare, AlertCircle, Bot, User } from "lucide-react";
import { toast } from "sonner";

/**
 * Asistente conversacional con Gemini 2.5 Flash
 * Permite consultar presupuesto en lenguaje natural
 */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll automático al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Ajustar altura del textarea automáticamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Agregar mensaje del usuario a la lista
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Preparar historial (últimos 10 mensajes para no saturar el prompt)
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Llamar al endpoint del asistente
      const response = await api.post("/assistant", {
        message: userMessage.content,
        history,
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error al consultar el asistente:", error);

      // Extraer mensaje de error del backend si está disponible
      const errorMessage =
        error.response?.data?.response ||
        error.response?.data?.error ||
        "Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.";

      const errorAssistantMessage: Message = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev, errorAssistantMessage]);
      
      toast.error("Error al consultar el asistente");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Conversación limpiada");
  };

  // Mensaje de bienvenida
  const welcomeMessage = messages.length === 0 && (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-2xl mx-auto">
      <div className="bg-brand-primary/10 p-4 rounded-full mb-4">
        <Sparkles size={40} className="text-brand-primary" />
      </div>
      <h2 className="text-2xl font-bold text-brand-text-primary mb-2">
        Asistente de Presupuesto
      </h2>
      <p className="text-sm text-brand-text-secondary mb-6">
        Pregúntame sobre presupuesto, líneas de sustento, ejecución y más.
        Puedo ayudarte a consultar datos de forma conversacional.
      </p>
      <div className="space-y-2 text-left w-full">
        <p className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wide">
          Ejemplos de preguntas:
        </p>
        <div className="space-y-2">
          {[
            "¿Cuánto presupuesto hay para la línea Servicio Gestion de infraestructura en 2025?",
            "Dame el total y detalle mensual de Agilidad Servicios Externos en 2025",
            "¿Qué meses de 2025 tienen presupuesto para Chatbots - Soporte?",
          ].map((example, idx) => (
            <button
              key={idx}
              onClick={() => setInputMessage(example)}
              className="w-full text-left px-4 py-2.5 bg-white border border-brand-border rounded-lg hover:border-brand-primary hover:bg-brand-background transition-all text-xs text-brand-text-secondary"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-text-primary flex items-center gap-2">
            <Sparkles size={28} className="text-brand-primary" />
            Asistente
          </h1>
          <p className="text-sm text-brand-text-secondary mt-1">
            Consulta presupuesto en lenguaje natural
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat}>
            Limpiar chat
          </Button>
        )}
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-white border border-brand-border rounded-xl overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {welcomeMessage}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-lg ${
                    message.error ? 'bg-status-error/10' : 'bg-brand-primary/10'
                  }`}>
                    {message.error ? (
                      <AlertCircle size={20} className="text-status-error" />
                    ) : (
                      <Bot size={20} className="text-brand-primary" />
                    )}
                  </div>
                </div>
              )}

              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-brand-primary text-white"
                    : message.error
                    ? "bg-status-error/10 border border-status-error/20 text-brand-text-primary"
                    : "bg-brand-background text-brand-text-primary border border-brand-border"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
                <p
                  className={`text-[10px] mt-2 ${
                    message.role === "user"
                      ? "text-white/70"
                      : "text-brand-text-disabled"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="p-2 rounded-lg bg-brand-primary/10">
                    <User size={20} className="text-brand-primary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-brand-primary/10">
                  <Bot size={20} className="text-brand-primary" />
                </div>
              </div>
              <div className="bg-brand-background border border-brand-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-brand-text-secondary">
                    Pensando...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-brand-border p-4 bg-brand-background">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta sobre presupuesto... (Enter para enviar, Shift+Enter para nueva línea)"
                disabled={isLoading}
                rows={1}
                className="w-full resize-none px-4 py-3 pr-12 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                style={{ maxHeight: "150px" }}
              />
              {inputMessage.trim() && !isLoading && (
                <div className="absolute right-2 bottom-2">
                  <MessageSquare size={16} className="text-brand-text-disabled" />
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="flex-shrink-0"
              size="md"
            >
              <Send size={18} />
            </Button>
          </div>
          <p className="text-[10px] text-brand-text-disabled mt-2 text-center">
            El asistente usa Gemini 2.5 Flash para responder basándose únicamente en datos reales de la base de datos
          </p>
        </div>
      </div>
    </div>
  );
}
