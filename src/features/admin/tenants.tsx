import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { roomLabel } from "@/lib/rooms";
import type { RoomDoc, TenancyDoc, UserDoc } from "@/lib/types";
import { where } from "firebase/firestore";
import { ArrowRight, Home, Phone, Search, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function TenantManagement() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: tenants, loading } = useCollectionRealtime<UserDoc>("users", [
    where("role", "==", "tenant"),
  ]);

  const { data: rooms } = useCollectionRealtime<RoomDoc>("rooms");
  const { data: tenancies } = useCollectionRealtime<TenancyDoc>("tenancies");

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.username.toLowerCase().includes(search.toLowerCase()) ||
      tenant.phone.includes(search);

    if (filter === "active") return matchesSearch && tenant.active;
    if (filter === "inactive") return matchesSearch && !tenant.active;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tenants Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your tenants, lease agreements, and account access
          </p>
        </div>

        <Button asChild>
          <Link to="/a/tenants/new">
            <UserPlus className="w-4 h-4 mr-2" />
            Add New Tenant
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({tenants.length})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Active ({tenants.filter((t) => t.active).length})
          </Button>
          <Button
            variant={filter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("inactive")}
          >
            Inactive ({tenants.filter((t) => !t.active).length})
          </Button>
        </div>
      </div>

      {/* Tenants Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-36" />
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-base">No tenants found</p>
          <p className="text-xs mt-1">
            Get started by creating a new tenant profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map((tenant) => {
            const tenancy = tenancies.find((t) => t.id === tenant.tenancyId);
            const room = rooms.find((r) => r.id === tenancy?.roomId);

            return (
              <Card
                key={tenant.id}
                className="hover:border-primary/50 transition-all"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage
                            src={tenant.photoUrl}
                            alt={`${tenant.name} identification photo`}
                            className="object-cover"
                          />
                          <AvatarFallback>
                            {tenant.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-base">
                          {tenant.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        @{tenant.username}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        tenant.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {tenant.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium text-foreground">
                        {room ? roomLabel(room) : "No Room Assigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{tenant.phone || "No phone"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex flex-wrap gap-2 justify-end">
                    {tenant.active && tenancy?.active && (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to={`/a/messages?tenancy=${encodeURIComponent(tenancy.id)}`}
                        >
                          Message tenant
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/a/tenants/${tenant.id}`}>
                        View Details
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
