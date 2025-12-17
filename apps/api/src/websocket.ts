import { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";

// Almacenar conexiones WebSocket activas
const connections = new Set<any>();

export async function registerWebSocket(app: FastifyInstance) {
  // Registrar plugin de WebSocket
  await app.register(websocket);

  // Endpoint WebSocket para actualizaciones en tiempo real
  app.get("/ws", { websocket: true }, (connection, req) => {
    connections.add(connection);
    
    console.log(`[WS] Cliente conectado. Total: ${connections.size}`);
    
    connection.on("close", () => {
      connections.delete(connection);
      console.log(`[WS] Cliente desconectado. Total: ${connections.size}`);
    });

    connection.on("error", (err: Error) => {
      console.error("[WS] Error en conexión:", err);
      connections.delete(connection);
    });

    // Enviar mensaje de bienvenida
    connection.send(JSON.stringify({
      type: "connected",
      message: "WebSocket conectado exitosamente"
    }));
  });
}

/**
 * Broadcast de evento de cambio de estado de OC a todos los clientes conectados
 */
export function broadcastOcStatusChange(data: {
  ocId: number;
  newStatus: string;
  timestamp: string;
}) {
  const message = JSON.stringify({
    type: "oc_status_change",
    data
  });

  let sent = 0;
  let failed = 0;

  connections.forEach((connection) => {
    try {
      if (connection.readyState === 1) { // OPEN
        connection.send(message);
        sent++;
      } else {
        connections.delete(connection);
        failed++;
      }
    } catch (err: unknown) {
      console.error("[WS] Error broadcasting to client:", err);
      connections.delete(connection);
      failed++;
    }
  });

  if (sent > 0) {
    console.log(`[WS] Broadcast OC ${data.ocId} → ${data.newStatus}: ${sent} clientes, ${failed} fallos`);
  }
}

/**
 * Broadcast de evento de cambio de estado de Factura a todos los clientes conectados
 */
export function broadcastInvoiceStatusChange(data: {
  invoiceId: number;
  newStatus: string;
  timestamp: string;
}) {
  const message = JSON.stringify({
    type: "invoice_status_change",
    data
  });

  let sent = 0;
  let failed = 0;

  connections.forEach((connection) => {
    try {
      if (connection.readyState === 1) { // OPEN
        connection.send(message);
        sent++;
      } else {
        connections.delete(connection);
        failed++;
      }
    } catch (err: unknown) {
      console.error("[WS] Error broadcasting to client:", err);
      connections.delete(connection);
      failed++;
    }
  });

  if (sent > 0) {
    console.log(`[WS] Broadcast Invoice ${data.invoiceId} → ${data.newStatus}: ${sent} clientes, ${failed} fallos`);
  }
}
