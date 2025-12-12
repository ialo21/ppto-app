import React from "react";
import { Check, X, Clock, Circle } from "lucide-react";

interface StatusHistoryEntry {
  id: number;
  status: string;
  changedAt: string;
  changedBy?: number;
  note?: string;
}

interface OcStatusTimelineProps {
  history: StatusHistoryEntry[];
  currentStatus: string;
}

const OC_STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  iconColor: string;
}> = {
  PENDIENTE: { 
    label: "Pendiente", 
    color: "text-gray-800", 
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600"
  },
  PROCESAR: { 
    label: "Procesar", 
    color: "text-yellow-800", 
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600"
  },
  PROCESADO: { 
    label: "Procesado", 
    color: "text-blue-800", 
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  APROBACION_VP: { 
    label: "Aprobación VP", 
    color: "text-purple-800", 
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  ANULAR: { 
    label: "Anular", 
    color: "text-orange-800", 
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600"
  },
  ANULADO: { 
    label: "Anulado", 
    color: "text-red-800", 
    bgColor: "bg-red-100",
    iconColor: "text-red-600"
  },
  ATENDER_COMPRAS: { 
    label: "Atender Compras", 
    color: "text-indigo-800", 
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600"
  },
  ATENDIDO: { 
    label: "Atendido", 
    color: "text-green-800", 
    bgColor: "bg-green-100",
    iconColor: "text-green-600"
  }
};

const IDEAL_FLOW = ["PENDIENTE", "APROBACION_VP", "ATENDER_COMPRAS", "ATENDIDO"];

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

function getStatusIcon(status: string, isReached: boolean, isCancelled: boolean) {
  if (isCancelled && status === "ANULADO") {
    return <X size={20} className="text-red-600" />;
  }
  
  if (isReached) {
    return <Check size={20} className="text-green-600" />;
  }
  
  return <Circle size={16} className="text-gray-300" />;
}

export default function OcStatusTimeline({ history, currentStatus }: OcStatusTimelineProps) {
  const isCancelled = currentStatus === "ANULADO";
  
  // Para flujo cancelado, mostrar todos los estados del historial en orden cronológico
  const timelineStatuses = isCancelled 
    ? [...new Set([...history.map(h => h.status)])]
    : IDEAL_FLOW;

  // Crear mapa de fechas: usar la ÚLTIMA ocurrencia de cada estado (más reciente)
  const statusDates = new Map<string, string>();
  history.forEach(h => {
    const existing = statusDates.get(h.status);
    // Si no existe o la fecha actual es más reciente, actualizar
    if (!existing || new Date(h.changedAt) > new Date(existing)) {
      statusDates.set(h.status, h.changedAt);
    }
  });

  // Determinar qué estados están realmente alcanzados según el estado actual
  // Solo marcar como alcanzados los estados hasta la posición del estado actual en el flujo ideal
  const reachedStatuses = new Set<string>();
  
  if (isCancelled) {
    // Si está anulado, marcar todos los estados del historial como alcanzados
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
          {isCancelled 
            ? "Esta orden de compra fue anulada" 
            : "Flujo de estados de la orden de compra"}
        </p>
      </div>

      <div className="space-y-6">
        {timelineStatuses.map((status, index) => {
          const config = OC_STATUS_CONFIG[status];
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
                    {getStatusIcon(status, isReached, isCancelled && status === "ANULADO")}
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

                  {!isReached && !isCancelled && (
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

      {isCancelled && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <X size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                Orden de Compra Anulada
              </p>
              <p className="text-xs text-red-700 mt-1">
                Esta OC fue cancelada el {formatDate(statusDates.get("ANULADO") || new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isCancelled && currentStatus === "ATENDIDO" && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                Orden de Compra Completada
              </p>
              <p className="text-xs text-green-700 mt-1">
                Esta OC fue atendida exitosamente
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
