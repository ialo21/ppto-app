import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Select from "../components/ui/Select";
import { Table, Th, Td } from "../components/ui/Table";
import Button from "../components/ui/Button";
export default function ReportsPage(){
  const { data: periods } = useQuery({ queryKey:["periods"], queryFn: async()=> (await api.get("/periods")).data });
  const [periodId, setPeriodId] = useState<number|undefined>();
  const { data: report } = useQuery({ queryKey:["report",periodId], enabled: !!periodId, queryFn: async()=> (await api.get("/reports/execution",{ params:{ periodId } })).data });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reportes</h1>
      <Card><CardHeader className="flex gap-3">
        <Select value={periodId??""} onChange={e=>setPeriodId(Number(e.target.value))}>
          <option value="">Período contable…</option>
          {(periods||[]).map((p:any)=><option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2,"0")} {p.label||""}</option>)}
        </Select>
        {periodId && <Button onClick={()=>window.open(`http://localhost:3001/reports/execution/csv?periodId=${periodId}`,"_blank")}>Exportar CSV</Button>}
      </CardHeader><CardContent>
        {!report? "Elige un período…" : (
          <Table>
            <thead><tr><Th>Sustento</Th><Th>PPTO</Th><Th>Ejecución</Th><Th>Provisiones</Th><Th>Disponible</Th></tr></thead>
            <tbody>
              {report.rows.map((r:any)=>(
                <tr key={r.supportId}>
                  <Td>{r.supportName}</Td><Td>{r.budget.toFixed(2)}</Td><Td>{r.executed_real.toFixed(2)}</Td><Td>{r.provisions.toFixed(2)}</Td><Td><b>{r.available.toFixed(2)}</b></Td>
                </tr>
              ))}
              <tr><Td><b>Totales</b></Td><Td><b>{report.totals.budget.toFixed(2)}</b></Td><Td><b>{report.totals.executed_real.toFixed(2)}</b></Td><Td><b>{report.totals.provisions.toFixed(2)}</b></Td><Td><b>{report.totals.available.toFixed(2)}</b></Td></tr>
            </tbody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
