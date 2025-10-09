import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Table, Th, Td } from "../components/ui/Table";
export default function SupportsPage(){
  const { data, refetch, isLoading } = useQuery({ queryKey:["supports"], queryFn: async()=> (await api.get("/supports")).data });
  const [form, setForm] = useState({ id:"", name:"", code:"" });
  const save = useMutation({ mutationFn: async ()=>{
    const payload:any = { id: form.id? Number(form.id): undefined, name: form.name, code: form.code||undefined, active: true };
    return (await api.post("/supports", payload)).data;
  }, onSuccess: ()=>{ setForm({id:"",name:"",code:""}); refetch(); } });
  const del = useMutation({ mutationFn: async (id:number)=> (await api.delete(`/supports/${id}`)).data, onSuccess: ()=> refetch() });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sustentos</h1>
      <Card><CardHeader>
        <div className="grid grid-cols-3 gap-3">
          <Input placeholder="ID (para editar)" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))}/>
          <Input placeholder="Nombre" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <Input placeholder="Código" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))}/>
        </div>
        <div className="mt-3"><Button onClick={()=>save.mutate()} disabled={!form.name}>Guardar</Button></div>
      </CardHeader><CardContent>
        {isLoading? "Cargando..." : (
          <Table>
            <thead><tr><Th>ID</Th><Th>Nombre</Th><Th>Código</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {(data||[]).map((s:any)=>(
                <tr key={s.id}><Td>{s.id}</Td><Td>{s.name}</Td><Td>{s.code||""}</Td>
                  <Td><Button variant="ghost" onClick={()=>del.mutate(s.id)}>Eliminar</Button></Td></tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
