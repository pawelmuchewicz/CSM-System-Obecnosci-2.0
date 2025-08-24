import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/useAuth";

export function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  const navItems = [
    { href: "/", label: "Obecność", icon: Calendar },
    { href: "/reports", label: "Raporty", icon: BarChart3 },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-primary" />
            <div className="flex flex-col">
              <span className="text-xl font-bold">System Obecności CSM</span>
              <span className="text-xs text-muted-foreground">Creative Dance</span>
            </div>
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

          <div className="ml-auto flex items-center space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>
                    {user.firstName} {user.lastName}
                    {user.isAdmin && <span className="ml-1 text-xs bg-primary text-primary-foreground px-1 rounded">Admin</span>}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {logoutMutation.isPending ? 'Wylogowywanie...' : 'Wyloguj'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}