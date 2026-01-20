import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";
      
      console.log("[WS] Conectando a:", wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("[WS] Conexión establecida");
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case "connected":
              console.log("[WS]", message.message);
              break;
              
            case "oc_status_change":
              if (message.data) {
                console.log(`[WS] OC ${message.data.ocId} cambió a estado ${message.data.newStatus}`);
                queryClient.invalidateQueries({ queryKey: ["ocs"] });
              }
              break;
              
            case "invoice_status_change":
              if (message.data) {
                console.log(`[WS] Factura ${message.data.invoiceId} cambió a estado ${message.data.newStatus}`);
                queryClient.invalidateQueries({ queryKey: ["invoices"] });
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
      };

      ws.onclose = () => {
        console.log("[WS] Conexión cerrada");
        setIsConnected(false);
        wsRef.current = null;

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
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, reconnect: connect }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocketContext debe usarse dentro de un WebSocketProvider");
  }
  return context;
}
