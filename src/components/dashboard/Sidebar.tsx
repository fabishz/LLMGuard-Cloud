import { NavLink } from "@/components/NavLink";
import { Shield, LayoutDashboard, AlertTriangle, BarChart3, FileText, Settings, CreditCard, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
  { name: "Metrics", href: "/dashboard/metrics", icon: BarChart3 },
  { name: "Logs", href: "/dashboard/logs", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen glass-strong border-r border-border/50 transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
          {!collapsed && (
            <div className="flex items-center gap-2 font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-gradient">LLMGuard</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/dashboard"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50",
                collapsed && "justify-center"
              )}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
