"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  GitBranch,
  Lock,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { IndexErrorAlert } from "@/components/dashboard/index-error-alert";
import { LanguageBadge } from "@/components/dashboard/language-badge";
import { IndexStatusBadge } from "@/components/dashboard/repo-status";
import { LanguageIcon } from "@/components/icons/language-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { getRepoProgress, useStartIndexing } from "@/hooks/use-repos";
import type { Repository } from "@/lib/api";
import { cn } from "@/lib/utils";

export function RepoCard({ repo }: { repo: Repository }) {
  const router = useRouter();
  const indexMutation = useStartIndexing();
  const isIndexing = repo.indexStatus === "INDEXING" || indexMutation.isPending;
  const isFailed = repo.indexStatus === "FAILED";
  const progress = getRepoProgress(repo);

  function openChat() {
    router.push(`/chat/${repo.id}`);
  }

  function handlePrimary() {
    if (repo.indexStatus === "READY") {
      openChat();
      return;
    }
    indexMutation.mutate(repo.id, {
      onSuccess: () => router.push(`/chat/${repo.id}`),
    });
  }

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden border bg-[#0A0A0A] transition-all rounded-md",
        isFailed
          ? "border-[#E61919]/50 hover:border-[#E61919]"
          : "border-[#333333] hover:border-white hover:-translate-y-1"
      )}
    >
      <div className="border-b border-[#333333] p-4 bg-[#0A0A0A]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <LanguageBadge language={repo.language} showLabel={false} />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-mono text-[#A0A0A0] uppercase tracking-widest">{repo.owner}</p>
              <h3 className="truncate font-heading text-lg font-bold uppercase tracking-tight text-[#EAEAEA] mt-1">{repo.name}</h3>
            </div>
          </div>
          <IndexStatusBadge status={repo.indexStatus} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 bg-[#0A0A0A]">
        {!isFailed && (
          <p className="line-clamp-2 min-h-10 text-sm font-mono text-[#A0A0A0]">
            {repo.description || "NO DESCRIPTION."}
          </p>
        )}

        {isFailed && repo.description && (
          <p className="line-clamp-1 text-sm font-mono text-[#A0A0A0]">
            {repo.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {repo.isPrivate && (
            <span className="inline-flex items-center gap-1 border border-[#333333] px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-[#A0A0A0]">
              <Lock className="size-3" />
              PRI
            </span>
          )}
          <span className="inline-flex items-center gap-1 border border-[#333333] px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-[#A0A0A0]">
            <GitBranch className="size-3" />
            {repo.defaultBranch}
          </span>
          {repo.language && (
            <span className="inline-flex items-center gap-1.5 border border-[#333333] px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-[#EAEAEA]">
              <LanguageIcon language={repo.language} size="sm" />
              {repo.language}
            </span>
          )}
          {repo.chunkCount > 0 && (
            <span
              className={cn(
                "border border-[#333333] px-2 py-1 text-[10px] font-mono uppercase tracking-widest",
                isFailed
                  ? "border-[#E61919]/50 text-[#E61919]"
                  : "text-[#A0A0A0]"
              )}
            >
              {repo.chunkCount.toLocaleString()} CHUNKS
              {isFailed ? " INDEXED" : ""}
            </span>
          )}
        </div>

        {isIndexing && (
          <div className="space-y-2 border border-[#333333] bg-[#0A0A0A]/50 p-3">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#E61919]">
              <span>INDEXING…</span>
              <span>
                {repo.filesProcessed}/{repo.filesTotal || "?"}
              </span>
            </div>
            <Progress value={progress || 8} className="rounded-none h-1 bg-[#333333]" />
          </div>
        )}

        {isFailed && repo.errorMessage && (
          <IndexErrorAlert message={repo.errorMessage} />
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#333333] p-4 bg-[#0A0A0A]">
        {repo.htmlUrl ? (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none font-mono text-[10px] uppercase tracking-widest hover:bg-[#333333]/50 text-[#A0A0A0] hover:text-[#EAEAEA]"
            render={<a href={repo.htmlUrl} target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            <ExternalLink data-icon="inline-start" className="size-3" />
            GITHUB
          </Button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          {repo.indexStatus === "READY" && (
            <Button variant="secondary" size="sm" onClick={openChat} className="rounded-none border border-[#333333] bg-transparent text-[#A0A0A0] font-mono text-[10px] uppercase tracking-widest hover:bg-white hover:text-black">
              <MessageSquare data-icon="inline-start" className="size-3" />
              CHAT
            </Button>
          )}
          <Button
            size="sm"
            variant="default"
            className={cn(
              "rounded-none font-mono text-[10px] uppercase tracking-widest",
              isFailed 
                ? "border border-[#E61919] bg-transparent text-[#E61919] hover:bg-[#E61919] hover:text-white" 
                : "bg-[#E61919] text-white hover:bg-white hover:text-[#E61919] border border-[#E61919]"
            )}
            disabled={isIndexing}
            onClick={handlePrimary}
          >
            {isIndexing ? (
              <>
                <Spinner data-icon="inline-start" className="size-3" />
                INDEXING
              </>
            ) : repo.indexStatus === "READY" ? (
              <>
                OPEN
                <ArrowRight data-icon="inline-end" className="size-3" />
              </>
            ) : isFailed ? (
              <>
                <RotateCcw data-icon="inline-start" className="size-3" />
                RETRY
              </>
            ) : (
              <>
                <Sparkles data-icon="inline-start" className="size-3" />
                INDEX
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
