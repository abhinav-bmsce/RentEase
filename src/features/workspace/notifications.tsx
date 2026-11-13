import { DataNotice } from "@/components/shared/data-notice";
import {
  EmptyState,
  PageHeader,
  PageSkeleton,
} from "@/components/shared/page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { db } from "@/lib/firebase";
import type { NotificationDoc } from "@/lib/types";
import { doc, updateDoc, where } from "firebase/firestore";
import { useState } from "react";
export function NotificationsPage() {
  const { user, isAdmin } = useAuth();
  const [failure, setFailure] = useState("");
  const { data, loading, error } = useCollectionRealtime<NotificationDoc>(
    "notifications",
    isAdmin ? [] : [where("tenantUid", "==", user?.uid || "")],
    Boolean(user),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about rent, payments, and your rental account."
      />
      {failure && (
        <p role="alert" className="text-destructive">
          {failure}
        </p>
      )}
      {error ? (
        <DataNotice error={error} />
      ) : loading ? (
        <PageSkeleton />
      ) : !data.length ? (
        <EmptyState
          title="You’re all caught up"
          description="New account updates will appear here."
        />
      ) : (
        <div className="space-y-3">
          {[...data]
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            )
            .map((n) => (
              <Card key={n.id}>
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="font-semibold">{n.title}</h2>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <Badge variant="outline">
                      {n.read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                  {!n.read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, "notifications", n.id), {
                            read: true,
                          });
                          setFailure("");
                        } catch {
                          setFailure(
                            "Could not mark this notification as read. Please retry.",
                          );
                        }
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
