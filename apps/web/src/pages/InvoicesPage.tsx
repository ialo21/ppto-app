import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
export default function InvoicesPage(){
  const { data, refetch, isLoading } = useQuery({ queryKey:["invoices"], queryFn: async()=> (await api.get("/invoices")).data });
  const [flt, setFlt] = useState({ status:"", docType:"" });
  const [form, setForm] = useState({ vendorId:"", docType:"FACTURA", numberNorm:"", currency:"PEN", totalForeign:"", totalLocal:"", ultimusIncident:"" });
  const create = useMutation({
    mutationFn: async ()=>{
      const payload = { vendorId: form.vendorId? Number(form.vendorId): null, docType: form.docType, numberNorm: form.numberNorm, currency: form.currency, totalForeign: form.totalForeign? Number(form.totalForeign): null, totalLocal: form.totalLocal? Number(form.totalLocal): null, ultimusIncident: form.ultimusIncident || undefined };
      return (await api.post("/invoices", payload)).data;
    }, onSuccess: ()=> refetch()
  });
  const move = useMutation({
    mutationFn: async ({ id, status }:{id:number,status:string}) => (await api.patch(`/invoices/${id}/status`,{ status })).data,
    onSuccess: ()=> refetch()
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Facturas</h1>
      <Card><CardHeader className="grid md:grid-cols-7 gap-3">
        <Select value={form.docType} onChange={e=>setForm(f=>({...f, docType:e.target.value}))}><option>FACTURA</option><option>NOTA_CREDITO</option></Select>
        <Input placeholder="VendorId" value={form.vendorId} onChange={e=>setForm(f=>({...f, vendorId:e.target.value}))}/>
        <Input placeholder="Número" value={form.numberNorm} onChange={e=>setForm(f=>({...f, numberNorm:e.target.value}))}/>
        <Select value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value}))}><option>PEN</option><option>USD</option></Select>
        <Input placeholder="Foreign (+/-)" value={form.totalForeign} onChange={e=>setForm(f=>({...f, totalForeign:e.target.value}))}/>
        <Input placeholder="Local (+/-)" value={form.totalLocal} onChange={e=>setForm(f=>({...f, totalLocal:e.target.value}))}/>
        <Input placeholder="Incidente Ultimus" value={form.ultimusIncident} onChange={e=>setForm(f=>({...f, ultimusIncident:e.target.value}))}/>
        <div className="md:col-span-7"><Button onClick={()=>create.mutate()}>Crear</Button></div>
      </CardHeader><CardContent>
        <div className="flex gap-2 mb-3">
          <Select value={flt.docType} onChange={e=>setFlt(f=>({...f, docType:e.target.value}))}><option value="">(doc)</option><option>FACTURA</option><option>NOTA_CREDITO</option></Select>
          <Select value={flt.status} onChange={e=>setFlt(f=>({...f, status:e.target.value}))}>
            <option value="">(status)</option><option>INGRESADO</option><option>EN_APROBACION</option><option>EN_CONTABILIDAD</option><option>EN_TESORERIA</option><option>EN_ESPERA_DE_PAGO</option><option>PAGADO</option><option>RECHAZADO</option>
          </Select>
          <Button onClick={()=>{
            const p = new URLSearchParams(); if (flt.status) p.set("status",flt.status); if (flt.docType) p.set("docType",flt.docType);
            window.open(`http://localhost:3001/invoices/export/csv?${p.toString()}`,"_blank");
          }}>Exportar CSV</Button>
        </div>
        {isLoading? "Cargando..." : (
          <Table>
            <thead><tr><Th>ID</Th><Th>Tipo</Th><Th>Número</Th><Th>Moneda</Th><Th>Foreign</Th><Th>Local</Th><Th>Estado</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {data.map((inv:any)=>(
                <tr key={inv.id}>
                  <Td>{inv.id}</Td><Td>{inv.docType}</Td><Td>{inv.numberNorm}</Td><Td>{inv.currency}</Td><Td>{inv.totalForeign??""}</Td><Td>{inv.totalLocal??""}</Td><Td>{inv.statusCurrent}</Td>
                  <Td className="flex gap-2">
                    {["EN_APROBACION","EN_CONTABILIDAD","EN_TESORERIA","EN_ESPERA_DE_PAGO","PAGADO","RECHAZADO"].map(s=><Button key={s} size="sm" variant="secondary" onClick={()=>move.mutate({id:inv.id,status:s})}>{s.replace("EN_","")}</Button>)}
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
