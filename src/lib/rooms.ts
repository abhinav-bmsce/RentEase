import type { RoomDoc } from "./types";
export function floorLabel(floor?: number): string {
  return floor === undefined
    ? "Floor not set"
    : floor === 0
      ? "Ground floor"
      : `Floor ${floor}`;
}
export function roomLabel(
  room: Pick<RoomDoc, "name" | "roomNumber" | "floorNumber">,
): string {
  const name = room.roomNumber ? `Room ${room.roomNumber}` : room.name;
  return room.floorNumber === undefined
    ? name
    : `${floorLabel(room.floorNumber)} · ${name}`;
}
export function roomKey(
  propertyId: string,
  floor: number,
  number: string,
): string {
  return encodeURIComponent(
    JSON.stringify([propertyId, floor, number.trim().toLowerCase()]),
  );
}
