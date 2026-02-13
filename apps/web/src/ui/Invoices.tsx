import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../api";

export default function Invoices() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices")).data
  });

  const [form, setForm] = useState({
    vendorId: "",
    docType: "FACTURA",
    numberNorm: "",
    currency: "PEN",
    totalForeign: "",
    totalLocal: "",
    ultimusIncident: ""
  });

  const [flt, setFlt] = useState({ status:"", docType:"" });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        vendorId: form.vendorId ? Number(form.vendorId) : null,
        docType: form.docType,
        numberNorm: form.numberNorm,
        currency: form.currency,
        totalForeign: form.totalForeign ? Number(form.totalForeign) : null,
        totalLocal: form.totalLocal ? Number(form.totalLocal) : null,
        ultimusIncident: form.ultimusIncident || undefined
      };
      return (await api.post("/invoices", payload)).data;
    },
    onSuccess: () => refetch()
  });

  const moveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.patch(`/invoices/${id}/status`, { status })).data,
    onSuccess: () => refetch()
  });

  if (isLoading) return <p>Cargando facturas…</p>;

  return (
    <div>
      <h2>Facturas</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 12 }}>
        <select value={form.docType} onChange={e=>setForm(f=>({ ...f, docType: e.target.value }))}>
          <option>FACTURA</option>
          <option>NOTA_CREDITO</option>
        </select>
        <input placeholder="VendorId (opcional)" value={form.vendorId} onChange={e=>setForm(f=>({ ...f, vendorId: e.target.value }))}/>
        <input placeholder="Número normalizado" value={form.numberNorm} onChange={e=>setForm(f=>({ ...f, numberNorm: e.target.value }))}/>
        <select value={form.currency} onChange={e=>setForm(f=>({ ...f, currency: e.target.value }))}>
          <option>PEN</option>
          <option>USD</option>
        </select>
        <input placeholder="Total Foreign (puede ser -)" value={form.totalForeign} onChange={e=>setForm(f=>({ ...f, totalForeign: e.target.value }))}/>
        <input placeholder="Total Local (puede ser -)" value={form.totalLocal} onChange={e=>setForm(f=>({ ...f, totalLocal: e.target.value }))}/>
        <input placeholder="Incidente Ultimus" value={form.ultimusIncident} onChange={e=>setForm(f=>({ ...f, ultimusIncident: e.target.value }))}/>
        <button onClick={()=>createMutation.mutate()}>Crear</button>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
        <select value={flt.docType} onChange={e=>setFlt(f=>({ ...f, docType: e.target.value }))}>
          <option value="">(doc)</option>
          <option>FACTURA</option>
          <option>NOTA_CREDITO</option>
        </select>
        <select value={flt.status} onChange={e=>setFlt(f=>({ ...f, status: e.target.value }))}>
          <option value="">(status)</option>
          <option>INGRESADO</option>
          <option>EN_APROBACION</option>
          <option>EN_CONTABILIDAD</option>
          <option>EN_TESORERIA</option>
          <option>EN_ESPERA_DE_PAGO</option>
          <option>PAGADO</option>
          <option>RECHAZADO</option>
        </select>
        <button onClick={async ()=>{
          try {
            const p = new URLSearchParams();
            if (flt.status) p.set("status", flt.status);
            if (flt.docType) p.set("docType", flt.docType);
            const res = await api.get(`/invoices/export/csv?${p.toString()}`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = "facturas.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
          } catch (err: any) {
            alert(err?.response?.data?.error || "Error al exportar CSV");
          }
        }}>Exportar CSV</button>
      </div>

      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>ID</th><th>Tipo</th><th>Número</th><th>Moneda</th><th>Foreign</th><th>Local</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((inv: any) => (
            <tr key={inv.id}>
              <td>{inv.id}</td>
              <td>{inv.docType}</td>
              <td>{inv.numberNorm}</td>
              <td>{inv.currency}</td>
              <td>{inv.totalForeign ?? ""}</td>
              <td>{inv.totalLocal ?? ""}</td>
              <td>{inv.statusCurrent}</td>
              <td style={{ display: "flex", gap: 4 }}>
                <button onClick={()=>moveStatus.mutate({ id: inv.id, status: "EN_APROBACION" })}>Aprob.</button>
                <button onClick={()=>moveStatus.mutate({ id: inv.id, status: "EN_CONTABILIDAD" })}>Conta</button>
                <button onClick={()=>moveStatus.mutate({ id: inv.id, status: "EN_TESORERIA" })}>Tes.</button>
                <button onClick={()=>moveStatus.mutate({ id: inv.id, status: "EN_ESPERA_DE_PAGO" })}>Espera</button>
                <button onClick={()=>moveStatus.mutate({ id: inv.id, status: "PAGADO" })}>Pagado</button>
                <button onClick={()=>moveStatus.mutate({ id: inv.id, status: "RECHAZADO" })}>Rechazar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
