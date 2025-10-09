import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../api";

export default function Budget(){
  const { data: periods } = useQuery({ queryKey:["periods"], queryFn: async()=> (await api.get("/periods")).data });
  const { data: supports } = useQuery({ queryKey:["supports"], queryFn: async()=> (await api.get("/supports")).data });

  const [periodId, setPeriodId] = useState<number | null>(null);
  const { data: allocs, refetch } = useQuery({
    queryKey:["budgets", periodId],
    enabled: !!periodId,
    queryFn: async()=> (await api.get("/budgets", { params: { periodId } })).data
  });

  const [edited, setEdited] = useState<Record<number, string>>({});
  const save = useMutation({
    mutationFn: async ()=>{
      const items = Object.entries(edited).map(([supportId, amountLocal])=>({ supportId: Number(supportId), amountLocal: Number(amountLocal||0) }));
      return (await api.post("/budgets/upsert", { periodId, items })).data;
    },
    onSuccess: ()=> { setEdited({}); refetch(); }
  });

  return (
    <div>
      <h2>PPTO por Mes</h2>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span>Período:</span>
        <select value={periodId ?? ""} onChange={e=>setPeriodId(e.target.value? Number(e.target.value): null)}>
          <option value="">-- elegir --</option>
          {(periods||[]).map((p:any)=>(
            <option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>
          ))}
        </select>
        <button onClick={()=>save.mutate()} disabled={!periodId}>Guardar cambios</button>
      </div>

      {periodId && (
        <table border={1} cellPadding={6} style={{ width:"100%", marginTop:12 }}>
          <thead><tr><th>Support</th><th>Monto</th></tr></thead>
          <tbody>
            {(supports||[]).map((s:any)=>{
              const current = (allocs?.rows||[]).find((r:any)=> r.supportId===s.id)?.amountLocal ?? 0;
              const val = edited[s.id] ?? String(current);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <input style={{ width:120 }} value={val}
                      onChange={e=>setEdited(prev=>({ ...prev, [s.id]: e.target.value }))}/>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
