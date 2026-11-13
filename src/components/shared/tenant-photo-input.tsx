import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prepareTenantPhoto } from "@/services/tenant-photo-service";
import { useId, useState } from "react";
export function TenantPhotoInput({
  value,
  onChange,
  onBusyChange,
  disabled = false,
  label = "Identification photo (optional)",
  description = "JPG, PNG or WebP, up to 5 MB. Visible to administrators and this tenant.",
}: {
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <Avatar className="h-20 w-20 rounded-lg">
          <AvatarImage
            src={value || undefined}
            alt="Selected photograph preview"
            className="object-cover"
          />
          <AvatarFallback className="rounded-lg text-xs">
            No photo
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1.5">
          <Input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setBusy(true);
              onBusyChange(true);
              setError("");
              try {
                onChange(await prepareTenantPhoto(file));
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Could not prepare photo.",
                );
              } finally {
                setBusy(false);
                onBusyChange(false);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">{description}</p>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || busy}
              onClick={() => {
                onChange("");
                setError("");
              }}
            >
              Remove photo
            </Button>
          )}
        </div>
      </div>
      {busy && (
        <p role="status" className="text-xs text-muted-foreground">
          Preparing photo…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
