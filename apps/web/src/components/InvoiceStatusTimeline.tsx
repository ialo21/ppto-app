import React from "react";
import { Check, X, Clock, Circle } from "lucide-react";

interface StatusHistoryEntry {
  id: number;
  status: string;
  changedAt: string;
  note?: string;
}

interface InvoiceStatusTimelineProps {
  history: StatusHistoryEntry[];
  currentStatus: string;
}

/**
 * Configuración de estados de Facturas
 * Basado en el enum InvStatus del schema.prisma
 */
const INVOICE_STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  iconColor: string;
}> = {
  INGRESADO: { 
    label: "Ingresado", 
    color: "text-gray-800", 
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600"
  },
  EN_APROBACION: { 
    label: "En Aprobación", 
    color: "text-yellow-800", 
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600"
  },
  EN_CONTABILIDAD: { 
    label: "En Contabilidad", 
    color: "text-blue-800", 
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  EN_TESORERIA: { 
    label: "En Tesorería", 
    color: "text-purple-800", 
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  EN_ESPERA_DE_PAGO: { 
    label: "En Espera de Pago", 
    color: "text-orange-800", 
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600"
  },
  PAGADO: { 
    label: "Pagado", 
    color: "text-green-800", 
    bgColor: "bg-green-100",
    iconColor: "text-green-600"
  },
  RECHAZADO: { 
    label: "Rechazado", 
    color: "text-red-800", 
    bgColor: "bg-red-100",
    iconColor: "text-red-600"
  }
};

/**
 * Flujo ideal de estados de Facturas
 * RECHAZADO NO está incluido en el flujo normal (solo aparece si la factura fue rechazada)
 */
const IDEAL_FLOW = [
  "INGRESADO", 
  "EN_APROBACION", 
  "EN_CONTABILIDAD", 
  "EN_TESORERIA", 
  "EN_ESPERA_DE_PAGO", 
  "PAGADO"
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusIcon(status: string, isReached: boolean, isRejected: boolean) {
  if (isRejected && status === "RECHAZADO") {
    return <X size={20} className="text-red-600" />;
  }
  
  if (isReached) {
    return <Check size={20} className="text-green-600" />;
  }
  
  return <Circle size={16} className="text-gray-300" />;
}

export default function InvoiceStatusTimeline({ history, currentStatus }: InvoiceStatusTimelineProps) {
  const isRejected = currentStatus === "RECHAZADO";
  
  /**
   * Para flujo rechazado, mostrar todos los estados del historial en orden cronológico
   * Para flujo normal, mostrar solo el flujo ideal
   */
  const timelineStatuses = isRejected 
    ? [...new Set([...history.map(h => h.status)])]
    : IDEAL_FLOW;

  /**
   * Crear mapa de fechas: usar la ÚLTIMA ocurrencia de cada estado (más reciente)
   * Esto maneja correctamente los casos de retroceso de estado
   */
  const statusDates = new Map<string, string>();
  history.forEach(h => {
    const existing = statusDates.get(h.status);
    if (!existing || new Date(h.changedAt) > new Date(existing)) {
      statusDates.set(h.status, h.changedAt);
    }
  });

  /**
   * Determinar qué estados están realmente alcanzados según el estado actual
   * Solo marcar como alcanzados los estados hasta la posición del estado actual en el flujo ideal
   */
  const reachedStatuses = new Set<string>();
  
  if (isRejected) {
    // Si está rechazado, marcar todos los estados del historial como alcanzados
    history.forEach(h => reachedStatuses.add(h.status));
  } else {
    // Para flujo normal, marcar como alcanzados solo hasta el estado actual
    const currentIndex = IDEAL_FLOW.indexOf(currentStatus);
    if (currentIndex >= 0) {
      // Marcar como alcanzados solo los estados que:
      // 1. Están antes o en la posición actual del flujo ideal
      // 2. Y que efectivamente aparecen en el historial
      for (let i = 0; i <= currentIndex; i++) {
        const status = IDEAL_FLOW[i];
        if (statusDates.has(status)) {
          reachedStatuses.add(status);
        }
      }
    }
    // Siempre marcar el estado actual como alcanzado aunque no esté en el historial aún
    reachedStatuses.add(currentStatus);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-brand-text-primary mb-2">
          Evolución de Estados
        </h3>
        <p className="text-sm text-brand-text-secondary">
          {isRejected 
            ? "Esta factura fue rechazada" 
            : "Flujo de estados de la factura"}
        </p>
      </div>

      <div className="space-y-6">
        {timelineStatuses.map((status, index) => {
          const config = INVOICE_STATUS_CONFIG[status];
          const isReached = reachedStatuses.has(status);
          const isCurrent = status === currentStatus;
          const isLast = index === timelineStatuses.length - 1;
          const date = statusDates.get(status);

          return (
            <div key={status} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-200
                      ${isReached ? config.bgColor : 'bg-gray-100'}
                      ${isCurrent ? 'ring-4 ring-brand-primary/20 shadow-lg' : ''}
                    `}
                  >
                    {getStatusIcon(status, isReached, isRejected && status === "RECHAZADO")}
                  </div>
                  
                  {!isLast && (
                    <div 
                      className={`
                        w-0.5 h-16 mt-2
                        ${isReached && reachedStatuses.has(timelineStatuses[index + 1])
                          ? 'bg-green-400' 
                          : 'bg-gray-200'}
                      `}
                    />
                  )}
                </div>

                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className={`
                        px-3 py-1 rounded-full text-sm font-medium
                        ${config.bgColor} ${config.color}
                      `}
                    >
                      {config.label}
                    </span>
                    
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-primary text-white">
                        Actual
                      </span>
                    )}
                  </div>

                  {date ? (
                    <p className="text-sm text-brand-text-primary font-medium mt-2">
                      {formatDate(date)}
                    </p>
                  ) : (
                    <p className="text-sm text-brand-text-disabled italic mt-2">
                      Pendiente
                    </p>
                  )}

                  {!isReached && !isRejected && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-brand-text-secondary">
                      <Clock size={14} />
                      <span>En espera</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isRejected && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <X size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                Factura Rechazada
              </p>
              <p className="text-xs text-red-700 mt-1">
                Esta factura fue rechazada el {formatDate(statusDates.get("RECHAZADO") || new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isRejected && currentStatus === "PAGADO" && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                Factura Pagada
              </p>
              <p className="text-xs text-green-700 mt-1">
                Esta factura fue pagada exitosamente
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
