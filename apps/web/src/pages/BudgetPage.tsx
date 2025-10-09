import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
export default function BudgetPage(){
  const { data: periods } = useQuery({ queryKey:["periods"], queryFn: async()=> (await api.get("/periods")).data });
  const { data: supports } = useQuery({ queryKey:["supports"], queryFn: async()=> (await api.get("/supports")).data });
  const [periodId, setPeriodId] = useState<number|undefined>();
  const { data: allocs, refetch } = useQuery({
    queryKey:["budgets",periodId],
    enabled: !!periodId,
    queryFn: async()=> (await api.get("/budgets",{ params:{ periodId } })).data
  });
  const [edited, setEdited] = useState<Record<number,string>>({});
  const save = useMutation({ mutationFn: async ()=>{
    const items = Object.entries(edited).map(([supportId, amountLocal])=>({ supportId: Number(supportId), amountLocal: Number(amountLocal||0) }));
    return (await api.post("/budgets/upsert",{ periodId, items })).data;
  }, onSuccess: ()=>{ setEdited({}); refetch(); }});
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">PPTO por mes</h1>
      <Card><CardHeader className="space-y-3">
        <Select value={periodId??""} onChange={e=>setPeriodId(Number(e.target.value))}>
          <option value="">Elige período…</option>
          {(periods||[]).map((p:any)=><option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>)}
        </Select>
        <Button onClick={()=>save.mutate()} disabled={!periodId}>Guardar cambios</Button>
      </CardHeader><CardContent>
        {periodId && (
          <Table>
            <thead><tr><Th>Sustento</Th><Th>Monto</Th></tr></thead>
            <tbody>
              {(supports||[]).map((s:any)=>{
                const current = (allocs?.rows||[]).find((r:any)=> r.supportId===s.id)?.amountLocal ?? 0;
                const val = edited[s.id] ?? String(current);
                return <tr key={s.id}><Td>{s.name}</Td>
                  <Td><Input value={val} onChange={e=>setEdited(prev=>({...prev,[s.id]:e.target.value}))}/></Td></tr>
              })}
            </tbody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
