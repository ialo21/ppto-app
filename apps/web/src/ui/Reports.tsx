import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { formatPeriodLabel } from "../utils/periodFormat";

export default function Reports(){
  const { data: periods } = useQuery({ queryKey:["periods"], queryFn: async()=> (await api.get("/periods")).data });
  const [periodId, setPeriodId] = useState<number | null>(null);

  const { data: report } = useQuery({
    queryKey: ["report-exec", periodId],
    enabled: !!periodId,
    queryFn: async ()=> (await api.get("/reports/execution", { params: { periodId } })).data
  });

  return (
    <div>
      <h2>Reportes — Ejecución vs PPTO</h2>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span>Período contable:</span>
        <select value={periodId ?? ""} onChange={e=>setPeriodId(e.target.value? Number(e.target.value): null)}>
          <option value="">-- elegir --</option>
          {(periods||[]).map((p:any)=>(
            <option key={p.id} value={p.id}>{formatPeriodLabel(p)}</option>
          ))}
        </select>
      </div>

      {report && (
        <>
          <table border={1} cellPadding={6} style={{ marginTop:12, width:"100%" }}>
            <thead>
              <tr>
                <th>Sustento</th>
                <th>PPTO</th>
                <th>Ejecución (Real)</th>
                <th>Provisiones (+/-)</th>
                <th>Disponible</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r:any)=>(
                <tr key={r.supportId}>
                  <td>{r.supportName}</td>
                  <td>{r.budget.toFixed(2)}</td>
                  <td>{r.executed_real.toFixed(2)}</td>
                  <td>{r.provisions.toFixed(2)}</td>
                  <td><b>{r.available.toFixed(2)}</b></td>
                </tr>
              ))}
              <tr>
                <td><b>Totales</b></td>
                <td><b>{report.totals.budget.toFixed(2)}</b></td>
                <td><b>{report.totals.executed_real.toFixed(2)}</b></td>
                <td><b>{report.totals.provisions.toFixed(2)}</b></td>
                <td><b>{report.totals.available.toFixed(2)}</b></td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
