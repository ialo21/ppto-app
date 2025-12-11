import React from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { FileText, Clock } from "lucide-react";

/**
 * SUBMÓDULO: Solicitud de Orden de Compra (PLACEHOLDER)
 * 
 * Vista preparada para futuro desarrollo del formulario de solicitud de OCs.
 * 
 * TODO - Funcionalidades pendientes:
 * - Formulario de solicitud de OC (sin número de OC asignado todavía)
 * - Flujo de aprobación (solicitante → aprobador → compras)
 * - Estados de solicitud (BORRADOR, SOLICITADO, APROBADO, RECHAZADO)
 * - Notificaciones por correo
 * - Historial de solicitudes por usuario
 * - Conversión de solicitud aprobada → OC definitiva
 * 
 * ESTRUCTURA PROPUESTA:
 * - Campos básicos: periodo, sustento, descripción, solicitante, proveedor estimado, monto estimado
 * - Adjuntos: cotizaciones, justificaciones
 * - Workflow: solicitud → aprobación gerencia → aprobación dirección → generación OC
 */

export default function OcSolicitudPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Solicitud de Orden de Compra</h1>
          <p className="text-sm text-slate-600 mt-1">Módulo en construcción</p>
        </div>
      </div>

      {/* Placeholder Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="text-brand-600" size={24} />
            <h2 className="text-lg font-medium">Formulario de Solicitud de OC</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 py-8">
            {/* Icono central */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center">
                <Clock className="text-brand-600" size={48} />
              </div>
            </div>

            {/* Mensaje principal */}
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold text-slate-800">
                Próximamente disponible
              </h3>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Este módulo permitirá a los usuarios solicitar órdenes de compra de manera formal, 
                con un flujo de aprobación estructurado antes de generar la OC definitiva.
              </p>
            </div>

            {/* Funcionalidades planificadas */}
            <div className="max-w-3xl mx-auto mt-8">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                Funcionalidades planificadas:
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-brand-600 font-bold">•</span>
                  <span>
                    <strong>Formulario de solicitud:</strong> Campos para periodo, sustento, descripción, 
                    proveedor estimado, monto estimado y adjuntos (cotizaciones, justificaciones).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-600 font-bold">•</span>
                  <span>
                    <strong>Flujo de aprobación:</strong> Solicitud → Aprobación Gerencia → 
                    Aprobación Dirección → Generación OC definitiva.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-600 font-bold">•</span>
                  <span>
                    <strong>Estados de solicitud:</strong> BORRADOR, SOLICITADO, EN_APROBACION, 
                    APROBADO, RECHAZADO, CONVERTIDO_A_OC.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-600 font-bold">•</span>
                  <span>
                    <strong>Notificaciones:</strong> Alertas por correo a aprobadores y solicitantes 
                    en cada cambio de estado.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-600 font-bold">•</span>
                  <span>
                    <strong>Historial:</strong> Vista de todas las solicitudes realizadas por el usuario, 
                    con filtros por estado y periodo.
                  </span>
                </li>
              </ul>
            </div>

            {/* Nota técnica */}
            <div className="max-w-2xl mx-auto mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                <strong>Nota técnica:</strong> La estructura de rutas, componentes y navegación ya está preparada. 
                El desarrollo del formulario y la lógica de negocio se implementará en una iteración futura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

