import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../api";

export default function Supports(){
  const { data, refetch } = useQuery({ queryKey:["supports"], queryFn: async()=> (await api.get("/supports")).data });
  const [form, setForm] = useState({ id:"", code:"", name:"", category:"", subcategory:"", active:"true" });

  const save = useMutation({
    mutationFn: async () => {
      const payload:any = { 
        id: form.id? Number(form.id): undefined,
        code: form.code || undefined,
        name: form.name,
        category: form.category || null,
        subcategory: form.subcategory || null,
        active: form.active === "true"
      };
      return (await api.post("/supports", payload)).data;
    },
    onSuccess: ()=> refetch()
  });

  const del = useMutation({
    mutationFn: async (id:number)=> (await api.delete(`/supports/${id}`)).data,
    onSuccess: ()=> refetch()
  });

  return (
    <div>
      <h2>Sustentos</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:12 }}>
        <input placeholder="ID (para editar)" value={form.id} onChange={e=>setForm(f=>({ ...f, id:e.target.value }))}/>
        <input placeholder="Código" value={form.code} onChange={e=>setForm(f=>({ ...f, code:e.target.value }))}/>
        <input placeholder="Nombre" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))}/>
        <input placeholder="Categoría" value={form.category} onChange={e=>setForm(f=>({ ...f, category:e.target.value }))}/>
        <input placeholder="Subcategoría" value={form.subcategory} onChange={e=>setForm(f=>({ ...f, subcategory:e.target.value }))}/>
        <select value={form.active} onChange={e=>setForm(f=>({ ...f, active:e.target.value }))}>
          <option value="true">Activo</option><option value="false">Inactivo</option>
        </select>
        <button onClick={()=>save.mutate()}>Guardar</button>
      </div>
      <table border={1} cellPadding={6} style={{ width:"100%" }}>
        <thead><tr><th>ID</th><th>Código</th><th>Nombre</th><th>Categoría</th><th>Subcategoría</th><th>Activo</th><th>Acciones</th></tr></thead>
        <tbody>
          {(data||[]).map((s:any)=>(
            <tr key={s.id}>
              <td>{s.id}</td><td>{s.code||""}</td><td>{s.name}</td><td>{s.category||""}</td><td>{s.subcategory||""}</td><td>{String(s.active)}</td>
              <td><button onClick={()=>del.mutate(s.id)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
