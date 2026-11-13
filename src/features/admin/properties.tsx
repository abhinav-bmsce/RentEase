import { DataNotice } from "@/components/shared/data-notice";
import { RoomForm } from "@/components/shared/room-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/money";
import { roomLabel } from "@/lib/rooms";
import type { PropertyDoc, RoomDoc } from "@/lib/types";
import { createProperty } from "@/services/property-service";
import { Building2, Home, Loader2, MapPin, Plus, Zap } from "lucide-react";
import { useState } from "react";

export function PropertyManagement() {
  const { toast } = useToast();
  const { data: properties, loading: propLoading, error } =
    useCollectionRealtime<PropertyDoc>("properties");
  const { data: rooms } = useCollectionRealtime<RoomDoc>("rooms");

  // Add Property state
  const [propOpen, setPropOpen] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [savingProp, setSavingProp] = useState(false);

  // Add Room state
  const [roomOpen, setRoomOpen] = useState(false);
  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName.trim()) return;

    setSavingProp(true);
    try {
      await createProperty(propName, propAddress);
      toast({
        title: "Property Added",
        description: `${propName} has been created.`,
      });
      setPropName("");
      setPropAddress("");
      setPropOpen(false);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add property",
      });
    } finally {
      setSavingProp(false);
    }
  };

  if (error) return <DataNotice error={error} />;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Properties & Rooms
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your buildings, rental units, and power meter configurations
          </p>
        </div>

        <div className="flex gap-2">
          {/* Add Property Dialog */}
          <Dialog open={propOpen} onOpenChange={setPropOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Building2 className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Property</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProperty} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="propName">Property Name *</Label>
                  <Input
                    id="propName"
                    placeholder="e.g. Sunrise Apartments"
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="propAddress">Address / Location</Label>
                  <Input
                    id="propAddress"
                    placeholder="e.g. 124 5th Cross, Koramangala, Bengaluru"
                    value={propAddress}
                    onChange={(e) => setPropAddress(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={savingProp}>
                  {savingProp ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Create Property
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Room Dialog */}
          <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
              </DialogHeader>
              <RoomForm
                onCreated={() => {
                  setRoomOpen(false);
                  toast({
                    title: "Room added",
                    description:
                      "This room is now available for tenant assignment.",
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Property and Room list */}
      {propLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      ) : properties.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-xl bg-card">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-base">No properties added yet</p>
          <p className="text-xs mt-1">
            Click "Add Property" to create your first rental building.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((prop) => {
            const propertyRooms = rooms
              .filter((r) => r.propertyId === prop.id)
              .sort(
                (a, b) =>
                  (a.floorNumber ?? 0) - (b.floorNumber ?? 0) ||
                  (a.roomNumber || a.name).localeCompare(
                    b.roomNumber || b.name,
                    undefined,
                    { numeric: true },
                  ),
              );

            return (
              <Card key={prop.id}>
                <CardHeader className="pb-3 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {prop.name}
                      </CardTitle>
                      {prop.address && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {prop.address}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {propertyRooms.length} Room
                      {propertyRooms.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {propertyRooms.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No rooms added to this property yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {propertyRooms.map((room) => (
                        <div
                          key={room.id}
                          className="p-3.5 border rounded-lg bg-muted/20 space-y-2 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-primary" />
                              {roomLabel(room)}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                room.status === "occupied"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                  : "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                              }
                            >
                              {room.status}
                            </Badge>
                          </div>

                          <div className="text-xs space-y-1 text-muted-foreground pt-1">
                            <div className="flex justify-between">
                              <span>Rent:</span>
                              <span className="font-medium text-foreground">
                                {formatMoney(room.monthlyRent)}/mo
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Electricity:
                              </span>
                              <span className="font-medium text-foreground">
                                {formatMoney(room.electricityRate)}/u
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Meter:</span>
                              <span className="font-mono text-foreground">
                                {room.lastMeterReading}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
