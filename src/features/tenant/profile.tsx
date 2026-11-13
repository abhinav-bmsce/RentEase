import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentRealtime } from "@/hooks/use-firestore";
import { useTheme } from "@/hooks/use-theme";
import { formatDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { roomLabel } from "@/lib/rooms";
import type { PropertyDoc, RoomDoc, TenancyDoc } from "@/lib/types";
import {
  Calendar,
  Home,
  KeyRound,
  LogOut,
  Moon,
  Phone,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";

export function TenantProfile() {
  const { userDoc, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { data: tenancy } = useDocumentRealtime<TenancyDoc>(
    "tenancies",
    userDoc?.tenancyId,
  );
  const { data: room } = useDocumentRealtime<RoomDoc>("rooms", tenancy?.roomId);
  const { data: property } = useDocumentRealtime<PropertyDoc>(
    "properties",
    room?.propertyId,
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Profile Header */}
      <div className="flex items-center gap-4 pt-2">
        <Avatar className="w-16 h-16">
          <AvatarImage
            src={userDoc?.photoUrl}
            alt="Your identification photo"
            className="object-cover"
          />
          <AvatarFallback>
            {userDoc?.name?.charAt(0).toUpperCase() || "T"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{userDoc?.name || "Tenant"}</h1>
          <p className="text-xs text-muted-foreground">@{userDoc?.username}</p>
          <Badge
            variant="outline"
            className="mt-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Active Tenant
          </Badge>
        </div>
      </div>

      {/* Tenancy & Lease details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" />
            Lease & Room Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Property</span>
            <span className="font-medium text-right">
              {property?.name || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room</span>
            <span className="font-medium">{room ? roomLabel(room) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Rent</span>
            <span className="font-semibold">
              {room ? formatMoney(room.monthlyRent) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Electricity Rate</span>
            <span className="font-medium">
              {room ? `${formatMoney(room.electricityRate)} / unit` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rent Due Date</span>
            <span className="font-medium">
              {tenancy?.rentDueDay ? `${tenancy.rentDueDay}th of month` : "5th"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Lease Start Date
            </span>
            <span className="font-medium">
              {tenancy?.startDate
                ? formatDate(
                    tenancy.startDate.toDate
                      ? tenancy.startDate.toDate()
                      : new Date(tenancy.startDate as unknown as string),
                  )
                : "—"}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between items-center pt-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Security Deposit
            </span>
            <div className="text-right">
              <span className="font-semibold block">
                {tenancy ? formatMoney(tenancy.securityDeposit) : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                Status:{" "}
                {tenancy?.depositStatus
                  ? tenancy.depositStatus.replace("_", " ")
                  : "Held"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Phone Number
            </span>
            <span className="font-medium">{userDoc?.phone || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Username</span>
            <span className="font-mono text-xs">{userDoc?.username}</span>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings & Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Preferences & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm"
          >
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-primary" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>Theme Appearance</span>
            </div>
            <span className="text-xs text-muted-foreground capitalize">
              {theme} mode
            </span>
          </button>

          {/* Change Password */}
          <Link
            to="/change-password"
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-primary" />
              <span>Change Password</span>
            </div>
            <span className="text-xs text-muted-foreground">Update</span>
          </Link>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => signOut()}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
