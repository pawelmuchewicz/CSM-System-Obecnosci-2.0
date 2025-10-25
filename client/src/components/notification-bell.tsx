import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: any;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent notifications (only when popover is open)
  const { data: notificationsData, refetch } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  const unreadCount = unreadData?.count || 0;
  const notifications = notificationsData?.notifications || [];

  // Get only the 5 most recent notifications for the dropdown
  const recentNotifications = notifications.slice(0, 5);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      refetch(); // Refresh notifications when opening
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      // Refetch both unread count and notifications list
      refetch();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Teraz";
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays === 1) return "Wczoraj";
    if (diffDays < 7) return `${diffDays} dni temu`;

    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Powiadomienia</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} nowych</Badge>
          )}
        </div>

        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Brak powiadomień</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {recentNotifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50 dark:bg-blue-950/20" : ""
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {notification.title}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <div className="mt-2">
                        <Badge variant="default" className="text-xs">
                          Nowe
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-3">
              <Link href="/notifications">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Zobacz wszystkie powiadomienia
                </Button>
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
