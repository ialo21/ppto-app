import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, NavLink, Outlet } from "react-router-dom";
import "./index.css";
import { Toaster } from "sonner";
import { Home, Wallet, FileText, BarChart3, Archive, ShoppingCart, Calendar, Menu, X, Sparkles } from "lucide-react";
import Button from "./components/ui/Button";

const qc = new QueryClient();

function Sidebar({ isCollapsed }: { isCollapsed: boolean }){
  const link = "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-white/90 hover:bg-white/20 hover:text-white";
  const active = "bg-white/30 text-white font-medium";
  
  return (
    <aside className={`sidebar-fixed transition-all duration-300 ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <nav className="space-y-1">
        <NavLink to="/" end className={({isActive})=>`${link} ${isActive?active:""}`} title="Dashboard">
          <Home size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/assistant" className={({isActive})=>`${link} ${isActive?active:""}`} title="Asistente">
          <Sparkles size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>Asistente</span>}
        </NavLink>
        <NavLink to="/reports" className={({isActive})=>`${link} ${isActive?active:""}`} title="Reportes">
          <BarChart3 size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>Reportes</span>}
        </NavLink>
        <NavLink to="/invoices" className={({isActive})=>`${link} ${isActive?active:""}`} title="Facturas">
          <FileText size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>Facturas</span>}
        </NavLink>
        <NavLink to="/purchase-orders" className={({isActive})=>`${link} ${isActive?active:""}`} title="Órdenes de Compra">
          <ShoppingCart size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>Órdenes de Compra</span>}
        </NavLink>
        <NavLink to="/provisions" className={({isActive})=>`${link} ${isActive?active:""}`} title="Provisiones">
          <Calendar size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>Provisiones</span>}
        </NavLink>
        <NavLink to="/ppto" className={({isActive})=>`${link} ${isActive?active:""}`} title="PPTO">
          <Wallet size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>PPTO</span>}
        </NavLink>
        <NavLink to="/settings" className={({isActive})=>`${link} ${isActive?active:""}`} title="Catálogos">
          <Archive size={18} className="flex-shrink-0"/>
          {!isCollapsed && <span>Catálogos</span>}
        </NavLink>
      </nav>
    </aside>
  );
}

function Topbar({ onToggleSidebar, isSidebarCollapsed }: { onToggleSidebar: () => void; isSidebarCollapsed: boolean }){
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border-default bg-white shadow-sm px-4 py-3">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {isSidebarCollapsed ? <Menu size={20} className="text-gray-700" /> : <X size={20} className="text-gray-700" />}
        </button>
        <div className="font-semibold text-lg text-gray-800">PORTAL PPTO</div>
      </div>
    </header>
  );
}

function AppLayout(){
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  return (
    <div className="min-h-screen">
      {/* Header global full-width */}
      <Topbar onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isSidebarCollapsed={isSidebarCollapsed} />
      
      {/* Layout principal: sidebar + contenido */}
      <div className="flex pt-[57px]"> {/* pt = altura del header (p-3 = 12px top/bottom + border) */}
        <Sidebar isCollapsed={isSidebarCollapsed} />
        
        {/* Contenido principal con margen izquierdo dinámico */}
        <main className={`flex-1 w-full bg-brand-background transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <div className="container-page">
            <Outlet />
          </div>
        </main>
      </div>
      
      <Toaster position="top-center" richColors />
    </div>
  );
}

// Pages (stubs conectados a endpoints existentes mas abajo)
import Dashboard from "./pages/Dashboard";
import AssistantPage from "./pages/AssistantPage";
import BudgetPage from "./pages/BudgetPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import InvoicesPage from "./pages/InvoicesPage";
import ProvisionsPage from "./pages/ProvisionsPage";
import ReportsPage from "./pages/ReportsPage";
import CatalogsPage from "./pages/SettingsPage";

const router = createBrowserRouter([
  { element: <AppLayout />, children: [
    { path: "/", element: <Dashboard /> },
    { path: "/assistant", element: <AssistantPage /> },
    { path: "/reports", element: <ReportsPage /> },
    { path: "/invoices", element: <InvoicesPage /> },
    { path: "/purchase-orders", element: <PurchaseOrdersPage /> },
    { path: "/provisions", element: <ProvisionsPage /> },
    { path: "/ppto", element: <BudgetPage /> },
    { path: "/settings", element: <CatalogsPage /> }
  ] }
]);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
