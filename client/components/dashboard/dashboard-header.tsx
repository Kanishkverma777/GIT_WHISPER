"use client";

import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { IndexStatus } from "@/lib/api";

type FilterStatus = "ALL" | IndexStatus;

type DashboardHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  visibility: "all" | "public" | "private";
  onVisibilityChange: (value: "all" | "public" | "private") => void;
  status: FilterStatus;
  onStatusChange: (value: FilterStatus) => void;
  totalCount?: number;
  readyCount?: number;
  onSync: () => void;
  isSyncing?: boolean;
};

const visibilityFilters = [
  { value: "all" as const, label: "All" },
  { value: "public" as const, label: "Public" },
  { value: "private" as const, label: "Private" },
];

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "READY", label: "Ready" },
  { value: "INDEXING", label: "Indexing" },
  { value: "PENDING", label: "New" },
  { value: "FAILED", label: "Failed" },
];

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-none border px-3 py-1 text-[10px] font-mono uppercase tracking-widest transition-colors",
        active
          ? "border-[#E61919] bg-[#E61919] text-white"
          : "border-[#333333] bg-transparent text-[#A0A0A0] hover:border-white hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

export function DashboardHeader({
  search,
  onSearchChange,
  visibility,
  onVisibilityChange,
  status,
  onStatusChange,
  totalCount,
  readyCount,
  onSync,
  isSyncing,
}: DashboardHeaderProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-[#333333] bg-[#0A0A0A]">
      <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <SidebarTrigger className="-ml-1 mt-0.5" />
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-[#EAEAEA]">
                REPOSITORIES
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] mt-1">
                {totalCount != null
                  ? `${totalCount} CONNECTED // ${readyCount ?? 0} READY`
                  : "SYNC AND INDEX A REPO TO START CHATTING"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-[220px] flex-1 sm:min-w-[280px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="SEARCH REPOSITORIES..."
                className="rounded-none border-[#333333] bg-transparent pl-9 text-xs font-mono uppercase tracking-widest focus-visible:ring-[#E61919]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-none border-[#333333] bg-transparent font-mono text-[10px] uppercase tracking-widest hover:bg-white hover:text-black"
                onClick={onSync}
                disabled={isSyncing}
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={cn("size-3", isSyncing ? "animate-spin" : undefined)}
                />
                SYNC
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-[#333333]" />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-mono uppercase tracking-widest text-[#555555]">
              VISIBILITY //
            </span>
            {visibilityFilters.map((filter) => (
              <FilterPill
                key={filter.value}
                active={visibility === filter.value}
                onClick={() => onVisibilityChange(filter.value)}
              >
                {filter.label}
              </FilterPill>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-mono uppercase tracking-widest text-[#555555]">
              STATUS //
            </span>
            {statusFilters.map((filter) => (
              <FilterPill
                key={filter.value}
                active={status === filter.value}
                onClick={() => onStatusChange(filter.value)}
              >
                {filter.label}
              </FilterPill>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
