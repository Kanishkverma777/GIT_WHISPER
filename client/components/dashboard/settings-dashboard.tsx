"use client";

import { LogOut, UserRound } from "lucide-react";
import { GitHubIcon } from "@/components/icons/github-icon";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";

export function SettingsDashboard() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-6">
      <Card className="rounded-md border border-[#333333] bg-[#0A0A0A] shadow-none">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="font-heading text-lg font-black uppercase tracking-tight text-[#EAEAEA]">PROFILE</CardTitle>
          <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
            YOUR GITHUB ACCOUNT CONNECTED TO SYSTEM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 rounded-none border border-[#333333]">
              <AvatarImage
                src={user?.avatarUrl ?? undefined}
                alt={user?.displayName}
                className="rounded-none"
              />
              <AvatarFallback className="rounded-none bg-[#E61919] text-white font-mono text-sm">
                {(user?.displayName ?? "OP").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-heading font-black text-lg uppercase tracking-tight text-[#EAEAEA]">{user?.displayName}</p>
              <p className="truncate font-mono text-xs uppercase tracking-widest text-[#A0A0A0]">
                @{user?.githubUsername}
              </p>
            </div>
          </div>

          <Separator className="bg-[#333333]" />

          <div className="grid gap-4 font-mono text-[10px] uppercase tracking-widest">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#555555]">DISPLAY_NAME //</span>
              <span className="font-bold text-[#EAEAEA]">{user?.displayName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#555555]">GITHUB_HANDLE //</span>
              <span className="font-bold text-[#EAEAEA]">@{user?.githubUsername ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#555555]">AUTH_PROVIDER //</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#E61919]">
                <GitHubIcon className="size-3" />
                GITHUB OAUTH
              </span>
            </div>
          </div>
        </CardContent>
      </Card>



      <Card className="rounded-md border border-[#333333] bg-[#0A0A0A] shadow-none">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="font-heading text-lg font-black uppercase tracking-tight text-[#EAEAEA]">ACCOUNT ACTIONS</CardTitle>
          <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
            MANAGE YOUR SESSION AND CONNECTED WORKSPACE.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row pt-4">
          <Button variant="outline" className="justify-start rounded-none border-[#333333] bg-transparent hover:bg-white hover:text-black font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] transition-colors" disabled>
            <UserRound data-icon="inline-start" className="size-3" />
            MANAGE ON GITHUB
          </Button>
          <Button
            variant="destructive"
            className="justify-start rounded-none border border-[#E61919] bg-[#E61919]/10 text-[#E61919] hover:bg-[#E61919] hover:text-white font-mono text-[10px] uppercase tracking-widest transition-colors"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut data-icon="inline-start" className="size-3" />
            END_SESSION
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
