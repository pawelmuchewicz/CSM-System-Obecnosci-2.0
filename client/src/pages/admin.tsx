import { usePermissions } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Users, UserCheck, UserX, Settings, Plus, RefreshCw, AlertCircle, Edit2 as Edit, Trash2, Sheet, ExternalLink, GraduationCap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Group } from "@shared/schema";
import { PendingStudentsTab } from "@/components/pending-students-tab";

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
  groupIds?: string[];
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

interface GroupConfig {
  id: number;
  groupId: string;
  name: string;
  spreadsheetId: string;
  sheetGroupId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="pending-users" data-testid="tab-pending-users" className="text-xs md:text-sm">
            <UserCheck className="w-4 h-4 md:mr-2" />
            <span className="hidden sm:inline ml-1">Konta</span>
          </TabsTrigger>
          <TabsTrigger value="pending-students" data-testid="tab-pending-students" className="text-xs md:text-sm">
            <GraduationCap className="w-4 h-4 md:mr-2" />
            <span className="hidden sm:inline ml-1">Uczniowie</span>
          </TabsTrigger>
          <TabsTrigger value="all-users" data-testid="tab-all-users" className="text-xs md:text-sm">
            <Users className="w-4 h-4 md:mr-2" />
            <span className="hidden sm:inline ml-1">Zarządzanie</span>
          </TabsTrigger>
          <TabsTrigger value="sheets-config" data-testid="tab-sheets-config" className="text-xs md:text-sm">
            <Sheet className="w-4 h-4 md:mr-2" />
            <span className="hidden sm:inline ml-1">Arkusze</span>
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings" className="text-xs md:text-sm">
            <Settings className="w-4 h-4 md:mr-2" />
            <span className="hidden sm:inline ml-1">Ustawienia</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-users">
          <Card>
            <CardHeader>
              <CardTitle>Konta oczekujące na zatwierdzenie</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                <code className="bg-muted px-1 rounded">wybierz funkcję dla użytkownika</code>
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSpinner size="sm" text="Ładowanie kont..." />
              ) : pendingUsers?.users?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="mx-auto w-12 h-12 mb-4" />
                  <p>Brak oczekujących kont do zatwierdzenia</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {pendingUsers?.users?.map((user) => (
                    <div key={user.id} className="border rounded-lg p-3 md:p-4">
                      <div className="space-y-2 md:space-y-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                            <h3 className="font-medium text-base">{user.firstName} {user.lastName}</h3>
                            <Badge variant="outline" className="text-xs">@{user.username}</Badge>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {user.email} {user.phone && `• ${user.phone}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Zarejestrowany: {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveUser(user.id, 'instructor')}
                            disabled={approveUserMutation.isPending}
                            data-testid={`button-approve-instructor-${user.id}`}
                            className="flex-1 sm:flex-none h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm font-medium"
                          >
                            <UserCheck className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                            <span className="md:hidden">Instruktor</span>
                            <span className="hidden md:inline">Zatwierdź jako Instruktor</span>
                          </Button>

                          {permissions.isOwner && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveUser(user.id, 'reception')}
                              disabled={approveUserMutation.isPending}
                              data-testid={`button-approve-reception-${user.id}`}
                              className="flex-1 sm:flex-none h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm font-medium"
                            >
                              <UserCheck className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                              <span className="md:hidden">Recepcja</span>
                              <span className="hidden md:inline">Zatwierdź jako Recepcja</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-students">
          <PendingStudentsTab />
        </TabsContent>

        <TabsContent value="all-users">
          <AllUsersTab />
        </TabsContent>

        <TabsContent value="sheets-config">
          <SheetsConfigTab />
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
  const [groupsEditingUser, setGroupsEditingUser] = useState<User | null>(null);
  const [isGroupsDialogOpen, setIsGroupsDialogOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
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


  const { data: groupsData } = useQuery<{groups: Group[]}>({
    queryKey: ['/api/groups'],
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

  const updateUserGroupsMutation = useMutation({
    mutationFn: async ({ userId, groupIds }: { userId: number; groupIds: string[] }) => {
      await apiRequest('PUT', `/api/admin/users/${userId}/groups`, { groupIds });
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Grupy użytkownika zostały zaktualizowane",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsGroupsDialogOpen(false);
      setGroupsEditingUser(null);
      setSelectedGroups([]);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować grup użytkownika",
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

  const handleOpenGroupsDialog = (user: User) => {
    setGroupsEditingUser(user);
    // Get current user groups from database (groupIds)
    const currentGroups: string[] = user.groupIds || [];
    setSelectedGroups(currentGroups);
    setIsGroupsDialogOpen(true);
  };

  const handleSaveGroups = () => {
    if (!groupsEditingUser) return;
    
    updateUserGroupsMutation.mutate({
      userId: groupsEditingUser.id,
      groupIds: selectedGroups
    });
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
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

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Wszyscy użytkownicy</span>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setNewUser({
                  firstName: '',
                  lastName: '',
                  username: '',
                  email: '',
                  role: 'instructor'
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user" className="h-10 px-4 font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Dodaj użytkownika</span>
                  <span className="sm:hidden">Dodaj</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dodaj nowego użytkownika</DialogTitle>
                  <DialogDescription>
                    Utwórz nowe konto użytkownika w systemie
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-foreground">Imię *</Label>
                      <Input
                        id="firstName"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Wprowadź imię"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-foreground">Nazwisko *</Label>
                      <Input
                        id="lastName"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Wprowadź nazwisko"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="username" className="text-sm font-medium text-foreground">Nazwa użytkownika *</Label>
                    <Input
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Wprowadź nazwę użytkownika"
                      data-testid="input-username"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Wprowadź adres email"
                      data-testid="input-email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="role" className="text-sm font-medium text-foreground">Rola</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instructor">Instruktor</SelectItem>
                        <SelectItem value="reception">Recepcja</SelectItem>
                        <SelectItem value="owner">Właściciel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      className="h-10 px-6 font-medium"
                    >
                      Anuluj
                    </Button>
                    <Button 
                      onClick={handleCreateUser}
                      disabled={createUserMutation.isPending}
                      data-testid="button-create-user"
                      className="h-10 px-6 font-medium"
                    >
                      {createUserMutation.isPending ? 'Tworzenie...' : 'Utwórz użytkownika'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner size="sm" text="Ładowanie użytkowników..." />
          ) : allUsers?.users?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto w-12 h-12 mb-4" />
              <p>Brak użytkowników w systemie</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {allUsers?.users?.map((user) => (
                <div key={user.id} className="border rounded-lg p-3 md:p-4">
                  <div className="space-y-2 md:space-y-3">
                    <div className="space-y-1">
                      {/* Mobile: 2-line layout */}
                      <div className="md:hidden">
                        <h3 className="font-medium text-base">{user.firstName} {user.lastName}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs">@{user.username}</Badge>
                          <Badge variant={getStatusColor(user.status, user.active)} className="text-xs">
                            {getRoleDisplayName(user.role)}
                          </Badge>
                          <Badge variant={getStatusColor(user.status, user.active)} className="text-xs">
                            {getStatusDisplayName(user.status, user.active)}
                          </Badge>
                        </div>
                      </div>

                      {/* Desktop: Original layout */}
                      <div className="hidden md:block">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
                          <Badge variant="outline">@{user.username}</Badge>
                          <Badge variant={getStatusColor(user.status, user.active)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                          <Badge variant={getStatusColor(user.status, user.active)}>
                            {getStatusDisplayName(user.status, user.active)}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {user.email || 'Brak email'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Utworzony: {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                        {user.lastLoginAt && ` • Ostatnie logowanie: ${new Date(user.lastLoginAt).toLocaleDateString('pl-PL')}`}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                        data-testid={`button-edit-user-${user.id}`}
                        className="h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
                      >
                        <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden md:inline">Edytuj</span>
                      </Button>
                      {(permissions.canAssignGroups && user.role === 'instructor') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenGroupsDialog(user)}
                          data-testid={`button-edit-groups-${user.id}`}
                          title="Edytuj grupy"
                          className="h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
                        >
                          <Users className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                          <span className="hidden md:inline">Grupy</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={user.active ? "destructive" : "default"}
                        onClick={() => toggleUserStatusMutation.mutate({ userId: user.id, active: !user.active })}
                        disabled={toggleUserStatusMutation.isPending}
                        data-testid={`button-toggle-status-${user.id}`}
                        className="h-8 md:h-9 px-2 md:px-4 text-xs md:text-sm font-medium"
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
                          className="h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                          <span className="hidden md:inline">Usuń</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingUser(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edytuj użytkownika</DialogTitle>
            <DialogDescription>
              Modyfikuj dane użytkownika
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName" className="text-sm font-medium text-foreground">Imię *</Label>
                  <Input
                    id="edit-firstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    data-testid="input-edit-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName" className="text-sm font-medium text-foreground">Nazwisko *</Label>
                  <Input
                    id="edit-lastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    data-testid="input-edit-last-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-username" className="text-sm font-medium text-foreground">Nazwa użytkownika</Label>
                <Input
                  id="edit-username"
                  value={editingUser.username}
                  disabled
                  data-testid="input-edit-username"
                />
                <p className="text-xs text-muted-foreground mt-1">Nazwa użytkownika nie może być zmieniona</p>
              </div>

              <div>
                <Label htmlFor="edit-email" className="text-sm font-medium text-foreground">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                  data-testid="input-edit-email"
                />
              </div>

              <div>
                <Label htmlFor="edit-role" className="text-sm font-medium text-foreground">Rola</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, role: value } : null)}
                >
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instructor">Instruktor</SelectItem>
                    <SelectItem value="reception">Recepcja</SelectItem>
                    <SelectItem value="owner">Właściciel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
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

      {/* Groups Management Dialog */}
      <Dialog open={isGroupsDialogOpen} onOpenChange={(open) => {
        setIsGroupsDialogOpen(open);
        if (!open) {
          setGroupsEditingUser(null);
          setSelectedGroups([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Zarządzaj grupami - {groupsEditingUser?.firstName} {groupsEditingUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Wybierz grupy do których użytkownik będzie miał dostęp
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Wybierz grupy dostępne dla użytkownika:
              </Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {groupsData?.groups?.map((group) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`group-${group.id}`}
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => toggleGroupSelection(group.id)}
                      data-testid={`checkbox-group-${group.id}`}
                    />
                    <Label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer">
                      {group.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Wybrane grupy: {selectedGroups.length > 0 ? selectedGroups.join(', ') : 'Brak'}
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsGroupsDialogOpen(false)}
                data-testid="button-cancel-groups"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleSaveGroups}
                disabled={updateUserGroupsMutation.isPending}
                data-testid="button-save-groups"
              >
                {updateUserGroupsMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for managing Google Sheets configurations
function SheetsConfigTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GroupConfig | null>(null);

  // Form states
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetGroupId, setSheetGroupId] = useState('');

  const { data: configs, isLoading } = useQuery<{configs: GroupConfig[]}>({
    queryKey: ['/api/admin/groups-config'],
    retry: false,
  });

  // Create new configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: async (data: {groupId: string; name: string; spreadsheetId: string; sheetGroupId?: string}) => {
      const response = await fetch('/api/admin/groups-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] }); // Refresh groups cache
      toast({
        title: "Sukces",
        description: "Konfiguracja arkusza została utworzona",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error creating config:', error);
      
      // Try to parse error message from response
      let errorMessage = "Nie udało się utworzyć konfiguracji arkusza";
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If not JSON, use the error message as is
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({id, data}: {id: number; data: Partial<GroupConfig>}) => {
      const response = await fetch(`/api/admin/groups-config/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] }); // Refresh groups cache
      toast({
        title: "Sukces",
        description: "Konfiguracja arkusza została zaktualizowana",
      });
      setIsEditDialogOpen(false);
      setEditingConfig(null);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error updating config:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować konfiguracji arkusza",
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/groups-config/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] }); // Refresh groups cache
      toast({
        title: "Sukces",
        description: "Konfiguracja arkusza została usunięta",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting config:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć konfiguracji arkusza",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setGroupId('');
    setName('');
    setSpreadsheetId('');
    setSheetGroupId('');
  };

  const handleAddConfig = () => {
    if (!groupId.trim() || !name.trim() || !spreadsheetId.trim()) {
      toast({
        title: "Błąd",
        description: "Wszystkie pola poza 'Sheet Group ID' są wymagane",
        variant: "destructive",
      });
      return;
    }

    createConfigMutation.mutate({
      groupId: groupId.trim(),
      name: name.trim(),
      spreadsheetId: spreadsheetId.trim(),
      sheetGroupId: sheetGroupId.trim() || undefined,
    });
  };

  const handleEditConfig = (config: GroupConfig) => {
    setEditingConfig(config);
    setGroupId(config.groupId);
    setName(config.name);
    setSpreadsheetId(config.spreadsheetId);
    setSheetGroupId(config.sheetGroupId || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateConfig = () => {
    if (!editingConfig) return;
    
    if (!name.trim() || !spreadsheetId.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa i ID arkusza są wymagane",
        variant: "destructive",
      });
      return;
    }

    updateConfigMutation.mutate({
      id: editingConfig.id,
      data: {
        name: name.trim(),
        spreadsheetId: spreadsheetId.trim(),
        sheetGroupId: sheetGroupId.trim() || undefined,
      }
    });
  };

  const handleDeleteConfig = (id: number) => {
    if (confirm('Czy na pewno chcesz usunąć tę konfigurację arkusza?')) {
      deleteConfigMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Konfiguracja arkuszy Google Sheets</span>
          <div className="flex space-x-2">
            <Button
              size="sm" 
              variant="outline"
              onClick={async () => {
                try {
                  await apiRequest('DELETE', '/api/cache/clear');
                  toast({
                    title: "Sukces",
                    description: "Dane zostały odświeżone"
                  });
                } catch (error: any) {
                  toast({
                    title: "Błąd", 
                    description: "Nie udało się odświeżyć danych",
                    variant: "destructive"
                  });
                }
              }}
              className="h-10 px-4 font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Odśwież dane</span>
              <span className="sm:hidden">Odśwież</span>
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setGroupId('');
              setName('');
              setSpreadsheetId('');
              setSheetGroupId('');
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-sheet-config" className="h-10 px-4 font-medium">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Dodaj arkusz</span>
                <span className="sm:hidden">Dodaj</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj konfigurację arkusza</DialogTitle>
                <DialogDescription>
                  Skonfiguruj nowy arkusz Google Sheets dla grupy
                </DialogDescription>
              </DialogHeader>
              
              {/* Reminder for copied sheets */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">📋 Skopiowałeś arkusz?</p>
                    <p className="text-blue-700 text-xs leading-relaxed">
                      Sprawdź czy zmieniłeś w arkuszu Google Sheets:
                      <br />• <strong>Nazwę pliku</strong> (tytuł arkusza)
                      <br />• <strong>Kolumnę group_id</strong> w zakładce Students
                      <br />• <strong>Kolumnę class</strong> w zakładce Students
                      <br />Jeśli nie - wróć i zmień, lub użyj pola "Sheet Group ID" poniżej.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="groupId">ID Grupy *</Label>
                  <Input
                    id="groupId"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="np. TTI, HipHop, Sp10"
                    data-testid="input-group-id"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Unikalny identyfikator grupy używany w systemie (musi być różny od istniejących)
                  </p>
                </div>
                <div>
                  <Label htmlFor="name">Nazwa grupy *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nazwa wyświetlana grupy"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="spreadsheetId">ID arkusza Google Sheets *</Label>
                  <Input
                    id="spreadsheetId"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="ID z URL arkusza Google Sheets"
                    data-testid="input-spreadsheet-id"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Znajdziesz to w URL: docs.google.com/spreadsheets/d/<strong>ID_ARKUSZA</strong>/edit
                  </p>
                </div>
                <div>
                  <Label htmlFor="sheetGroupId">Sheet Group ID</Label>
                  <Input
                    id="sheetGroupId"
                    value={sheetGroupId}
                    onChange={(e) => setSheetGroupId(e.target.value)}
                    placeholder="Opcjonalny identyfikator grupy w arkuszu"
                    data-testid="input-sheet-group-id"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                    className="h-10 px-6 font-medium"
                  >
                    Anuluj
                  </Button>
                  <Button 
                    onClick={handleAddConfig}
                    disabled={createConfigMutation.isPending}
                    data-testid="button-save-config"
                    className="h-10 px-6 font-medium"
                  >
                    {createConfigMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Zapisz arkusz
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Zarządzaj konfiguracją arkuszy Google Sheets dla różnych grup w systemie. 
          Te ustawienia będą używane po przeniesieniu aplikacji na nowy serwer.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner size="sm" text="Ładowanie arkuszy..." />
        ) : configs?.configs?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sheet className="mx-auto w-12 h-12 mb-4" />
            <p>Brak skonfigurowanych arkuszy</p>
            <p className="text-sm mt-2">Dodaj pierwszy arkusz, aby rozpocząć konfigurację</p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs?.configs?.map((config) => (
              <div
                key={config.id}
                className={`border rounded-lg p-4 ${!config.active ? 'opacity-60 bg-muted' : ''}`}
              >
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-lg">{config.name}</h3>
                      <Badge variant="outline" data-testid={`badge-group-${config.groupId}`}>
                        {config.groupId}
                      </Badge>
                      {!config.active && (
                        <Badge variant="destructive">Usunięte</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-medium flex-shrink-0">ID arkusza:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                            {config.spreadsheetId}
                          </code>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                      {config.sheetGroupId && (
                        <div>
                          <span className="font-medium">Sheet Group ID:</span> {config.sheetGroupId}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Utworzone:</span> {new Date(config.createdAt).toLocaleDateString('pl-PL')}
                      </div>
                      {config.updatedAt !== config.createdAt && (
                        <div>
                          <span className="font-medium">Aktualizowane:</span> {new Date(config.updatedAt).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {config.active && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditConfig(config)}
                        data-testid={`button-edit-config-${config.id}`}
                        className="min-w-[100px] h-9 font-medium"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edytuj
                      </Button>
                      {permissions.isOwner && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteConfig(config.id)}
                          disabled={deleteConfigMutation.isPending}
                          data-testid={`button-delete-config-${config.id}`}
                          className="min-w-[100px] h-9 font-medium"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Usuń
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj konfigurację arkusza</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-groupId">ID Grupy</Label>
                <Input
                  id="edit-groupId"
                  value={groupId}
                  disabled
                  data-testid="input-edit-group-id"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  ID grupy nie można zmieniać
                </p>
              </div>
              <div>
                <Label htmlFor="edit-name">Nazwa grupy *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nazwa wyświetlana grupy"
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-spreadsheetId">ID arkusza Google Sheets *</Label>
                <Input
                  id="edit-spreadsheetId"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="ID z URL arkusza Google Sheets"
                  data-testid="input-edit-spreadsheet-id"
                />
              </div>
              <div>
                <Label htmlFor="edit-sheetGroupId">Sheet Group ID</Label>
                <Input
                  id="edit-sheetGroupId"
                  value={sheetGroupId}
                  onChange={(e) => setSheetGroupId(e.target.value)}
                  placeholder="Opcjonalny identyfikator grupy w arkuszu"
                  data-testid="input-edit-sheet-group-id"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingConfig(null);
                    resetForm();
                  }}
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleUpdateConfig}
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-update-config"
                >
                  {updateConfigMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Zapisz zmiany
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}