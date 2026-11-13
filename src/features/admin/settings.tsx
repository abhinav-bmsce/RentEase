import { DataNotice } from "@/components/shared/data-notice";
import { PageSkeleton } from "@/components/shared/page-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDocumentRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import type { SettingsDoc } from "@/lib/types";
import { updateSettings } from "@/services/settings-service";
import { Building, Calendar, Loader2, QrCode, Save } from "lucide-react";
import { useEffect, useState } from "react";

export function SettingsPage() {
  const { toast } = useToast();
  const { data: settingsData, loading, error } = useDocumentRealtime<SettingsDoc>(
    "settings",
    "general",
  );

  const [upiId, setUpiId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [defaultDueDay, setDefaultDueDay] = useState(5);
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [lateFeeRupees, setLateFeeRupees] = useState("200");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settingsData) {
      setUpiId(settingsData.upiId || "");
      setBusinessName(settingsData.businessName || "");
      setBusinessPhone(settingsData.businessPhone || "");
      setDefaultDueDay(settingsData.defaultDueDay || 5);
      setLateFeeEnabled(settingsData.lateFeeEnabled || false);
      setLateFeeRupees(
        String(paiseToRupees(settingsData.lateFeeAmount || 20000)),
      );
    } else {
      setUpiId(import.meta.env.VITE_DEFAULT_UPI_ID || "");
      setBusinessName("");
      setBusinessPhone("");
    }
  }, [settingsData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        upiId: upiId.trim(),
        businessName: businessName.trim(),
        businessPhone: businessPhone.trim(),
        defaultDueDay: Number(defaultDueDay),
        lateFeeEnabled,
        lateFeeAmount: rupeesToPaise(parseFloat(lateFeeRupees) || 0),
      });

      toast({
        title: "Settings Saved",
        description:
          "Payment parameters and landlord preferences updated successfully.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (error) return <DataNotice error={error} />;
  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portal Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure UPI payment receiving address, billing schedules, and late
          fees
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* UPI & Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              UPI Payment Gateway
            </CardTitle>
            <CardDescription className="text-xs">
              Tenants will scan this UPI ID to transfer rent directly to your
              bank account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="upiId">Landlord UPI ID / VPA *</Label>
              <Input
                id="upiId"
                placeholder="e.g. yourname@okaxis or 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                All tenant payment QR codes encode this VPA.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Business & Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              Landlord & Property Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Property / Business Name</Label>
              <Input
                id="businessName"
                placeholder="e.g. Greenview Residency"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessPhone">Contact Phone Number</Label>
              <Input
                id="businessPhone"
                placeholder="e.g. +91 98765 43210"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Appears on printed PDF receipts and tenant invoices.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Billing Schedule & Late Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Billing Rules & Late Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="defaultDueDay">
                Default Rent Due Day of Month
              </Label>
              <Input
                id="defaultDueDay"
                type="number"
                min="1"
                max="28"
                value={defaultDueDay}
                onChange={(e) => setDefaultDueDay(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                e.g. 5 means rent is due on the 5th of every calendar month.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>Enable Automated Late Fee Policy</Label>
                <p className="text-[11px] text-muted-foreground">
                  Adds fixed penalty charge to overdue invoices.
                </p>
              </div>
              <Switch
                checked={lateFeeEnabled}
                onCheckedChange={setLateFeeEnabled}
              />
            </div>

            {lateFeeEnabled && (
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="lateFeeRupees">Late Fee Amount (₹)</Label>
                <Input
                  id="lateFeeRupees"
                  type="number"
                  step="50"
                  value={lateFeeRupees}
                  onChange={(e) => setLateFeeRupees(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
