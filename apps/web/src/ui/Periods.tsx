import React from "react";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { api } from "../api";
const qc = new QueryClient();

export default function Periods(){
  const { data, isLoading } = useQuery({ queryKey:["periods"], queryFn: async()=> (await api.get("/periods")).data });
  const closeMutation = useMutation({
    mutationFn: async (id:number)=> (await api.post(`/periods/${id}/closure`)).data,
    onSuccess: ()=> qc.invalidateQueries({ queryKey:["periods"] })
  });
  if (isLoading) return <p>Cargando períodos…</p>;
  return (
    <div>
      <h2>Períodos</h2>
      <ul>
        {data.map((p:any)=>(
          <li key={p.id}>
            {p.year}-{String(p.month).padStart(2,"0")} {p.label||""}
            <button style={{ marginLeft:8 }} onClick={()=>closeMutation.mutate(p.id)}>Recibir cierre</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
