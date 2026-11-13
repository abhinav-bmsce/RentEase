import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { rupeesToPaise } from "@/lib/money";
import type { PropertyDoc } from "@/lib/types";
import { createProperty, createRoom } from "@/services/property-service";
import { useState } from "react";

export function RoomForm({ onCreated }: { onCreated: (id: string) => void }) {
  const {
    data: properties,
    loading,
    error: loadError,
  } = useCollectionRealtime<PropertyDoc>("properties");
  const [propertyId, setPropertyId] = useState("");
  const [newName, setNewName] = useState("");
  const [floor, setFloor] = useState("0");
  const [number, setNumber] = useState("");
  const [rent, setRent] = useState("8000");
  const [rate, setRate] = useState("8");
  const [meter, setMeter] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // If there is only one building, select it without an extra step.
  const selected =
    propertyId ||
    (properties.length === 1
      ? properties[0]!.id
      : properties.length === 0
        ? "new"
        : "");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (!selected) throw new Error("Choose a property.");
      if (!number.trim()) throw new Error("Enter a room number.");
      if (!Number.isSafeInteger(Number(floor)))
        throw new Error("Enter a whole floor number.");
      let id = selected;
      if (id === "new") {
        if (!newName.trim()) throw new Error("Enter a property name.");
        id = await createProperty(newName.trim(), "");
        setPropertyId(id);
      }
      const roomId = await createRoom({
        propertyId: id,
        name: `Room ${number.trim()}`,
        floorNumber: Number(floor),
        roomNumber: number,
        monthlyRent: rupeesToPaise(Number(rent)),
        electricityRate: rupeesToPaise(Number(rate)),
        initialMeterReading: Number(meter),
      });
      onCreated(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {(error || loadError) && (
        <p role="alert" className="text-sm text-destructive">
          {error || loadError?.message}
        </p>
      )}
      <fieldset
        disabled={saving || loading || Boolean(loadError)}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-room-property">Property *</Label>
          <select
            id="new-room-property"
            value={selected}
            onChange={(e) => setPropertyId(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select property
            </option>
            {properties.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
            <option value="new">+ Create new property</option>
          </select>
        </div>
        {selected === "new" && (
          <div className="space-y-1.5">
            <Label htmlFor="new-property-name">New property name *</Label>
            <Input
              id="new-property-name"
              placeholder="e.g. RentEase Residences"
              required
              maxLength={100}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-room-floor">Floor number *</Label>
            <Input
              id="new-room-floor"
              type="number"
              step="1"
              min="-10"
              max="200"
              required
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              0 = ground, −1 = basement
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-room-number">Room number *</Label>
            <Input
              id="new-room-number"
              placeholder="e.g. 101 or 2B"
              maxLength={30}
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-room-rent">Monthly rent (₹) *</Label>
            <Input
              id="new-room-rent"
              type="number"
              min="0"
              step="0.01"
              required
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-room-rate">Power rate (₹/unit) *</Label>
            <Input
              id="new-room-rate"
              type="number"
              min="0"
              step="0.01"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-room-meter">Initial meter reading</Label>
          <Input
            id="new-room-meter"
            type="number"
            min="0"
            step="0.01"
            required
            value={meter}
            onChange={(e) => setMeter(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full">
          {saving
            ? "Creating room…"
            : loading
              ? "Loading properties…"
              : "Create Room"}
        </Button>
      </fieldset>
    </form>
  );
}
