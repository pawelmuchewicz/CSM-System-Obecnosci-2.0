import { usePermissions } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const permissions = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if user doesn't have admin permissions
  if (!permissions.canManageUsers) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <UserX className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Brak uprawnień</h2>
            <p className="text-muted-foreground">Nie masz uprawnień do zarządzania systemem.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: pendingUsers, isLoading } = useQuery<{users: PendingUser[]}>({
    queryKey: ['/api/admin/pending-users'],
    retry: false,
  });

  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest('POST', '/api/admin/approve-user', { userId, role });
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Użytkownik został zatwierdzony",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: "Nie udało się zatwierdzić użytkownika",
        variant: "destructive",
      });
    },
  });

  const handleApproveUser = (userId: number, role: string) => {
    approveUserMutation.mutate({ userId, role });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Panel Administracyjny</h1>
        <p className="text-muted-foreground">Zarządzanie użytkownikami i systemem</p>
      </div>

      <Tabs defaultValue="pending-users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending-users" data-testid="tab-pending-users">
            <UserCheck className="w-4 h-4 mr-2" />
            Oczekujące konta
          </TabsTrigger>
          <TabsTrigger value="all-users" data-testid="tab-all-users">
            <Users className="w-4 h-4 mr-2" />
            Wszyscy użytkownicy
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Ustawienia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-users">
          <Card>
            <CardHeader>
              <CardTitle>Konta oczekujące na zatwierdzenie</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : pendingUsers?.users?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="mx-auto w-12 h-12 mb-4" />
                  <p>Brak oczekujących kont do zatwierdzenia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers?.users?.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
                          <Badge variant="outline">@{user.username}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user.email} {user.phone && `• ${user.phone}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Zarejestrowany: {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(user.id, 'instructor')}
                          disabled={approveUserMutation.isPending}
                          data-testid={`button-approve-instructor-${user.id}`}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Zatwierdź jako Instruktor
                        </Button>
                        
                        {permissions.isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveUser(user.id, 'reception')}
                            disabled={approveUserMutation.isPending}
                            data-testid={`button-approve-reception-${user.id}`}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Zatwierdź jako Recepcja
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-users">
          <Card>
            <CardHeader>
              <CardTitle>Wszyscy użytkownicy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto w-12 h-12 mb-4" />
                <p>Lista wszystkich użytkowników - funkcja w przygotowaniu</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia systemu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Zarządzanie danymi uczniów</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Obecnie dane uczniów są zarządzane przez Google Sheets. 
                    Wszystkie zmiany (dodawanie, usuwanie, edycja) muszą być wykonywane bezpośrednio w arkuszach.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">📋 Instrukcje dla administratorów:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Dodawanie uczniów:</strong> Wpisz nowe wpisy w arkuszu "Students"</li>
                      <li>• <strong>Usuwanie uczniów:</strong> Ustaw kolumnę "active" na FALSE</li>
                      <li>• <strong>Edycja danych:</strong> Modyfikuj bezpośrednio w arkuszu</li>
                      <li>• <strong>Grupy:</strong> Zarządzaj w arkuszu "Groups"</li>
                    </ul>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Synchronizacja danych</h3>
                  <p className="text-sm text-muted-foreground">
                    System automatycznie pobiera najnowsze dane z Google Sheets co kilka minut.
                    Zmiany w arkuszach są widoczne w aplikacji niemal natychmiast.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}