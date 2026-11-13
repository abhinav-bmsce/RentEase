import { TenantPhotoInput } from "@/components/shared/tenant-photo-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCollectionRealtime,
  useDocumentRealtime,
} from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { roomLabel } from "@/lib/rooms";
import type {
  BillDoc,
  PropertyDoc,
  RoomDoc,
  TenancyDoc,
  UserDoc,
} from "@/lib/types";
import {
  endTenancy,
  updateTenantPhoto,
  updateTenantStatus,
} from "@/services/tenant-service";
import { orderBy, where } from "firebase/firestore";
import { ArrowLeft, Home, Loader2, Phone, Receipt, Shield } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [photoDraft, setPhotoDraft] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const { data: tenant, loading: tenantLoading } = useDocumentRealtime<UserDoc>(
    "users",
    id,
  );
  const { data: tenancy } = useDocumentRealtime<TenancyDoc>(
    "tenancies",
    tenant?.tenancyId,
  );
  const { data: room } = useDocumentRealtime<RoomDoc>("rooms", tenancy?.roomId);
  const { data: property } = useDocumentRealtime<PropertyDoc>(
    "properties",
    room?.propertyId,
  );

  // Tenant bills
  const { data: bills } = useCollectionRealtime<BillDoc>(
    "bills",
    id ? [where("tenantUid", "==", id), orderBy("month", "desc")] : [],
    Boolean(id),
  );

  if (tenantLoading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Tenant not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/a/tenants">Back to Tenants</Link>
        </Button>
      </div>
    );
  }

  const handleToggleActive = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await updateTenantStatus(id, !tenant.active);
      toast({
        title: "Status Updated",
        description: `Tenant account has been ${tenant.active ? "deactivated" : "activated"}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not change tenant status",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEndTenancy = async () => {
    if (!tenant.tenancyId || !tenancy?.roomId) return;
    const confirmed = window.confirm(
      "Are you sure you want to end this tenancy? The assigned room will be marked vacant.",
    );
    if (!confirmed) return;

    setIsUpdating(true);
    try {
      await endTenancy(tenant.tenancyId, tenancy.roomId);
      toast({
        title: "Tenancy Ended",
        description: "Room is now marked vacant.",
      });
      navigate("/a/tenants");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to End Tenancy",
        description: "Could not update tenancy record",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/a/tenants">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Tenants
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              tenant.active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }
          >
            {tenant.active ? "Active Account" : "Deactivated"}
          </Badge>
        </div>
      </div>

      {/* Main Profile Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border p-6 rounded-xl">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage
              src={tenant.photoUrl}
              alt={`${tenant.name} identification photo`}
              className="object-cover"
            />
            <AvatarFallback>
              {tenant.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              @{tenant.username}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              {tenant.phone || "No phone"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={editingPhoto}
            onClick={() => {
              setPhotoDraft(tenant.photoUrl || "");
              setEditingPhoto(true);
            }}
          >
            {tenant.photoUrl ? "Change photo" : "Add photo"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tenant.active ? (
              "Deactivate Account"
            ) : (
              "Activate Account"
            )}
          </Button>

          {tenancy?.active && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndTenancy}
              disabled={isUpdating}
            >
              End Lease / Vacate
            </Button>
          )}
        </div>
      </div>

      {editingPhoto && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tenant identification photo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TenantPhotoInput
              value={photoDraft}
              onChange={setPhotoDraft}
              onBusyChange={setPhotoBusy}
              disabled={savingPhoto}
            />
            <div className="flex gap-2">
              <Button
                disabled={photoBusy || savingPhoto}
                onClick={async () => {
                  if (!id) return;
                  setSavingPhoto(true);
                  try {
                    await updateTenantPhoto(id, photoDraft);
                    setEditingPhoto(false);
                    toast({ title: "Photo saved" });
                  } catch (err) {
                    toast({
                      variant: "destructive",
                      title: "Could not save photo",
                      description:
                        err instanceof Error
                          ? err.message
                          : "Please try again.",
                    });
                  } finally {
                    setSavingPhoto(false);
                  }
                }}
              >
                {savingPhoto ? "Saving…" : "Save photo"}
              </Button>
              <Button
                variant="outline"
                disabled={photoBusy || savingPhoto}
                onClick={() => setEditingPhoto(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenancy & Lease info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              Property & Room Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property</span>
              <span className="font-semibold">{property?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room</span>
              <span className="font-semibold">
                {room ? roomLabel(room) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Rent</span>
              <span className="font-semibold">
                {room ? formatMoney(room.monthlyRent) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Electricity Rate</span>
              <span className="font-semibold">
                {room ? `${formatMoney(room.electricityRate)} / unit` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Recorded Meter</span>
              <span className="font-semibold">
                {room?.lastMeterReading ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Lease & Deposit Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Security Deposit</span>
              <span className="font-semibold">
                {tenancy ? formatMoney(tenancy.securityDeposit) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit Status</span>
              <Badge variant="outline" className="capitalize text-xs">
                {tenancy?.depositStatus
                  ? tenancy.depositStatus.replace("_", " ")
                  : "Held"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rent Due Day</span>
              <span className="font-semibold">
                {tenancy?.rentDueDay
                  ? `${tenancy.rentDueDay}th of month`
                  : "5th"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lease Start</span>
              <span className="font-semibold">
                {tenancy?.startDate
                  ? formatDate(
                      tenancy.startDate.toDate
                        ? tenancy.startDate.toDate()
                        : new Date(tenancy.startDate as unknown as string),
                    )
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills history table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No bills generated for this tenant.
            </p>
          ) : (
            <div className="divide-y text-xs sm:text-sm">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="py-2.5 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold block">
                      {formatMonth(bill.month)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Due:{" "}
                      {formatDate(
                        bill.dueDate?.toDate
                          ? bill.dueDate.toDate()
                          : new Date(),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatMoney(bill.total)}</span>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {bill.status}
                    </Badge>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      <Link to={`/a/billing/${bill.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
