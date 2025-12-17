import { useEffect, useRef, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

interface UseWebSocketOptions {
  onOcStatusChange?: (data: { ocId: number; newStatus: string; timestamp: string }) => void;
  onInvoiceStatusChange?: (data: { invoiceId: number; newStatus: string; timestamp: string }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

/**
 * Hook para gestionar conexión WebSocket con el backend
 * Reconecta automáticamente en caso de desconexión
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 segundos

  const connect = useCallback(() => {
    // Limpiar conexión existente
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Determinar URL del WebSocket
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";
      
      console.log("[WS] Conectando a:", wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("[WS] Conexión establecida");
        reconnectAttemptsRef.current = 0;
        options.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case "connected":
              console.log("[WS]", message.message);
              break;
              
            case "oc_status_change":
              if (options.onOcStatusChange && message.data) {
                options.onOcStatusChange(message.data);
              }
              break;
              
            case "invoice_status_change":
              if (options.onInvoiceStatusChange && message.data) {
                options.onInvoiceStatusChange(message.data);
              }
              break;
              
            default:
              console.log("[WS] Mensaje desconocido:", message.type);
          }
        } catch (err) {
          console.error("[WS] Error parseando mensaje:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        options.onError?.(error);
      };

      ws.onclose = () => {
        console.log("[WS] Conexión cerrada");
        options.onDisconnected?.();
        wsRef.current = null;

        // Intentar reconectar
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `[WS] Reintentando conexión (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) en ${reconnectDelay}ms...`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          console.error("[WS] Máximo de reintentos alcanzado");
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WS] Error creando WebSocket:", err);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect,
    disconnect
  };
}
