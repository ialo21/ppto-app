import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import Select from "../components/ui/Select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

function Kpi({ title, value, sub }:{title:string,value:number,sub?:string}) {
  return (
    <Card className="p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold">{value.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </Card>
  );
}

export default function Dashboard(){
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading } = useQuery({
    queryKey: ["series", year],
    queryFn: async ()=> (await api.get("/reports/execution/series", { params: { year } })).data
  });

  const months = useMemo(()=> Array.from({length:12}, (_,i)=> now.getFullYear()-2+i>0 ? now.getFullYear()-2+i : now.getFullYear()),[now]); // simple

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Select value={year} onChange={(e)=>setYear(Number(e.target.value))} style={{ width: 140 }}>
          {[year-1, year, year+1].map(y=> <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      {isLoading ? "Cargando…" : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Kpi title="PPTO YTD" value={data.totals.budget} />
            <Kpi title="Ejecutado YTD" value={data.totals.executed} />
            <Kpi title="Provisiones YTD" value={data.totals.provisions} />
            <Kpi title="Disponible YTD" value={data.totals.available} />
          </div>

          <Card>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budget" name="PPTO" />
                    <Bar dataKey="executed" name="Ejecutado" />
                    <Bar dataKey="provisions" name="Provisiones (+/-)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

