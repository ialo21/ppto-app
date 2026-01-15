import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import "./index.css";
import { Toaster } from "sonner";
import { Home, Wallet, FileText, BarChart3, Archive, ShoppingCart, Calendar, Menu, X, Sparkles, Shield, LogOut, User, ClipboardCheck, FileText as Contratos } from "lucide-react";
import Button from "./components/ui/Button";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false, // No refetch automático al montar componente
      refetchOnWindowFocus: false, // No refetch al volver a la ventana
      staleTime: 1000 * 60 * 5, // 5 minutos de cache por defecto
    },
  },
});

// Mapeo de permisos a rutas del sidebar
// Nota: Los items con `children` son grupos desplegables
// Para submódulos, se verifica el permiso específico O el permiso global del padre (gracias a hasPermission mejorado)
const sidebarItems = [
  { path: "/", label: "Dashboard", icon: Home, permission: "dashboard", end: true },
  { path: "/assistant", label: "Asistente", icon: Sparkles, permission: "assistant" },
  { path: "/reports", label: "Reportes", icon: BarChart3, permission: "reports" },
  { 
    path: "/invoices", 
    label: "Facturas", 
    icon: FileText, 
    permission: "facturas",
    children: [
      { path: "/invoices/listado", label: "Listado", permission: "facturas:listado" },
      { path: "/invoices/gestion", label: "Gestión / Registro", permission: "facturas:gestion" }
    ]
  },
  { 
    path: "/purchase-orders", 
    label: "Órdenes de Compra", 
    icon: ShoppingCart, 
    permission: "ocs",  // Permiso global (acceso completo) o al menos un submódulo
    children: [
      { path: "/purchase-orders/listado", label: "Listado", permission: "ocs:listado" },
      { path: "/purchase-orders/gestion", label: "Gestión / Registro", permission: "ocs:gestion" },
      { path: "/purchase-orders/solicitud", label: "Solicitud de OC", permission: "ocs:solicitud" }
    ]
  },
  {
    path: "/approvals",
    label: "Aprobaciones",
    icon: ClipboardCheck,
    permission: "aprobaciones",
    children: [
      { path: "/approvals/invoices/head", label: "Facturas - Head", permission: "aprobaciones:facturas_head" },
      { path: "/approvals/invoices/vp", label: "Facturas - VP", permission: "aprobaciones:facturas_vp" },
      { path: "/approvals/ocs/vp", label: "OCs - VP", permission: "aprobaciones:ocs_vp" }
    ]
  },
  { path: "/contratos/recursos-tercerizados", label: "Contratos", icon: Contratos, permission: "contratos" },
  { path: "/provisions", label: "Provisiones", icon: Calendar, permission: "provisiones" },
  { path: "/ppto", label: "PPTO", icon: Wallet, permission: "ppto" },
  { path: "/settings", label: "Catálogos", icon: Archive, permission: "catalogos" }
];

function Sidebar({ 
  isCollapsed, 
  isOpen, 
  isMobile, 
  onMouseEnter, 
  onMouseLeave,
  onClose 
}: { 
  isCollapsed: boolean;
  isOpen: boolean;
  isMobile: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onClose?: () => void;
}){
  const { hasPermission } = useAuth();
  const link = "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-white/90 hover:bg-white/20 hover:text-white";
  const active = "bg-white/30 text-white font-medium";
  const sublink = "flex items-center gap-3 px-3 py-2 pl-10 rounded-xl transition-all duration-200 text-white/80 hover:bg-white/15 hover:text-white text-sm";
  const subactive = "bg-white/20 text-white font-medium";
  
  // Estados locales para controlar las animaciones
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  
  // Estado para controlar qué grupos están expandidos
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Filtrar items según permisos del usuario
  // Para módulos con submódulos, mostrar si tiene permiso global O al menos un submódulo
  const allowedItems = sidebarItems.filter(item => {
    // Verificar permiso principal
    if (hasPermission(item.permission)) return true;
    
    // Si tiene hijos, verificar si tiene acceso a al menos uno
    if (item.children && item.children.length > 0) {
      return item.children.some(child => hasPermission(child.permission));
    }
    
    return false;
  });
  
  // Efecto para animar la apertura del sidebar
  useEffect(() => {
    if (isMobile && isOpen && !isClosing) {
      // Cuando se abre el sidebar, primero renderizar sin la clase de apertura
      // Luego en el siguiente frame aplicar la clase para activar la transición
      setIsOpening(false);
      
      // Usar requestAnimationFrame para asegurar que el DOM se ha actualizado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsOpening(true);
        });
      });
    } else if (!isOpen) {
      setIsOpening(false);
    }
  }, [isOpen, isMobile, isClosing]);
  
  // Handler para cerrar con animación suave
  const handleClose = () => {
    if (!onClose) return;
    
    // Iniciar animación de cierre
    setIsClosing(true);
    setIsOpening(false);
    
    // Esperar a que la animación termine antes de cerrar realmente
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 350); // Debe coincidir con la duración de la transición CSS
  };
  
  // Handler para el clic en un link del menú
  const handleLinkClick = () => {
    if (isMobile) {
      handleClose();
    }
  };
  
  // Handler para expandir/colapsar grupos (comportamiento acordeón: solo uno a la vez)
  const toggleGroup = (path: string) => {
    setExpandedGroups(prev => {
      if (prev.has(path)) {
        // Si ya está expandido, colapsarlo
        return new Set();
      } else {
        // Si no está expandido, expandirlo y colapsar los demás
        return new Set([path]);
      }
    });
  };
  
  // En mobile: si no está abierto ni cerrándose, no renderizar nada
  if (isMobile && !isOpen && !isClosing) {
    return null;
  }
  
  return (
    <>
      {/* Overlay de fondo solo en mobile cuando está abierto */}
      {isMobile && (isOpen || isClosing) && (
        <div 
          className={`fixed inset-0 bg-black/50 z-30 lg:hidden sidebar-overlay ${
            isOpening && !isClosing ? 'sidebar-overlay-visible' : ''
          }`}
          onClick={handleClose}
        />
      )}
      
      <aside 
        className={`sidebar-fixed ${
          isMobile ? 'sidebar-mobile' : ''
        } ${
          isCollapsed && !isMobile ? 'sidebar-collapsed' : ''
        } ${
          isOpening && !isClosing && isMobile ? 'sidebar-mobile-open' : ''
        }`}
        onMouseEnter={!isMobile ? onMouseEnter : undefined}
        onMouseLeave={!isMobile ? onMouseLeave : undefined}
      >
        <nav className="space-y-1">
          {allowedItems.map(item => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedGroups.has(item.path);
            
            // Si tiene hijos, renderizar grupo desplegable
            if (hasChildren) {
              return (
                <div key={item.path}>
                  {/* Botón padre para expandir/colapsar */}
                  <button
                    onClick={() => toggleGroup(item.path)}
                    className={`${link} w-full justify-between`}
                    title={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="flex-shrink-0"/>
                      {(!isCollapsed || isMobile) && <span>{item.label}</span>}
                    </div>
                    {(!isCollapsed || isMobile) && (
                      <svg 
                        className={`w-4 h-4 chevron-icon transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Subitems (solo si está expandido y no colapsado) */}
                  {isExpanded && (!isCollapsed || isMobile) && (
                    <div className="mt-1 space-y-1">
                      {item.children.filter(child => 
                        // hasPermission verifica automáticamente el permiso específico O el padre
                        hasPermission(child.permission)
                      ).map(child => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({isActive}) => `${sublink} ${isActive ? subactive : ""}`}
                          title={child.label}
                          onClick={handleLinkClick}
                        >
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // Si no tiene hijos, renderizar link normal
            return (
              <NavLink 
                key={item.path}
                to={item.path} 
                end={item.end}
                className={({isActive})=>`${link} ${isActive?active:""}`} 
                title={item.label}
                onClick={handleLinkClick}
              >
                <Icon size={18} className="flex-shrink-0"/>
                {(!isCollapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function Topbar({ onToggleSidebar, isSidebarCollapsed, showMenuButton }: { onToggleSidebar: () => void; isSidebarCollapsed: boolean; showMenuButton: boolean }){
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  async function handleLogout() {
    await logout();
    // Usar replace para forzar recarga completa y evitar navegación hacia atrás
    window.location.replace("/login");
  }
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border-default bg-white shadow-sm px-4 py-3">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isSidebarCollapsed ? "Abrir menú" : "Cerrar menú"}
          >
            {isSidebarCollapsed ? <Menu size={20} className="text-gray-700" /> : <X size={20} className="text-gray-700" />}
          </button>
        )}
        <div className="font-semibold text-lg text-gray-800">PORTAL PPTO</div>
      </div>
      
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <User size={18} className="text-gray-700" />
          <span className="text-sm text-gray-700">{user?.name || user?.email}</span>
        </button>
        
        {showUserMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-800">{user?.name || "Usuario"}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              
              {hasPermission("manage_roles") && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/roles");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Shield size={16} />
                  Administrar Roles
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Hook personalizado para detectar tamaño de pantalla
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Listener moderno
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

function AppLayout(){
  // Detectar si estamos en desktop (lg breakpoint = 1024px en Tailwind)
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  // Estado para desktop: colapsado por defecto
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(true);
  
  // Estado para mobile: cerrado por defecto
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Handlers para hover en desktop
  const handleMouseEnter = () => {
    if (isDesktop) {
      setIsCollapsedDesktop(false);
    }
  };
  
  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isDesktop) {
      // Ignorar si el cursor salió hacia el borde izquierdo del viewport
      // Esto evita el flicker cuando el usuario mueve el cursor al extremo izquierdo
      // donde el navegador tiene un área mínima fuera del contenedor de la app
      const EDGE_THRESHOLD = 5; // píxeles desde el borde izquierdo
      if (e.clientX <= EDGE_THRESHOLD) {
        return; // No colapsar - el cursor está en el borde del viewport
      }
      setIsCollapsedDesktop(true);
    }
  };
  
  // Handler para toggle en mobile
  const handleToggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };
  
  // Cerrar sidebar mobile
  const handleCloseMobile = () => {
    setIsMobileOpen(false);
  };
  
  // Calcular margen izquierdo del contenido
  const getMainMargin = () => {
    if (!isDesktop) {
      return 'ml-0'; // En mobile, sin margen (sidebar en overlay)
    }
    return isCollapsedDesktop ? 'ml-16' : 'ml-64';
  };
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header global full-width */}
        <Topbar 
          onToggleSidebar={handleToggleMobile} 
          isSidebarCollapsed={!isMobileOpen}
          showMenuButton={!isDesktop}
        />
        
        {/* Layout principal: sidebar + contenido */}
        <div className="flex pt-[57px]"> {/* pt = altura del header (p-3 = 12px top/bottom + border) */}
          <Sidebar 
            isCollapsed={isCollapsedDesktop}
            isOpen={isMobileOpen}
            isMobile={!isDesktop}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClose={handleCloseMobile}
          />
          
          {/* Contenido principal con margen izquierdo dinámico */}
          <main className={`flex-1 w-full bg-brand-background transition-all duration-300 ease-in-out ${
            getMainMargin()
          }`}> 
            <div className="container-page">
              <Outlet />
              <div className="mt-6 text-center text-[11px] text-slate-400">
                © Iago López — IT Governance & Budget
              </div>
            </div>
          </main>
        </div>
        
        <Toaster position="top-center" richColors />
      </div>
    </ProtectedRoute>
  );
}

// Pages (stubs conectados a endpoints existentes mas abajo)
import Dashboard from "./pages/Dashboard";
import AssistantPage from "./pages/AssistantPage";
import BudgetPage from "./pages/BudgetPage";
import ProvisionsPage from "./pages/ProvisionsPage";
import ReportsPage from "./pages/ReportsPage";
import CatalogsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RolesPage from "./pages/RolesPage";

// Submódulos de Facturas
import InvoiceListadoPage from "./pages/invoices/InvoiceListadoPage";
import InvoiceGestionPage from "./pages/invoices/InvoiceGestionPage";

// Submódulos de Órdenes de Compra
import OcListadoPage from "./pages/purchase-orders/OcListadoPage";
import OcGestionPage from "./pages/purchase-orders/OcGestionPage";
import OcSolicitudPage from "./pages/purchase-orders/OcSolicitudPage";

// Submódulos de Aprobaciones
import AprobacionHeadFacturasPage from "./pages/approvals/AprobacionHeadFacturasPage";
import AprobacionVPFacturasPage from "./pages/approvals/AprobacionVPFacturasPage";
import AprobacionVPOCsPage from "./pages/approvals/AprobacionVPOCsPage";

// Contratos
import RecursosTercerizadosPage from "./pages/contratos/RecursosTercerizadosPage";
import RecursoTercerizadoDetallePage from "./pages/contratos/RecursoTercerizadoDetallePage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { element: <AppLayout />, children: [
    { path: "/", element: <Dashboard /> },
    { path: "/assistant", element: <AssistantPage /> },
    { path: "/reports", element: <ReportsPage /> },
    // Rutas de Facturas (con submódulos)
    { path: "/invoices", element: <Navigate to="/invoices/gestion" replace /> },
    { path: "/invoices/listado", element: <InvoiceListadoPage /> },
    { path: "/invoices/gestion", element: <InvoiceGestionPage /> },
    // Rutas de Órdenes de Compra (con submódulos)
    { path: "/purchase-orders", element: <Navigate to="/purchase-orders/gestion" replace /> },
    { path: "/purchase-orders/listado", element: <OcListadoPage /> },
    { path: "/purchase-orders/gestion", element: <OcGestionPage /> },
    { path: "/purchase-orders/solicitud", element: <OcSolicitudPage /> },
    // Rutas de Aprobaciones (con submódulos)
    { path: "/approvals", element: <Navigate to="/approvals/invoices/head" replace /> },
    { path: "/approvals/invoices/head", element: <AprobacionHeadFacturasPage /> },
    { path: "/approvals/invoices/vp", element: <AprobacionVPFacturasPage /> },
    { path: "/approvals/ocs/vp", element: <AprobacionVPOCsPage /> },
    // Contratos
    { path: "/contratos/recursos-tercerizados", element: <RecursosTercerizadosPage /> },
    { path: "/contratos/recursos-tercerizados/:id", element: <RecursoTercerizadoDetallePage /> },
    { path: "/provisions", element: <ProvisionsPage /> },
    { path: "/ppto", element: <BudgetPage /> },
    { path: "/settings", element: <CatalogsPage /> },
    { path: "/roles", element: <RolesPage /> }
  ] }
]);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>
);
