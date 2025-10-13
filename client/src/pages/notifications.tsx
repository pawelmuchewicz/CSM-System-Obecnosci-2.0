import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: any;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Fetch all notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const notifications = notificationsData?.notifications || [];

  // Filter notifications based on selected filter
  const filteredNotifications = filter === "unread"
    ? notifications.filter((n: Notification) => !n.read)
    : notifications;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się oznaczyć powiadomienia jako przeczytane",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Sukces",
        description: "Wszystkie powiadomienia oznaczone jako przeczytane",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się oznaczyć powiadomień jako przeczytane",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Sukces",
        description: "Powiadomienie zostało usunięte",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć powiadomienia",
        variant: "destructive",
      });
    },
  });

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'student_added': return 'Nowy uczeń';
      case 'student_approved': return 'Zatwierdzenie ucznia';
      case 'student_expelled': return 'Wypisanie ucznia';
      case 'attendance_note': return 'Notatka';
      case 'system': return 'System';
      default: return 'Powiadomienie';
    }
  };

  const getNotificationTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'student_added': return 'default';
      case 'student_approved': return 'secondary';
      case 'student_expelled': return 'destructive';
      case 'attendance_note': return 'outline';
      default: return 'outline';
    }
  };

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Bell className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Brak dostępu</h2>
            <p className="text-muted-foreground">Musisz być zalogowany, aby zobaczyć powiadomienia.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Powiadomienia</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `Masz ${unreadCount} ${unreadCount === 1 ? 'nieprzeczytane powiadomienie' : 'nieprzeczytanych powiadomień'}` : 'Wszystkie powiadomienia przeczytane'}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Oznacz wszystkie jako przeczytane
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Wszystkie ({notifications.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Nieprzeczytane ({unreadCount})
        </Button>
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Ładowanie powiadomień...</p>
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">
              {filter === "unread" ? "Brak nieprzeczytanych powiadomień" : "Brak powiadomień"}
            </h2>
            <p className="text-muted-foreground">
              {filter === "unread" ? "Wszystkie powiadomienia zostały przeczytane" : "Nie masz jeszcze żadnych powiadomień"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification: Notification) => (
            <Card
              key={notification.id}
              className={`${
                !notification.read ? "border-l-4 border-l-primary bg-blue-50/50 dark:bg-blue-950/20" : ""
              } transition-all hover:shadow-md`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getNotificationTypeBadgeVariant(notification.type)}>
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                      {!notification.read && (
                        <Badge variant="default" className="text-xs">
                          Nowe
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold mb-2">{notification.title}</h3>
                    <p className="text-muted-foreground">{notification.message}</p>

                    {/* Display metadata if available */}
                    {notification.metadata && (
                      <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                        {notification.metadata.groupName && (
                          <div>
                            <span className="font-medium">Grupa:</span> {notification.metadata.groupName}
                          </div>
                        )}
                        {notification.metadata.date && (
                          <div>
                            <span className="font-medium">Data:</span> {notification.metadata.date}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        title="Oznacz jako przeczytane"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotificationMutation.mutate(notification.id)}
                      disabled={deleteNotificationMutation.isPending}
                      title="Usuń powiadomienie"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
