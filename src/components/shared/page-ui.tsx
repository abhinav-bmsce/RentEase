import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Search } from "lucide-react";
import type { ReactNode } from "react";
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <h1>{title}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-panel px-6 py-12 text-center space-y-3">
      <Inbox className="mx-auto text-muted-foreground" size={28} />
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {description}
      </p>
      {action}
    </div>
  );
}
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        size={16}
        className="absolute left-3 top-3 text-muted-foreground"
      />
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
export function SetupNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed"
    >
      <strong className="block mb-1">Setup required</strong>
      {children}
    </div>
  );
}
