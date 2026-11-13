import { Link } from "react-router-dom";
import { DataNotice } from "@/components/shared/data-notice";
import {
  EmptyState,
  PageHeader,
  PageSkeleton,
  SearchField,
} from "@/components/shared/page-ui";
import { TenantPhotoInput } from "@/components/shared/tenant-photo-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/money";
import { roomLabel } from "@/lib/rooms";
import type { PropertyDoc, RoomDoc, WithId } from "@/lib/types";
import { maintenanceStatuses, type MaintenanceStatus } from "@/lib/workflows";
import {
  reviewMaintenance,
  submitMaintenance,
  type MaintenanceDoc,
} from "@/services/workspace-service";
import { where } from "firebase/firestore";
import { useState } from "react";
const selectStyle = "h-10 rounded-md border bg-background px-3 text-sm";
export function MaintenanceWorkspace() {
  const { user, userDoc, isAdmin } = useAuth();
  const { toast } = useToast();
  const { data, loading, error } = useCollectionRealtime<MaintenanceDoc>(
    "maintenance",
    isAdmin ? [] : [where("tenantUid", "==", user?.uid || "")],
    Boolean(user),
  );
  const { data: rooms } = useCollectionRealtime<RoomDoc>("rooms");
  const { data: properties } = useCollectionRealtime<PropertyDoc>("properties");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [propertyId, setPropertyId] = useState("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photo, setPhoto] = useState("");
  const [formError, setFormError] = useState("");
  const [review, setReview] = useState<WithId<MaintenanceDoc> | null>(null);
  const filtered = [...data]
    .filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (priority === "all" || r.priority === priority) &&
        (propertyId === "all" || r.propertyId === propertyId) &&
        `${r.description} ${r.category} ${rooms.find((room) => room.id === r.roomId)?.name || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description={
          isAdmin
            ? "Coordinate repairs, track progress, and keep every room in good shape."
            : "Report a problem with your room and follow the repair from start to finish."
        }
        action={
          !isAdmin && (
            <Button
              onClick={() => {
                setPhoto("");
                setFormError("");
                setOpen(true);
              }}
            >
              New request
            </Button>
          )
        }
      />
      <div className="flex flex-wrap gap-3">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search problem or room…"
        />
        <select
          aria-label="Filter status"
          className={selectStyle}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {maintenanceStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter priority"
          className={selectStyle}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="all">All priorities</option>
          {["low", "normal", "urgent"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {isAdmin && (
          <select
            aria-label="Filter property"
            className={selectStyle}
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="all">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error ? (
        <DataNotice error={error} />
      ) : loading ? (
        <PageSkeleton />
      ) : !filtered.length ? (
        <EmptyState
          title="No maintenance requests"
          description="Requests and their repair history will appear here. Try another filter if you expected a record."
        />
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 space-y-3">
                {!isAdmin && userDoc?.tenancyId && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={`/t/messages?maintenance=${encodeURIComponent(r.id)}`}
                    >
                      Discuss with Owner
                    </Link>
                  </Button>
                )}
                <div className="flex flex-wrap justify-between gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {r.status.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={
                      r.priority === "urgent" ? "destructive" : "outline"
                    }
                  >
                    {r.priority}
                  </Badge>
                </div>
                <h2 className="font-semibold capitalize">
                  {r.category.replace("_", " ")}
                </h2>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {r.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Repair needed: {r.repairNeeded}
                </p>
                <p className="text-xs text-muted-foreground">
                  {properties.find((p) => p.id === r.propertyId)?.name} ·{" "}
                  {rooms.find((room) => room.id === r.roomId)
                    ? roomLabel(rooms.find((room) => room.id === r.roomId)!)
                    : "Assigned room"}
                </p>
                {r.photoUrl && (
                  <img
                    src={r.photoUrl}
                    alt="Reported maintenance problem"
                    width={160}
                    height={120}
                    className="h-32 w-40 rounded-lg object-contain border"
                  />
                )}
                {r.assignee && (
                  <p className="text-sm">Assigned to {r.assignee}</p>
                )}
                {isAdmin && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      Repair cost: {formatMoney(r.cost || 0)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReview(r);
                        setFormError("");
                      }}
                    >
                      Manage request
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New maintenance request</DialogTitle>
            <DialogDescription>
              Describe the issue clearly. For immediate danger, contact your
              property manager directly.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setFormError("");
              const fields = new FormData(e.currentTarget);
              try {
                await submitMaintenance({
                  category: String(fields.get("category")),
                  description: String(fields.get("description")),
                  repairNeeded: String(fields.get("repair")),
                  priority: String(fields.get("priority")),
                  photoUrl: photo,
                });
                setOpen(false);
                toast({ title: "Request submitted" });
              } catch (err) {
                setFormError(
                  err instanceof Error ? err.message : "Request failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={busy || photoBusy} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Label className="space-y-2">
                  Category
                  <select name="category" className={`${selectStyle} w-full`}>
                    {[
                      "plumbing",
                      "electrical",
                      "appliances",
                      "furniture",
                      "doors_windows",
                      "other",
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Label>
                <Label className="space-y-2">
                  Requested priority
                  <select
                    name="priority"
                    defaultValue="normal"
                    className={`${selectStyle} w-full`}
                  >
                    {["low", "normal", "urgent"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Label>
              </div>
              <Label className="block space-y-2">
                Problem description
                <Textarea
                  name="description"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </Label>
              <Label className="block space-y-2">
                Repair needed
                <Textarea
                  name="repair"
                  required
                  minLength={3}
                  maxLength={1000}
                />
              </Label>
            </fieldset>
            <TenantPhotoInput
              value={photo}
              onChange={setPhoto}
              onBusyChange={setPhotoBusy}
              disabled={busy}
              label="Problem photograph (optional)"
              description="JPG, PNG or WebP, up to 5 MB. Shared only with your property manager."
            />
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button disabled={busy || photoBusy} type="submit">
              {busy ? "Submitting…" : "Submit request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(review)} onOpenChange={() => setReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage repair</DialogTitle>
            <DialogDescription>
              Move through each stage in order. Repair costs are records, not
              automatic tenant charges.
            </DialogDescription>
          </DialogHeader>
          {review && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(true);
                try {
                  await reviewMaintenance(
                    review.id,
                    String(f.get("status")) as MaintenanceStatus,
                    String(f.get("assignee")),
                    Math.round(Number(f.get("cost")) * 100),
                  );
                  setReview(null);
                  toast({ title: "Request updated" });
                } catch (err) {
                  setFormError(
                    err instanceof Error ? err.message : "Update failed.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Label className="block space-y-2">
                Status
                <select
                  name="status"
                  defaultValue={review.status}
                  className={`${selectStyle} w-full`}
                >
                  {maintenanceStatuses
                    .filter(
                      (_, i) =>
                        i === maintenanceStatuses.indexOf(review.status) ||
                        i === maintenanceStatuses.indexOf(review.status) + 1,
                    )
                    .map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                </select>
              </Label>
              <Label className="block space-y-2">
                Repair person
                <Input
                  name="assignee"
                  defaultValue={review.assignee}
                  maxLength={100}
                />
              </Label>
              <Label className="block space-y-2">
                Repair cost (₹)
                <Input
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(review.cost || 0) / 100}
                />
              </Label>
              {formError && (
                <p role="alert" className="text-destructive text-sm">
                  {formError}
                </p>
              )}
              <Button disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
