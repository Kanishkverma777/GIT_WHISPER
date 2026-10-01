"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";

import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  dashboardNavGroups,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  title,
  description,
  actions,
  hideHeader = false,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  hideHeader?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/dashboard" />}
                tooltip="GitWhisper"
                className="rounded-md border border-[#333333] bg-[#0A0A0A] hover:bg-[#333333]/50 hover:border-white transition-all flex items-center justify-center gap-3 px-3 py-3"
              >
                <svg viewBox="0 0 24 24" className="size-6 text-[#E61919] fill-current shrink-0" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span className="group-data-[collapsible=icon]:hidden truncate font-heading text-xl font-black uppercase tracking-tight text-[#EAEAEA] leading-none pt-0.5">GIT_WHISPER</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {dashboardNavGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                {group.label} //
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active = isDashboardNavActive(pathname, item.href, item.exact);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={item.title}
                          render={<Link href={item.href} />}
                          className={cn(
                            "rounded-none font-mono text-xs uppercase tracking-widest transition-all",
                            active 
                              ? "border-l-2 border-l-[#E61919] bg-[#E61919]/10 text-[#E61919] hover:bg-[#E61919]/20" 
                              : "border-l-2 border-l-transparent text-[#A0A0A0] hover:border-l-[#333333] hover:text-[#EAEAEA] hover:bg-[#333333]/30"
                          )}
                        >
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[popup-open]:bg-sidebar-accent"
                    />
                  }
                >
                  <Avatar className="size-8 rounded-none border border-[#333333]">
                    <AvatarImage
                      src={user?.avatarUrl ?? undefined}
                      alt={user?.displayName}
                      className="rounded-none"
                    />
                    <AvatarFallback className="rounded-none bg-[#E61919] text-white font-mono text-[10px]">
                      {(user?.displayName ?? "OP").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-heading font-black text-sm uppercase tracking-tight text-[#EAEAEA]">
                      {user?.displayName || "ANONYMOUS_OP"}
                    </span>
                    <span className="truncate font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">
                      @{user?.githubUsername || "ID_UNKNOWN"}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="min-w-56 rounded-none border border-[#333333] bg-[#0A0A0A] text-[#EAEAEA]"
                  side="top"
                  align="start"
                  sideOffset={8}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal border-b border-[#333333] pb-2 mb-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-heading font-bold text-sm uppercase tracking-tight">
                          {user?.displayName}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#E61919]">
                          AUTH // GITHUB
                        </span>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/settings")}
                    className="rounded-none font-mono text-xs uppercase tracking-widest hover:bg-[#333333]/50 focus:bg-[#333333]/50 focus:text-white"
                  >
                    <Settings className="size-4" />
                    SYSTEM.SETTINGS
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#333333]" />
                  <DropdownMenuItem
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                    className="rounded-none font-mono text-xs uppercase tracking-widest text-[#E61919] hover:bg-[#E61919]/10 focus:bg-[#E61919]/10 focus:text-[#E61919]"
                  >
                    <LogOut className="size-4" />
                    END_SESSION
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {!hideHeader && (
          <header className="sticky top-0 z-20 border-b border-[#333333] bg-[#0A0A0A]">
            <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <SidebarTrigger className="-ml-1 mt-0.5" />
                  <div className="min-w-0">
                    {title && (
                      <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-[#EAEAEA]">
                        {title}
                      </h1>
                    )}
                    {description && (
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
                {actions && (
                  <div className="flex items-center gap-2">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 font-semibold tracking-tight",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-8 text-[#E61919] fill-current shrink-0" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
      <span className="font-heading text-xl font-black uppercase tracking-tight text-[#EAEAEA] leading-none pt-0.5">GIT_WHISPER</span>
    </div>
  );
}

export function GhostButtonLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button variant="ghost" size="sm" className={className} render={<Link href={href} />} nativeButton={false}>
      {children}
    </Button>
  );
}
