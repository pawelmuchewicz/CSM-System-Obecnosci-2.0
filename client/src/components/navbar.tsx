import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar, LogOut, User, Menu, X, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout, usePermissions } from "@/hooks/useAuth";
import { useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const permissions = usePermissions();
  const logoutMutation = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Role display mapping
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner': return 'Nauczyciel';
      case 'reception': return 'Recepcja';
      case 'instructor': return 'Instruktor';
      default: return 'Użytkownik';
    }
  };

  const navItems = [
    { href: "/", label: "Obecność", icon: Calendar },
    { href: "/reports", label: "Raporty", icon: BarChart3 },
    ...(permissions.canManageUsers ? [{ href: "/admin", label: "Administracja", icon: Settings }] : []),
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop Navigation */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Calendar className="w-6 h-6 text-primary" />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold whitespace-nowrap">System Obecności CSM</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">Creative Dance</span>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-1 flex-1 justify-center">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
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

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/profile'}
                  data-testid="button-profile"
                  className="whitespace-nowrap"
                >
                  <User className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="hidden lg:inline">Profil</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                  className="whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="hidden xl:inline">
                    {logoutMutation.isPending ? 'Wylogowywanie...' : `Wyloguj ${user.firstName} ${user.lastName}`}
                  </span>
                  <span className="xl:hidden">
                    {logoutMutation.isPending ? 'Wyloguj...' : 'Wyloguj'}
                  </span>
                  <span className="ml-1 text-xs bg-primary text-primary-foreground px-1 rounded flex-shrink-0">
                    {getRoleDisplayName(user.role)}
                  </span>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Navigation Links */}
              {navItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={closeMobileMenu}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              
              {/* User Info and Logout */}
              {user && (
                <div className="border-t pt-3 mt-3">
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Zalogowany jako: <span className="font-medium">{user.firstName} {user.lastName}</span>
                    <span className="ml-1 text-xs bg-primary text-primary-foreground px-1 rounded">
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleLogout();
                      closeMobileMenu();
                    }}
                    disabled={logoutMutation.isPending}
                    className="w-full mt-2"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {logoutMutation.isPending ? 'Wylogowywanie...' : 'Wyloguj'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}