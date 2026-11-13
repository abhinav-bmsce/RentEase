import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatDate, fromFirestoreTimestamp } from "@/lib/date";
import { db } from "@/lib/firebase";
import type { NotificationDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { doc, orderBy, updateDoc, where } from "firebase/firestore";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const constraints = isAdmin
    ? [orderBy("createdAt", "desc")]
    : [where("tenantUid", "==", user?.uid ?? "")];

  const { data: unsortedNotifications, error } =
    useCollectionRealtime<NotificationDoc>(
      "notifications",
      constraints,
      Boolean(user?.uid),
    );

  const notifications = [...unsortedNotifications].sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not mark notification as read",
      });
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    try {
      await Promise.all(
        unread.map((n) =>
          updateDoc(doc(db, "notifications", n.id), { read: true }),
        ),
      );
    } catch {
      toast({
        variant: "destructive",
        title: "Could not update notifications",
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {error ? (
            <p role="alert" className="p-5 text-sm text-muted-foreground">
              Notifications are unavailable. Please try again later.
            </p>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 20).map((notif) => (
              <button
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b last:border-0 transition-colors",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !notif.read && "bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className={cn("flex-1 min-w-0", notif.read && "ml-4")}>
                    <p className="text-sm font-medium truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {notif.createdAt
                        ? formatDate(fromFirestoreTimestamp(notif.createdAt))
                        : ""}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
