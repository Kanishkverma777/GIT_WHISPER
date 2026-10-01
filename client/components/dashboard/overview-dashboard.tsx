"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  LoaderCircle,
  MessageSquareCode,
} from "lucide-react";

import { RepoCard } from "@/components/dashboard/repo-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRepos } from "@/hooks/use-repos";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof FolderGit2;
}) {
  return (
    <Card className="rounded-md border border-[#333333] bg-[#0A0A0A] shadow-none">
      <CardHeader className="pb-0 border-b border-[#333333] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">{label}</CardDescription>
            <CardTitle className="mt-2 font-heading text-2xl font-black uppercase tracking-tight text-[#EAEAEA]">{value}</CardTitle>
          </div>
          <div className="rounded-md bg-[#111111] border border-[#333333] p-2 text-[#EAEAEA]">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-4 font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
          {hint}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function OverviewDashboard() {
  const reposQuery = useRepos();
  const repos = reposQuery.data ?? [];

  const readyCount = repos.filter((repo) => repo.indexStatus === "READY").length;
  const indexingCount = repos.filter(
    (repo) => repo.indexStatus === "INDEXING"
  ).length;
  const failedCount = repos.filter((repo) => repo.indexStatus === "FAILED").length;
  const totalChunks = repos.reduce((sum, repo) => sum + repo.chunkCount, 0);
  const recentRepos = [...repos]
    .sort((a, b) => {
      const aTime = a.indexedAt ? new Date(a.indexedAt).getTime() : 0;
      const bTime = b.indexedAt ? new Date(b.indexedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reposQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Repositories"
              value={repos.length}
              hint="Connected from GitHub"
              icon={FolderGit2}
            />
            <StatCard
              label="Ready to chat"
              value={readyCount}
              hint={`${indexingCount} currently indexing`}
              icon={CheckCircle2}
            />
            <StatCard
              label="Indexed chunks"
              value={totalChunks.toLocaleString()}
              hint="Searchable code segments"
              icon={MessageSquareCode}
            />
            <StatCard
              label="Needs attention"
              value={failedCount}
              hint={failedCount > 0 ? "Review failed indexing jobs" : "All repos healthy"}
              icon={failedCount > 0 ? AlertCircle : LoaderCircle}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-black uppercase tracking-tight text-[#EAEAEA]">RECENT REPOSITORIES //</h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] mt-1">
                JUMP BACK INTO A REPO YOU HAVE INDEXED RECENTLY.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {reposQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : recentRepos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {recentRepos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          ) : (
            <Card className="rounded-md border border-[#333333] bg-[#0A0A0A] shadow-none">
              <CardHeader className="border-b border-[#333333] pb-4">
                <CardTitle className="font-heading text-lg font-black uppercase tracking-tight text-[#EAEAEA]">NO REPOSITORIES YET</CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-[#555555] mt-1">
                  SYNC YOUR GITHUB REPOSITORIES TO START INDEXING AND CHATTING
                  WITH YOUR CODE.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard"
                  className="font-mono text-[10px] uppercase tracking-widest text-[#E61919] hover:underline"
                >
                  GO TO REPOSITORIES //
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-[#EAEAEA]">WORKSPACE STATUS //</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] mt-1">
              A QUICK SNAPSHOT OF INDEXING ACROSS YOUR CONNECTED REPOS.
            </p>
          </div>

          <Card className="rounded-md border border-[#333333] bg-[#0A0A0A] shadow-none">
            <CardContent className="space-y-4 pt-6 font-mono text-xs uppercase tracking-widest">
              {reposQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 rounded-lg" />
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A0A0A0]">READY //</span>
                    <Badge className="rounded-sm bg-[#111111] text-[#EAEAEA] border border-[#333333] hover:bg-[#111111] px-1.5 py-0">{readyCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A0A0A0]">INDEXING //</span>
                    <Badge className="rounded-sm bg-[#111111] text-[#EAEAEA] border border-[#333333] hover:bg-[#111111] px-1.5 py-0">{indexingCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A0A0A0]">PENDING //</span>
                    <Badge className="rounded-sm bg-[#111111] text-[#EAEAEA] border border-[#333333] hover:bg-[#111111] px-1.5 py-0">
                      {repos.filter((repo) => repo.indexStatus === "PENDING").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A0A0A0]">FAILED //</span>
                    <Badge className={cn(
                      "rounded-sm border px-1.5 py-0 hover:bg-transparent",
                      failedCount > 0 ? "border-[#E61919] bg-[#E61919]/10 text-[#E61919]" : "bg-[#111111] text-[#EAEAEA] border-[#333333]"
                    )}>
                      {failedCount}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
