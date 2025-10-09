import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../api";

export default function ControlLines() {
  const { data: periods } = useQuery({ queryKey: ["periods"], queryFn: async () => (await api.get("/periods")).data });
  const [periodId, setPeriodId] = useState<number | null>(null);

  const { data: lines, refetch } = useQuery({
    queryKey: ["control-lines", periodId],
    enabled: !!periodId,
    queryFn: async () => (await api.get("/control-lines", { params: { periodId } })).data
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, accountingPeriodId, fxRateFinal }:{ id:number; accountingPeriodId:number; fxRateFinal?:number }) =>
      (await api.patch(`/control-lines/${id}/process`, { accountingPeriodId, fxRateFinal })).data,
    onSuccess: () => refetch()
  });

  const provMutation = useMutation({
    mutationFn: async ({ id, accountingPeriodId }:{ id:number; accountingPeriodId:number }) =>
      (await api.patch(`/control-lines/${id}/provisionado`, { accountingPeriodId })).data,
    onSuccess: () => refetch()
  });

  const createProvision = useMutation({
    mutationFn: async (payload:any) => (await api.post("/control-lines/provision", payload)).data,
    onSuccess: () => refetch()
  });

  const bulkProvision = useMutation({
    mutationFn: async (items:any[]) => (await api.post("/control-lines/provision/bulk", { items })).data,
    onSuccess: () => refetch()
  });

  const [procForm, setProcForm] = useState({ accountingPeriodId: "", fxRateFinal: "" });
  const [provForm, setProvForm] = useState({ supportId: "", periodId: "", accountingPeriodId: "", amountLocal: "", description: "" });
  const [bulkText, setBulkText] = useState("");

  const selectedPeriods = useMemo(()=>periods || [], [periods]);

  return (
    <div>
      <h2>Control Lines</h2>

      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span>Período:</span>
        <select value={periodId ?? ""} onChange={e=>setPeriodId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">-- elegir --</option>
          {selectedPeriods.map((p:any)=>(
            <option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 8, display:"flex", gap:8 }}>
        <button onClick={()=>{
          const p = new URLSearchParams();
          if (periodId) p.set("periodId", String(periodId));
          window.open(`http://localhost:3001/control-lines/export/csv?${p.toString()}`,"_blank");
        }}>Exportar CSV (por período)</button>

        <button onClick={()=>{
          const p = new URLSearchParams();
          if (periodId) p.set("accountingPeriodId", String(periodId));
          window.open(`http://localhost:3001/control-lines/export/csv?${p.toString()}`,"_blank");
        }}>Exportar CSV (mes contable)</button>
      </div>

      {lines && (
        <>
          <table border={1} cellPadding={6} style={{ marginTop: 12, width:"100%" }}>
            <thead>
              <tr>
                <th>ID</th><th>Tipo</th><th>Estado</th><th>Sustento</th><th>Moneda</th><th>Foreign</th><th>TC Prov</th><th>TC Final</th><th>Monto Local</th><th>Mes</th><th>Mes Contable</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((cl:any)=>(
                <tr key={cl.id}>
                  <td>{cl.id}</td>
                  <td>{cl.type}</td>
                  <td>{cl.state}</td>
                  <td>{cl.support?.name || cl.supportId}</td>
                  <td>{cl.currency}</td>
                  <td>{cl.amountForeign ?? ""}</td>
                  <td>{cl.fxRateProvisional ?? ""}</td>
                  <td>{cl.fxRateFinal ?? ""}</td>
                  <td>{cl.amountLocal}</td>
                  <td>{cl.period?.label}</td>
                  <td>{cl.accountingPeriod?.label ?? ""}</td>
                  <td style={{ display:"flex", gap:4 }}>
                    {/* Procesar */}
                    <button onClick={()=>{
                      const ap = Number(procForm.accountingPeriodId);
                      const fx = procForm.fxRateFinal ? Number(procForm.fxRateFinal) : undefined;
                      if(!ap){ alert("Mes contable requerido"); return; }
                      processMutation.mutate({ id: cl.id, accountingPeriodId: ap, fxRateFinal: fx });
                    }}>Procesar</button>

                    {/* Marcar Provisionado */}
                    <button onClick={()=>{
                      const ap = Number(procForm.accountingPeriodId);
                      if(!ap){ alert("Mes contable requerido"); return; }
                      provMutation.mutate({ id: cl.id, accountingPeriodId: ap });
                    }}>Provisionado</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:12 }}>
            <select value={procForm.accountingPeriodId} onChange={e=>setProcForm(f=>({ ...f, accountingPeriodId: e.target.value }))}>
              <option value="">Mes contable…</option>
              {selectedPeriods.map((p:any)=>(<option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>))}
            </select>
            <input placeholder="TC Final (USD)" value={procForm.fxRateFinal} onChange={e=>setProcForm(f=>({ ...f, fxRateFinal: e.target.value }))}/>
            <span style={{ gridColumn:"span 2" }}>(Usa estos valores para los botones de Procesar/Provisionado)</span>
          </div>

          <h3 style={{ marginTop:16 }}>Crear PROVISION (+) / LIBERACIÓN (-)</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
            <input placeholder="Support ID" value={provForm.supportId} onChange={e=>setProvForm(f=>({ ...f, supportId: e.target.value }))}/>
            <select value={provForm.periodId} onChange={e=>setProvForm(f=>({ ...f, periodId: e.target.value }))}>
              <option value="">Mes operativo…</option>
              {selectedPeriods.map((p:any)=>(<option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>))}
            </select>
            <select value={provForm.accountingPeriodId} onChange={e=>setProvForm(f=>({ ...f, accountingPeriodId: e.target.value }))}>
              <option value="">Mes contable…</option>
              {selectedPeriods.map((p:any)=>(<option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>))}
            </select>
            <input placeholder="Monto Local (+/-)" value={provForm.amountLocal} onChange={e=>setProvForm(f=>({ ...f, amountLocal: e.target.value }))}/>
            <input placeholder="Descripción" value={provForm.description} onChange={e=>setProvForm(f=>({ ...f, description: e.target.value }))}/>
          </div>
          <div style={{ marginTop:8 }}>
            <button onClick={()=>{
              const payload = {
                supportId: Number(provForm.supportId),
                periodId: Number(provForm.periodId),
                accountingPeriodId: Number(provForm.accountingPeriodId),
                amountLocal: Number(provForm.amountLocal),
                description: provForm.description || undefined
              };
              if (Object.values(payload).some(v=>Number.isNaN(v as any))) { alert("Completa todos los campos numéricos"); return; }
              createProvision.mutate(payload as any);
            }}>Crear PROVISION / LIBERACIÓN</button>
          </div>

          <h3 style={{ marginTop:16 }}>Carga masiva (bulk) de PROVISIONES/LIBERACIONES</h3>
          <p>Formato por línea: <code>supportId,periodId,accountingPeriodId,amountLocal,descripcion</code></p>
          <textarea rows={6} style={{ width:"100%" }} value={bulkText} onChange={e=>setBulkText(e.target.value)} />
          <div>
            <button onClick={()=>{
              const items = bulkText.split(/\r?\n/).map(row=>{
                const [supportId, periodId, accountingPeriodId, amountLocal, description] = row.split(",").map(s=>s?.trim());
                if(!supportId) return null;
                return {
                  supportId: Number(supportId),
                  periodId: Number(periodId),
                  accountingPeriodId: Number(accountingPeriodId),
                  amountLocal: Number(amountLocal),
                  description: description || undefined
                }
              }).filter(Boolean) as any[];
              if (!items.length) { alert("No hay líneas válidas"); return; }
              bulkProvision.mutate(items);
            }}>Cargar PROVISIONES/LIBERACIONES</button>
          </div>
        </>
      )}
    </div>
  );
}
