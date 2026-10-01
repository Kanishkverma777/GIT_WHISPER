import type { IndexStatus, Repository } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function indexStatusLabel(status: IndexStatus) {
  switch (status) {
    case "READY":
      return "READY";
    case "INDEXING":
      return "INDEXING";
    case "FAILED":
      return "FAILED";
    default:
      return "NOT INDEXED";
  }
}

export function IndexStatusBadge({
  status,
  className,
}: {
  status: IndexStatus;
  className?: string;
}) {
  const statusStyles = 
    status === "READY"
      ? "border-[#E61919] bg-[#E61919] text-white"
      : status === "FAILED"
        ? "border-[#E61919]/50 text-[#E61919] bg-transparent"
        : status === "INDEXING"
          ? "border-white text-white bg-transparent"
          : "border-[#333333] text-[#A0A0A0] bg-transparent";

  return (
    <span className={cn("inline-flex items-center rounded-none border px-2 py-1 text-[10px] font-mono uppercase tracking-widest", statusStyles, className)}>
      {status === "INDEXING" && (
        <span className="mr-1.5 size-1.5 rounded-none bg-current opacity-50" />
      )}
      {indexStatusLabel(status)}
    </span>
  );
}

export function languageColor(language: string | null) {
  const map: Record<string, string> = {
    TypeScript: "bg-sky-500",
    JavaScript: "bg-amber-400",
    Java: "bg-orange-500",
    Python: "bg-emerald-500",
    Go: "bg-cyan-500",
    Rust: "bg-orange-700",
    Kotlin: "bg-violet-500",
  };
  return map[language ?? ""] ?? "bg-muted-foreground";
}

export function RepoMeta({ repo }: { repo: Repository }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {repo.language && (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn("size-2 rounded-full", languageColor(repo.language))}
          />
          {repo.language}
        </span>
      )}
      <span>{repo.defaultBranch}</span>
      {repo.chunkCount > 0 && <span>{repo.chunkCount.toLocaleString()} chunks</span>}
    </div>
  );
}
