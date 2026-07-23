import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Moon } from "lucide-react";
import LoginScreen from "@/components/LoginScreen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Car, Calendar, Building2, BedDouble,
  FolderOpen, ClipboardCheck, FileText, Settings, LogOut,
  PanelLeft, ShieldCheck, ChevronRight,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const allMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", roles: ["admin", "tecnico", "especialista", "user"], section: "principal" },
  { icon: Car, label: "Viagens", path: "/viagens", roles: ["admin", "tecnico", "especialista", "user"], section: "operacional" },
  { icon: Calendar, label: "Agendamentos", path: "/agendamentos", roles: ["admin", "tecnico", "especialista", "user"], section: "operacional" },
  { icon: Building2, label: "Clientes", path: "/clientes", roles: ["admin"], section: "operacional" },
  { icon: BedDouble, label: "Hotel e Passagens", path: "/reservas", roles: ["admin", "tecnico", "especialista", "user"], section: "operacional" },
  { icon: FolderOpen, label: "Documentos", path: "/documentos", roles: ["admin", "tecnico", "especialista", "user"], section: "recursos" },
  { icon: ClipboardCheck, label: "Revisão de Custos", path: "/custos", roles: ["admin", "tecnico", "especialista", "user"], section: "recursos" },
  { icon: FileText, label: "Relatórios", path: "/relatorios", roles: ["admin"], section: "gestao" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", roles: ["admin"], section: "gestao" },
];

const sectionLabels: Record<string, string> = {
  principal: "Principal",
  operacional: "Operacional",
  recursos: "Recursos",
  gestao: "Gestão",
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 220;
const MAX_WIDTH = 340;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.role || "user"));
  const activeMenuItem = menuItems.find((item: any) => item.path === location);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";

  // Agrupar itens por seção
  const sections = Object.keys(sectionLabels).filter(section =>
    menuItems.some(item => item.section === section)
  );

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 sidebar-gradient"
          disableTransition={isResizing}
        >
          {/* Header compacto com logo */}
          <SidebarHeader className="h-auto justify-center pb-3 pt-4">
            <div className="flex items-center gap-2.5 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-7 w-7 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-3.5 w-3.5 text-white/70" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/manus-storage/LogoSaLABTECH_619f103b.png" alt="SA Labtech" className="h-8 w-auto shrink-0 object-contain drop-shadow-sm" />
                  <div className="min-w-0">
                    <span className="font-semibold text-[13px] text-white tracking-tight block leading-tight drop-shadow-sm">SA Labtech</span>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide leading-tight drop-shadow-sm">FieldOps</span>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {/* Badge de role compacto */}
            {!isCollapsed && (
              <div className="mx-3 mb-1 mt-1 px-2.5 py-1.5 rounded-md bg-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-indigo-300" />
                  <span className="text-[11px] text-white/80 font-medium">
                    {isAdmin ? "Administrador" : user?.role === "especialista" ? "Especialista" : user?.role === "tecnico" ? "Técnico" : "Usuário"}
                  </span>
                </div>
              </div>
            )}

            {/* Menu agrupado por seções */}
            {sections.map((section) => (
              <div key={section} className="mt-1">
                {!isCollapsed && (
                  <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                    {sectionLabels[section]}
                  </p>
                )}
                <SidebarMenu className="px-2 py-0.5">
                  {menuItems.filter(item => item.section === section).map((item: any) => {
                    const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-8 transition-all font-normal rounded-md"
                        >
                          <item.icon
                            className={`h-3.5 w-3.5 ${isActive ? "text-indigo-300" : "text-white/45"}`}
                          />
                          <span className={`text-[13px] ${isActive ? "text-white font-medium" : "text-white/60"}`}>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* Footer com perfil compacto */}
          <SidebarFooter className="p-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-white/8 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                  <Avatar className="h-7 w-7 border border-white/15 shrink-0">
                    <AvatarFallback className="text-[10px] font-medium bg-indigo-500/30 text-indigo-200">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-[12px] font-medium truncate leading-tight text-white/85">
                      {user?.name || "-"}
                    </p>
                    <p className="text-[10px] text-white/35 truncate leading-tight mt-0.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="cursor-pointer"
                >
                  {theme === "light" ? <Moon className="mr-2 h-3.5 w-3.5" /> : <Sun className="mr-2 h-3.5 w-3.5" />}
                  <span className="text-sm">{theme === "light" ? "Modo Escuro" : "Modo Claro"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span className="text-sm">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!isCollapsed && (
              <p className="text-[9px] text-white/20 text-center mt-1.5 font-medium tracking-wide">
                v1.0.0 · SA Labtech
              </p>
            )}
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Header mobile compacto */}
        {isMobile && (
          <div className="flex border-b h-12 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8 rounded-md bg-background" />
              <span className="text-sm font-medium text-foreground tracking-tight">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}
        {/* Conteúdo com fundo sutil e padding generoso */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-[oklch(0.975_0.002_240)] dark:bg-[oklch(0.15_0.015_255)] min-h-screen">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
