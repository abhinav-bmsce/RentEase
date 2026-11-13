import {
  EmptyState,
  PageHeader,
  SetupNotice,
} from "@/components/shared/page-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, UploadCloud } from "lucide-react";
import { useState } from "react";
export function DocumentWorkspace() {
  const { userDoc, isAdmin } = useAuth();
  const [type, setType] = useState("masked_aadhaar");
  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Tenant document records" : "My documents"}
        description="Private identity records with controlled submission and review."
      />
      <SetupNotice>
        Secure document storage and the owner review API are not configured.
        Uploading and viewing identity files are disabled until tenant-specific
        access controls, retention rules, and private storage are deployed.
      </SetupNotice>
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              <h2 className="font-semibold">Identity submission</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Label className="space-y-2">
                Tenant name
                <Input
                  value={
                    isAdmin
                      ? "Select an authorized tenant after setup"
                      : userDoc?.name || ""
                  }
                  readOnly
                />
              </Label>
              <Label className="space-y-2">
                Contact number
                <Input
                  value={
                    isAdmin
                      ? "Available after secure setup"
                      : userDoc?.phone || ""
                  }
                  readOnly
                />
              </Label>
            </div>
            <Label className="block space-y-2">
              Document type
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-full h-10 rounded-md border bg-background px-3"
              >
                <option value="masked_aadhaar">Masked Aadhaar</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving licence</option>
                <option value="other">Other accepted identification</option>
              </select>
            </Label>
            <div className="rounded-xl border-2 border-dashed p-8 text-center space-y-3">
              <UploadCloud className="mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Private upload area</p>
              <p className="text-xs text-muted-foreground">
                Uploads become available after secure storage setup.
              </p>
              <Button disabled>Select document</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No full Aadhaar number is requested. For Aadhaar, upload only a
              masked copy with the first eight digits hidden.
            </p>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold">How review will work</h2>
              <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-3">
                <li>
                  Each occupant signs in through their own authorized account.
                </li>
                <li>
                  Documents are visible only to that occupant and the property
                  owner.
                </li>
                <li>
                  The owner reviews the submission and records approval or a
                  correction request.
                </li>
              </ol>
            </CardContent>
          </Card>
          <EmptyState
            title="Document review unavailable"
            description="Submission dates and review statuses will appear once secure document services are connected."
          />
        </div>
      </div>
    </div>
  );
}
