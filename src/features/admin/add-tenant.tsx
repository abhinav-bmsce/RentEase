import { RoomForm } from "@/components/shared/room-form";
import { TenantPhotoInput } from "@/components/shared/tenant-photo-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatMoney, rupeesToPaise } from "@/lib/money";
import { roomLabel } from "@/lib/rooms";
import type { PropertyDoc, RoomDoc } from "@/lib/types";
import { createTenant } from "@/services/tenant-service";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

const addTenantSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  phone: z
    .string()
    .min(10, "Valid 10-digit phone number is required")
    .max(15, "Phone number too long"),
  password: z
    .string()
    .min(6, "Temporary password must be at least 6 characters"),
  roomId: z.string().min(1, "Please select a room"),
  securityDeposit: z.coerce.number().min(0, "Deposit cannot be negative"),
  rentDueDay: z.coerce.number().min(1).max(28, "Day must be between 1 and 28"),
  startDate: z.string().min(1, "Start date is required"),
});

type AddTenantFormValues = z.infer<typeof addTenantSchema>;

export function AddTenant() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  // Fetch vacant rooms
  const {
    data: rooms,
    loading: roomsLoading,
    error: roomsError,
  } = useCollectionRealtime<RoomDoc>("rooms");
  const { data: properties } = useCollectionRealtime<PropertyDoc>("properties");
  const availableRooms = rooms.filter((r) => r.status === "vacant");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddTenantFormValues>({
    resolver: zodResolver(addTenantSchema),
    defaultValues: {
      name: "",
      username: "",
      phone: "",
      password: "TempPassword@123",
      roomId: "",
      securityDeposit: 15000,
      rentDueDay: 5,
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedRoomId = watch("roomId");
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const onSubmit = async (data: AddTenantFormValues) => {
    if (photoBusy || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createTenant({
        name: data.name,
        photoUrl,
        username: data.username,
        phone: data.phone,
        password: data.password,
        roomId: data.roomId,
        securityDeposit: rupeesToPaise(data.securityDeposit),
        rentDueDay: data.rentDueDay,
        startDate: new Date(data.startDate),
      });

      toast({
        title: "Tenant Created Successfully!",
        description: `Account for ${data.name} (@${data.username}) has been initialized.`,
      });

      navigate("/a/tenants");
    } catch (err: unknown) {
      console.error(err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to create tenant";
      toast({
        variant: "destructive",
        title: "Failed to Create Tenant",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/a/tenants">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Tenants
          </Link>
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Onboard New Tenant
        </h1>
        <p className="text-sm text-muted-foreground">
          Create tenant credentials, assign a room, and set lease terms
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant & Lease Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Rahul Sharma"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <TenantPhotoInput
              value={photoUrl}
              onChange={setPhotoUrl}
              onBusyChange={setPhotoBusy}
              disabled={isSubmitting}
            />

            {/* Username & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username (Login ID) *</Label>
                <Input
                  id="username"
                  placeholder="e.g. rahul_sharma"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Tenant will use this username to sign in.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="e.g. 9876543210"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Temporary Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Temporary Password *</Label>
              <Input id="password" type="text" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Tenant will be required to change this upon first login.
              </p>
            </div>

            {/* Room Assignment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="room">Assign Room *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setRoomOpen(true)}
                >
                  + Add room
                </Button>
              </div>
              {roomsError ? (
                <p role="alert" className="text-xs text-destructive">
                  Could not load rooms: {roomsError.message}
                </p>
              ) : roomsLoading ? (
                <p role="status" className="text-xs text-muted-foreground">
                  Loading rooms…
                </p>
              ) : (
                availableRooms.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {rooms.length === 0
                      ? "No rooms have been created yet. Add a property, floor and room to get started."
                      : "All rooms are occupied. Add another room or end an existing lease to make a room available."}
                  </p>
                )
              )}
              <Select
                disabled={roomsLoading || Boolean(roomsError) || isSubmitting}
                value={selectedRoomId}
                onValueChange={(val) =>
                  setValue("roomId", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="room">
                  <SelectValue placeholder="Select an available vacant room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No vacant rooms available
                    </SelectItem>
                  ) : (
                    availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {properties.find((p) => p.id === room.propertyId)
                          ?.name || "Property"}{" "}
                        · {roomLabel(room)} — {formatMoney(room.monthlyRent)}/mo
                        (Power: {formatMoney(room.electricityRate)}/u)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.roomId && (
                <p className="text-xs text-destructive">
                  {errors.roomId.message}
                </p>
              )}
            </div>

            {selectedRoom && (
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <span className="font-semibold block text-foreground">
                  Room Details:
                </span>
                <p className="text-muted-foreground">
                  Rent: {formatMoney(selectedRoom.monthlyRent)}/mo • Power Rate:{" "}
                  {formatMoney(selectedRoom.electricityRate)}/unit • Last Meter:{" "}
                  {selectedRoom.lastMeterReading}
                </p>
              </div>
            )}

            {/* Security Deposit & Rent Due Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="securityDeposit">Security Deposit (₹)</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  step="100"
                  {...register("securityDeposit")}
                />
                {errors.securityDeposit && (
                  <p className="text-xs text-destructive">
                    {errors.securityDeposit.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rentDueDay">Monthly Rent Due Day</Label>
                <Input
                  id="rentDueDay"
                  type="number"
                  min="1"
                  max="28"
                  {...register("rentDueDay")}
                />
                {errors.rentDueDay && (
                  <p className="text-xs text-destructive">
                    {errors.rentDueDay.message}
                  </p>
                )}
              </div>
            </div>

            {/* Lease Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Lease Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full mt-4"
              disabled={
                isSubmitting ||
                photoBusy ||
                roomsLoading ||
                Boolean(roomsError) ||
                !selectedRoom ||
                selectedRoom.status !== "vacant"
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Tenant Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Tenant Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a room</DialogTitle>
            <DialogDescription>
              Create a room and select it for this tenant. Your tenant details
              will stay in this form.
            </DialogDescription>
          </DialogHeader>
          <RoomForm
            onCreated={(id) => {
              setValue("roomId", id, { shouldValidate: true });
              setRoomOpen(false);
              toast({
                title: "Room added",
                description: "The new room is selected for this tenant.",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
