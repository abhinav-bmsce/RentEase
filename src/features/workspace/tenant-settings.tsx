import { PageHeader } from "@/components/shared/page-ui";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";
export function TenantSettings() {
  const { signOut } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your appearance, password, and session."
      />
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Choose light or dark mode.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex flex-wrap justify-between gap-4 items-center border-t pt-6">
            <div>
              <h2 className="font-semibold">Password</h2>
              <p className="text-sm text-muted-foreground">
                Keep your account secure.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/change-password">Change password</Link>
            </Button>
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
