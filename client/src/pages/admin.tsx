import { usePermissions } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Settings, Plus, RefreshCw, Download, Upload, AlertCircle, Edit2 as Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  status: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface SheetUser {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  active: boolean;
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Nieaktywny użytkownik został usunięty",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error?.message || "Nie udało się usunąć użytkownika",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego nieaktywnego użytkownika? Ta operacja jest nieodwracalna.')) {
      deleteUserMutation.mutate(userId);
    }
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
              <p className="text-sm text-muted-foreground mt-2">
                <code className="bg-gray-100 px-1 rounded">wybierz funkcję dla użytkownika</code>
              </p>
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
                          Instruktor
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
                            Recepcja
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
          <AllUsersTab />
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

// Component for managing all users
function AllUsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'instructor'
  });

  const { data: allUsers, isLoading } = useQuery<{users: User[]}>({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  const { data: sheetUsers } = useQuery<{users: SheetUser[]}>({
    queryKey: ['/api/users/sync/sheets'],
    retry: false,
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      await apiRequest('POST', '/api/admin/create-user', userData);
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Użytkownik został utworzony",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsAddDialogOpen(false);
      setNewUser({ username: '', firstName: '', lastName: '', email: '', role: 'instructor' });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się utworzyć użytkownika",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: number; active: boolean }) => {
      await apiRequest('PATCH', `/api/admin/users/${userId}`, { active });
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Status użytkownika został zmieniony",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić statusu użytkownika",
        variant: "destructive",
      });
    },
  });

  const syncToSheetsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/users/sync/to-sheets', {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sukces",
        description: `Zsynchronizowano ${data.count} użytkowników do arkusza`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/sync/sheets'] });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zsynchronizować użytkowników do arkusza",
        variant: "destructive",
      });
    },
  });

  const syncFromSheetsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/users/sync/from-sheets', {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sukces",
        description: `Importowano ${data.imported} nowych i zaktualizowano ${data.updated} użytkowników`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zaimportować użytkowników z arkusza",
        variant: "destructive",
      });
    },
  });

  const bidirectionalSyncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/users/sync/bidirectional', {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sukces",
        description: "Synchronizacja dwukierunkowa zakończona pomyślnie",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/sync/sheets'] });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się wykonać synchronizacji dwukierunkowej",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      await apiRequest('PATCH', `/api/admin/users/${userData.id}`, userData);
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Użytkownik został zaktualizowany",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować użytkownika",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.firstName || !newUser.lastName) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      ...user,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser || !editingUser.firstName || !editingUser.lastName) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }
    updateUserMutation.mutate(editingUser);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner': return 'Właściciel';
      case 'reception': return 'Recepcja';
      case 'instructor': return 'Instruktor';
      default: return role;
    }
  };

  const getStatusColor = (status: string, active: boolean) => {
    if (!active) return 'destructive';
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'inactive': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusDisplayName = (status: string, active: boolean) => {
    if (!active) return 'Nieaktywny';
    switch (status) {
      case 'active': return 'Aktywny';
      case 'pending': return 'Oczekuje';
      case 'inactive': return 'Nieaktywny';
      default: return status;
    }
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Nieaktywny użytkownik został usunięty",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error?.message || "Nie udało się usunąć użytkownika",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego nieaktywnego użytkownika? Ta operacja jest nieodwracalna.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Synchronizacja z Google Sheets</span>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncToSheetsMutation.mutate()}
                disabled={syncToSheetsMutation.isPending}
                data-testid="button-sync-to-sheets"
              >
                <Upload className="w-4 h-4 mr-2" />
                Do arkusza
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncFromSheetsMutation.mutate()}
                disabled={syncFromSheetsMutation.isPending}
                data-testid="button-sync-from-sheets"
              >
                <Download className="w-4 h-4 mr-2" />
                Z arkusza
              </Button>
              <Button
                size="sm"
                onClick={() => bidirectionalSyncMutation.mutate()}
                disabled={bidirectionalSyncMutation.isPending}
                data-testid="button-sync-bidirectional"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Dwukierunkowa
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Użytkownicy w bazie danych</h4>
              <p className="text-sm text-muted-foreground">
                {allUsers?.users?.length || 0} użytkowników
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Użytkownicy w arkuszu</h4>
              <p className="text-sm text-muted-foreground">
                {sheetUsers?.users?.length || 0} użytkowników
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Wszyscy użytkownicy</span>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user">
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj użytkownika
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dodaj nowego użytkownika</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">Imię *</Label>
                      <Input
                        id="firstName"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                        className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Wprowadź imię"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Nazwisko *</Label>
                      <Input
                        id="lastName"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                        className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Wprowadź nazwisko"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">Nazwa użytkownika *</Label>
                    <Input
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Wprowadź nazwę użytkownika"
                      data-testid="input-username"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Wprowadź adres email"
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="role" className="text-sm font-medium text-gray-700">Rola</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500" data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="instructor">Instruktor</SelectItem>
                        <SelectItem value="reception">Recepcja</SelectItem>
                        <SelectItem value="owner">Właściciel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Anuluj
                    </Button>
                    <Button 
                      onClick={handleCreateUser}
                      disabled={createUserMutation.isPending}
                      data-testid="button-create-user"
                    >
                      {createUserMutation.isPending ? 'Tworzenie...' : 'Utwórz'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allUsers?.users?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto w-12 h-12 mb-4" />
              <p>Brak użytkowników w systemie</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allUsers?.users?.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
                      <Badge variant="outline">@{user.username}</Badge>
                      <Badge variant={getStatusColor(user.status, user.active)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      <Badge variant={getStatusColor(user.status, user.active)}>
                        {getStatusDisplayName(user.status, user.active)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.email || 'Brak email'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Utworzony: {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                      {user.lastLoginAt && ` • Ostatnie logowanie: ${new Date(user.lastLoginAt).toLocaleDateString('pl-PL')}`}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditUser(user)}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={user.active ? "destructive" : "default"}
                      onClick={() => toggleUserStatusMutation.mutate({ userId: user.id, active: !user.active })}
                      disabled={toggleUserStatusMutation.isPending}
                      data-testid={`button-toggle-status-${user.id}`}
                    >
                      {user.active ? 'Dezaktywuj' : 'Aktywuj'}
                    </Button>
                    {!user.active && permissions.isOwner && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deleteUserMutation.isPending}
                        data-testid={`button-delete-user-${user.id}`}
                        title="Usuń nieaktywnego użytkownika (tylko właściciel)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edytuj użytkownika</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName" className="text-sm font-medium text-gray-700">Imię *</Label>
                  <Input
                    id="edit-firstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="input-edit-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName" className="text-sm font-medium text-gray-700">Nazwisko *</Label>
                  <Input
                    id="edit-lastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="input-edit-last-name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-username" className="text-sm font-medium text-gray-700">Nazwa użytkownika</Label>
                <Input
                  id="edit-username"
                  value={editingUser.username}
                  disabled
                  className="mt-1 bg-gray-100 border-gray-300"
                  data-testid="input-edit-username"
                />
                <p className="text-xs text-gray-500 mt-1">Nazwa użytkownika nie może być zmieniona</p>
              </div>
              
              <div>
                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  data-testid="input-edit-email"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-role" className="text-sm font-medium text-gray-700">Rola</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, role: value } : null)}
                >
                  <SelectTrigger className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500" data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="instructor">Instruktor</SelectItem>
                    <SelectItem value="reception">Recepcja</SelectItem>
                    <SelectItem value="owner">Właściciel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button 
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                  data-testid="button-update-user"
                >
                  {updateUserMutation.isPending ? 'Aktualizowanie...' : 'Zaktualizuj'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}