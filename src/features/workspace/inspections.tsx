import { PageHeader, SetupNotice } from "@/components/shared/page-ui";
import { TenantPhotoInput } from "@/components/shared/tenant-photo-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inspectionAreas } from "@/lib/workflows";
import { useState } from "react";
export function InspectionWorkspace() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [busy, setBusy] = useState(false);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [agreement, setAgreement] = useState("not_reviewed");
  function exportSummary() {
    const summary = [
      "RentEase — local inspection draft",
      "This is an unsigned draft, not a saved or agreed inspection.",
      ...inspectionAreas.map(
        (a) =>
          `${a}: ${conditions[a] || "Not assessed"} — ${remarks[a] || "No remarks"}`,
      ),
      `Review: ${agreement}`,
      "No charges are calculated or imposed by this summary.",
    ].join("\n\n");
    const url = URL.createObjectURL(
      new Blob([summary], { type: "text/plain" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "rentease-inspection-draft.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Move-in & move-out"
        description="Compare room condition, record observations, and make space for both perspectives."
      />
      <SetupNotice>
        This manual comparison is a local draft. Photos stay in this browser
        session and are not uploaded. Persistent inspections, shared review,
        authenticated agreement, and maintenance-history linking require a
        backend workflow. Reloading or leaving this page clears the draft.
      </SetupNotice>
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold">Move-in baseline</h2>
            <TenantPhotoInput
              value={before}
              onChange={setBefore}
              onBusyChange={setBusy}
              label="Move-in photograph"
              description="Local preview only. JPG, PNG or WebP, up to 5 MB."
            />
            {before && (
              <img
                src={before}
                alt="Move-in room condition"
                width={640}
                height={480}
                className="w-full aspect-[4/3] rounded-lg object-contain bg-muted"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold">Move-out condition</h2>
            <TenantPhotoInput
              value={after}
              onChange={setAfter}
              onBusyChange={setBusy}
              label="Move-out photograph"
              description="Local preview only. JPG, PNG or WebP, up to 5 MB."
            />
            {after && (
              <img
                src={after}
                alt="Move-out room condition"
                width={640}
                height={480}
                className="w-full aspect-[4/3] rounded-lg object-contain bg-muted"
              />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-5 space-y-5">
          <h2 className="font-semibold">Condition checklist</h2>
          {inspectionAreas.map((area) => (
            <div
              key={area}
              className="grid sm:grid-cols-[180px_1fr] gap-3 border-t pt-4"
            >
              <Label className="space-y-2">
                {area}
                <select
                  aria-label={`${area} condition`}
                  className="block h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={conditions[area] || ""}
                  onChange={(e) =>
                    setConditions({ ...conditions, [area]: e.target.value })
                  }
                >
                  <option value="">Not assessed</option>
                  <option>Good condition</option>
                  <option>Normal wear</option>
                  <option>Needs review</option>
                  <option>Not applicable</option>
                </select>
              </Label>
              <Textarea
                aria-label={`${area} remarks`}
                placeholder="Describe observations and any differences…"
                maxLength={1000}
                value={remarks[area] || ""}
                onChange={(e) =>
                  setRemarks({ ...remarks, [area]: e.target.value })
                }
              />
            </div>
          ))}
          <Label className="block space-y-2">
            Draft review note
            <select
              className="block h-10 rounded-md border bg-background px-3 text-sm"
              value={agreement}
              onChange={(e) => setAgreement(e.target.value)}
            >
              <option value="not_reviewed">Not reviewed together</option>
              <option value="agreement_noted">
                Agreement noted — awaiting verified sign-off
              </option>
              <option value="disagreement_noted">
                Disagreement noted — discussion required
              </option>
            </select>
          </Label>
          <p className="text-xs text-muted-foreground">
            No AI comparison or automatic damage charges. A draft note is not an
            authenticated agreement.
          </p>
          <Button disabled={busy} onClick={exportSummary}>
            Download draft summary
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
