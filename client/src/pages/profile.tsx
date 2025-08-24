import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Settings, UserCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner': return 'Właściciel';
      case 'reception': return 'Recepcja';
      case 'instructor': return 'Instruktor';
      default: return 'Użytkownik';
    }
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await apiRequest('POST', '/api/auth/change-password', data);
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Hasło zostało zmienione",
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić hasła. Sprawdź obecne hasło.",
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Błąd",
        description: "Nowe hasła nie są identyczne",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Błąd", 
        description: "Nowe hasło musi mieć co najmniej 6 znaków",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <User className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Brak dostępu</h2>
            <p className="text-muted-foreground">Musisz być zalogowany, aby zobaczyć profil.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Profil użytkownika</h1>
        <p className="text-muted-foreground">Zarządzaj swoim kontem i ustawieniami</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Informacje
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Lock className="w-4 h-4 mr-2" />
            Bezpieczeństwo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informacje o koncie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium">Imię i nazwisko</Label>
                  <p className="text-lg">{user.firstName} {user.lastName}</p>
                </div>
                
                <div>
                  <Label className="text-base font-medium">Nazwa użytkownika</Label>
                  <p className="text-lg font-mono">@{user.username}</p>
                </div>
                
                <div>
                  <Label className="text-base font-medium">Email</Label>
                  <p className="text-lg">{user.email || 'Brak adresu email'}</p>
                </div>
                
                <div>
                  <Label className="text-base font-medium">Rola w systemie</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Status konta</Label>
                <div className="mt-2 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">Aktywne</span>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Przypisane grupy</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.groupIds?.length > 0 ? (
                    user.groupIds.map((groupId) => (
                      <Badge key={groupId} variant="outline">
                        {groupId}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Brak przypisanych grup</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">ℹ️ Zmiana danych osobowych</h4>
                <p className="text-sm text-blue-700">
                  Aby zmienić swoje dane osobowe (imię, nazwisko, email), skontaktuj się z administratorem systemu.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Zmiana hasła</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Obecne hasło</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                    data-testid="input-current-password"
                  />
                </div>

                <div>
                  <Label htmlFor="new-password">Nowe hasło</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Hasło musi mieć co najmniej 6 znaków
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? 'Zmienianie...' : 'Zmień hasło'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}