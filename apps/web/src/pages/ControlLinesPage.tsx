import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
export default function ControlLinesPage(){
  const { data: periods } = useQuery({ queryKey:["periods"], queryFn: async()=> (await api.get("/periods")).data });
  const [periodId, setPeriodId] = useState<number|undefined>();
  const { data: lines, refetch } = useQuery({
    queryKey:["control-lines",periodId],
    enabled: !!periodId,
    queryFn: async()=> (await api.get("/control-lines",{ params:{ periodId } })).data
  });
  const [proc, setProc] = useState({ accountingPeriodId:"", fxRateFinal:"" });
  const process = useMutation({
    mutationFn: async (row:any)=>{
      const ap = Number(proc.accountingPeriodId);
      const fx = proc.fxRateFinal ? Number(proc.fxRateFinal) : undefined;
      return (await api.patch(`/control-lines/${row.id}/process`,{ accountingPeriodId: ap, fxRateFinal: fx })).data;
    },
    onSuccess: ()=> refetch()
  });
  const provisionado = useMutation({
    mutationFn: async (row:any)=>{
      const ap = Number(proc.accountingPeriodId);
      return (await api.patch(`/control-lines/${row.id}/provisionado`,{ accountingPeriodId: ap })).data;
    },
    onSuccess: ()=> refetch()
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Control Lines</h1>
      <Card><CardHeader className="grid gap-3 md:grid-cols-4">
        <Select value={periodId??""} onChange={e=>setPeriodId(Number(e.target.value))}>
          <option value="">Período…</option>
          {(periods||[]).map((p:any)=><option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>)}
        </Select>
        <Select value={proc.accountingPeriodId} onChange={e=>setProc(f=>({...f, accountingPeriodId: e.target.value}))}>
          <option value="">Mes contable…</option>
          {(periods||[]).map((p:any)=><option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>)}
        </Select>
        <Input placeholder="TC Final (USD)" value={proc.fxRateFinal} onChange={e=>setProc(f=>({...f, fxRateFinal: e.target.value}))}/>
        <div className="flex gap-2">
          <Button onClick={()=>window.open(`http://localhost:3001/control-lines/export/csv?${new URLSearchParams(periodId?{periodId:String(periodId)}:{})}`,"_blank")}>CSV período</Button>
          <Button variant="secondary" onClick={()=>window.open(`http://localhost:3001/control-lines/export/csv?${new URLSearchParams(proc.accountingPeriodId?{accountingPeriodId:proc.accountingPeriodId}:{})}`,"_blank")}>CSV contable</Button>
        </div>
      </CardHeader><CardContent>
        {!lines? "Elige un período…" : (
          <Table>
            <thead>
              <tr><Th>ID</Th><Th>Tipo</Th><Th>Estado</Th><Th>Sustento</Th><Th>Moneda</Th><Th>Foreign</Th><Th>TC Prov</Th><Th>TC Final</Th><Th>Local</Th><Th>Acciones</Th></tr>
            </thead>
            <tbody>
              {lines.map((r:any)=>(
                <tr key={r.id}>
                  <Td>{r.id}</Td><Td>{r.type}</Td><Td>{r.state}</Td><Td>{r.support?.name||r.supportId}</Td>
                  <Td>{r.currency}</Td><Td>{r.amountForeign??""}</Td><Td>{r.fxRateProvisional??""}</Td><Td>{r.fxRateFinal??""}</Td><Td>{r.amountLocal}</Td>
                  <Td className="flex gap-2">
                    <Button size="sm" onClick={()=>process.mutate(r)}>Procesar</Button>
                    <Button size="sm" variant="secondary" onClick={()=>provisionado.mutate(r)}>Provisionado</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
