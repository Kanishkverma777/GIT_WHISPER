"use client";

import { Plus, RotateCcw } from "lucide-react";

import { IndexStatusBadge } from "@/components/dashboard/repo-status";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChatSessions,
  useCreateChatSession,
} from "@/hooks/use-chat";
import { useStartIndexing } from "@/hooks/use-repos";
import type { Repository } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatSidebar({
  repo,
  sessionId,
  onSelectSession,
}: {
  repo: Repository;
  sessionId: string | null;
  onSelectSession: (id: string) => void;
}) {
  const ready = repo.indexStatus === "READY";
  const sessionsQuery = useChatSessions(repo.id, ready);
  const createSession = useCreateChatSession(repo.id);
  const reindex = useStartIndexing();

  return (
    <aside className="flex w-full flex-col border-b border-[#333333] md:w-72 md:border-r md:border-b-0 bg-[#0A0A0A]">
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <p className="truncate font-heading text-lg font-bold uppercase tracking-tight text-[#EAEAEA]">{repo.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <IndexStatusBadge status={repo.indexStatus} />
            {repo.isPrivate && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">PRI</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1 rounded-md font-mono text-[10px] uppercase tracking-widest border border-[#E61919] bg-[#E61919]/10 text-[#E61919] hover:bg-[#E61919] hover:text-white transition-colors"
            disabled={!ready || createSession.isPending}
            onClick={() =>
              createSession.mutate("New chat", {
                onSuccess: (session) => onSelectSession(session.id),
              })
            }
          >
            <Plus data-icon="inline-start" className="size-3" />
            NEW_CHAT
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-md border-[#333333] bg-transparent hover:bg-white hover:text-black text-[#A0A0A0]"
            disabled={reindex.isPending || repo.indexStatus === "INDEXING"}
            onClick={() => reindex.mutate(repo.id)}
            aria-label="Re-index repository"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>
      </div>

      <Separator className="bg-[#333333]" />

      <div className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[#555555]">
        SESSIONS //
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 px-2 pb-4">
          {!ready && (
            <p className="px-2 font-mono text-[10px] uppercase tracking-widest text-[#555555]">
              LOCKED UNTIL INDEXING COMPLETES.
            </p>
          )}

          {sessionsQuery.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md bg-[#111]" />
            ))}

          {sessionsQuery.data?.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "w-full rounded-md px-3 py-2.5 text-left transition-all border-l-2 font-mono uppercase tracking-widest",
                sessionId === session.id
                  ? "border-l-[#E61919] bg-[#E61919]/10 text-[#EAEAEA]"
                  : "border-l-transparent text-[#A0A0A0] hover:border-l-[#333333] hover:bg-[#333333]/30 hover:text-[#EAEAEA]"
              )}
            >
              <p className="truncate text-xs font-bold">{session.title}</p>
            </button>
          ))}

          {ready && sessionsQuery.isSuccess && sessionsQuery.data.length === 0 && (
            <p className="px-2 font-mono text-[10px] uppercase tracking-widest text-[#555555]">
              NO CHATS RECORDED.
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
