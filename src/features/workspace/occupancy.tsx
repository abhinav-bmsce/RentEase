import { DataNotice } from "@/components/shared/data-notice";
import {
  EmptyState,
  PageHeader,
  PageSkeleton,
  SearchField,
  SetupNotice,
} from "@/components/shared/page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { roomLabel } from "@/lib/rooms";
import type { PropertyDoc, RoomDoc, TenancyDoc, UserDoc } from "@/lib/types";
import { registrationDueDate } from "@/lib/workflows";
import { updateRoom } from "@/services/property-service";
import { where } from "firebase/firestore";
import { useState } from "react";
import { Link } from "react-router-dom";
export function OccupancyWorkspace() {
  const { user, userDoc, isAdmin } = useAuth();
  const { toast } = useToast();
  const {
    data: rooms,
    loading,
    error,
  } = useCollectionRealtime<RoomDoc>("rooms");
  const { data: properties } = useCollectionRealtime<PropertyDoc>("properties");
  const { data: tenants } = useCollectionRealtime<UserDoc>(
    "users",
    [where("role", "==", "tenant")],
    isAdmin,
  );
  const { data: leases, error: leaseError } = useCollectionRealtime<TenancyDoc>(
    "tenancies",
    isAdmin ? [] : [where("tenantUid", "==", user?.uid || "")],
    Boolean(user),
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState("");
  const shown = rooms.filter(
    (r) =>
      (isAdmin || leases.some((t) => t.roomId === r.id && t.active)) &&
      (filter === "all" || r.status === filter) &&
      roomLabel(r).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Rooms & occupancy" : "Room occupants"}
        description="Room capacity, registered primary tenants, and move-in registration deadlines."
        action={
          isAdmin && (
            <Button asChild>
              <Link to="/a/properties">Manage rooms</Link>
            </Button>
          )
        }
      />
      <SetupNotice>
        Primary tenant assignments are live. Co-occupant invitations, individual
        document submissions, review status, and automatic deadline reminders
        require an invitation service and scheduled backend jobs. They are not
        yet enabled.
      </SetupNotice>
      <div className="flex flex-wrap gap-3">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search floor or room…"
        />
        {isAdmin && (
          <select
            aria-label="Occupancy filter"
            className="rounded-md border bg-background px-3"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All rooms</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
        )}
      </div>
      {error || leaseError ? (
        <DataNotice error={(error || leaseError)!} />
      ) : loading ? (
        <PageSkeleton />
      ) : !shown.length ? (
        <EmptyState
          title="No rooms to show"
          description={
            isAdmin
              ? "Add a property and room to start tracking occupancy."
              : "Your property manager has not assigned an active room yet."
          }
        />
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {shown.map((r) => {
            const active = leases.filter((t) => t.roomId === r.id && t.active);
            return (
              <Card key={r.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{roomLabel(r)}</h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {properties.find((p) => p.id === r.propertyId)?.name}
                      </p>
                    </div>
                    <Badge
                      variant={
                        r.status === "occupied" ? "secondary" : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {active.length} registered primary tenant
                    {active.length === 1 ? "" : "s"} · capacity{" "}
                    {r.maxOccupancy || 1}
                  </p>
                  {active.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg bg-muted/50 p-3 text-sm"
                    >
                      <strong>
                        {isAdmin
                          ? tenants.find((u) => u.id === t.tenantUid)?.name ||
                            "Tenant"
                          : userDoc?.name}
                      </strong>
                      <p className="text-xs text-muted-foreground mt-1">
                        Move-in:{" "}
                        {t.startDate
                          ? formatDate(t.startDate.toDate())
                          : "Not recorded"}
                      </p>
                      {t.startDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Registration deadline:{" "}
                          {formatDate(
                            registrationDueDate(
                              t.startDate.toDate(),
                              r.registrationDeadlineDays || 7,
                            ),
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                  {isAdmin && (
                    <form
                      className="flex flex-wrap gap-3 items-end"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const capacity = Number(f.get("capacity"));
                        if (
                          !Number.isSafeInteger(capacity) ||
                          capacity < Math.max(1, active.length)
                        ) {
                          toast({
                            variant: "destructive",
                            title:
                              "Capacity cannot be below registered occupancy.",
                          });
                          return;
                        }
                        setSaving(r.id);
                        try {
                          await updateRoom(r.id, {
                            maxOccupancy: capacity,
                            registrationDeadlineDays: Number(
                              f.get("deadline"),
                            ) as 5 | 7 | 10,
                          });
                          toast({ title: "Room policy saved" });
                        } catch {
                          toast({
                            variant: "destructive",
                            title: "Could not save room policy",
                          });
                        } finally {
                          setSaving("");
                        }
                      }}
                    >
                      <Label className="space-y-2">
                        Capacity
                        <Input
                          name="capacity"
                          type="number"
                          min={Math.max(1, active.length)}
                          max={20}
                          defaultValue={r.maxOccupancy || 1}
                          className="w-24"
                          required
                        />
                      </Label>
                      <Label className="space-y-2">
                        Registration due
                        <select
                          name="deadline"
                          defaultValue={r.registrationDeadlineDays || 7}
                          className="block h-10 rounded-md border bg-background px-3"
                        >
                          {[5, 7, 10].map((d) => (
                            <option key={d} value={d}>
                              {d} days
                            </option>
                          ))}
                        </select>
                      </Label>
                      <Button variant="outline" disabled={saving === r.id}>
                        {saving === r.id ? "Saving…" : "Save policy"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
