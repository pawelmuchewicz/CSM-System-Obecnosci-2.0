import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Obecność", icon: Calendar },
    { href: "/reports", label: "Raporty", icon: BarChart3 },
  ];

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Attendance</span>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}