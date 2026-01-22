import React from "react";
import Modal from "./ui/Modal";
import { TrendingUp, TrendingDown, Activity, Wallet, CheckCircle2, BarChart3, Calendar, Percent } from "lucide-react";

interface KpiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiType: "budget" | "executed" | "provisions" | "available" | "resultadoContable";
  value: number;
  totalBudget: number;
  mode: "execution" | "contable";
  year: number;
  budgetType?: "PPTO" | "RPPTO";
  seriesData?: Array<{
    label: string;
    value: number;
  }>;
}

export default function KpiDetailModal({
  isOpen,
  onClose,
  kpiType,
  value,
  totalBudget,
  mode,
  year,
  budgetType,
  seriesData = []
}: KpiDetailModalProps) {
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getKpiConfig = () => {
    const configs = {
      budget: {
        title: budgetType === "RPPTO" ? "Presupuesto Revisado (RPPTO)" : "Presupuesto Original (PPTO)",
        icon: Wallet,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        description: `Total de presupuesto ${budgetType === "RPPTO" ? "revisado" : "original"} asignado para el año ${year}`,
        percentage: 100,
        insights: [
          { label: "Tipo de presupuesto", value: budgetType === "RPPTO" ? "Revisado" : "Original" },
          { label: "Año fiscal", value: year.toString() },
          { label: "Promedio mensual", value: formatCurrency(value / 12) }
        ]
      },
      executed: {
        title: mode === "execution" ? "Gasto Ejecutado Real" : "Gasto Contabilizado",
        icon: TrendingUp,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        description: mode === "execution" 
          ? "Total de gastos ejecutados según distribución de facturas en períodos PPTO"
          : "Total de gastos contabilizados en el período contable",
        percentage: totalBudget > 0 ? (value / totalBudget) * 100 : 0,
        insights: [
          { label: "% del presupuesto", value: `${((value / totalBudget) * 100).toFixed(1)}%` },
          { label: "Saldo pendiente", value: formatCurrency(totalBudget - value) },
          { label: "Promedio mensual", value: formatCurrency(value / 12) }
        ]
      },
      provisions: {
        title: "Provisiones Acumuladas",
        icon: Activity,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        description: "Total de provisiones registradas en el sistema contable",
        percentage: totalBudget > 0 ? (value / totalBudget) * 100 : 0,
        insights: [
          { label: "% del presupuesto", value: `${((value / totalBudget) * 100).toFixed(1)}%` },
          { label: "Pendiente de provisionar", value: formatCurrency(totalBudget - value) },
          { label: "Promedio mensual", value: formatCurrency(value / 12) }
        ]
      },
      available: {
        title: "Saldo Disponible",
        icon: CheckCircle2,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "Presupuesto disponible después de descontar la ejecución real",
        percentage: totalBudget > 0 ? (value / totalBudget) * 100 : 0,
        insights: [
          { label: "% disponible", value: `${((value / totalBudget) * 100).toFixed(1)}%` },
          { label: "% ejecutado", value: `${(((totalBudget - value) / totalBudget) * 100).toFixed(1)}%` },
          { label: "Capacidad restante", value: value >= 0 ? "En presupuesto" : "Sobre ejecutado" }
        ]
      },
      resultadoContable: {
        title: "Resultado Contable",
        icon: BarChart3,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        description: "Suma de gasto ejecutado y provisiones contables",
        percentage: totalBudget > 0 ? (value / totalBudget) * 100 : 0,
        insights: [
          { label: "% del presupuesto", value: `${((value / totalBudget) * 100).toFixed(1)}%` },
          { label: "Saldo contable", value: formatCurrency(totalBudget - value) },
          { label: "Estado", value: value <= totalBudget ? "Dentro del presupuesto" : "Sobre presupuesto" }
        ]
      }
    };

    return configs[kpiType];
  };

  const config = getKpiConfig();
  const Icon = config.icon;

  const getPercentageColor = (percentage: number) => {
    if (kpiType === "available") {
      if (percentage >= 30) return "bg-green-500";
      if (percentage >= 15) return "bg-yellow-500";
      return "bg-red-500";
    }
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-4 ${config.bgColor} rounded-xl`}>
            <Icon className={`w-8 h-8 ${config.color}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-brand-text-primary mb-2">
              {config.title}
            </h2>
            <p className="text-sm text-brand-text-secondary">
              {config.description}
            </p>
          </div>
        </div>

        {/* Main Value */}
        <div className="bg-gradient-to-br from-brand-background to-white border border-brand-border rounded-xl p-6 mb-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-brand-text-secondary mb-2">Monto Total</p>
              <p className="text-4xl font-bold text-brand-text-primary">
                {formatCurrency(value)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-brand-text-secondary mb-2">Porcentaje</p>
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-brand-text-secondary" />
                <p className="text-3xl font-bold text-brand-primary">
                  {config.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getPercentageColor(config.percentage)}`}
                style={{ width: `${Math.min(config.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {config.insights.map((insight, idx) => (
            <div key={idx} className="bg-brand-background border border-brand-border rounded-lg p-4">
              <p className="text-xs text-brand-text-secondary uppercase font-semibold mb-2">
                {insight.label}
              </p>
              <p className="text-sm font-bold text-brand-text-primary">
                {insight.value}
              </p>
            </div>
          ))}
        </div>

        {/* Monthly Trend (if available) */}
        {seriesData.length > 0 && (
          <div className="border-t border-brand-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-brand-primary" />
              <h3 className="text-lg font-semibold text-brand-text-primary">
                Evolución Mensual
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto">
              {seriesData.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-brand-border rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <p className="text-xs text-brand-text-secondary mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-brand-text-primary">
                    {formatCurrency(item.value)}
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="h-full bg-brand-primary rounded-full"
                      style={{ 
                        width: `${Math.min((item.value / Math.max(...seriesData.map(s => s.value))) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>💡 Nota:</strong> Los datos mostrados reflejan el estado actual del presupuesto 
            en modo {mode === "execution" ? "Ejecución" : "Contable"} para el año {year}.
            {budgetType && ` Se está utilizando el ${budgetType === "RPPTO" ? "presupuesto revisado (RPPTO)" : "presupuesto original (PPTO)"}.`}
          </p>
        </div>
      </div>
    </Modal>
  );
}
