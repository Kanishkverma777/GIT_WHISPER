"use client";

import { Bot, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { CitationChips } from "@/components/chat/citation-chips";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from "@/components/ui/message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage, Repository } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatMessages({
  repo,
  messages,
  streamText,
  isLoading,
}: {
  repo: Repository;
  messages: ChatMessage[];
  streamText?: string;
  isLoading?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-16 w-2/3 rounded-md" />
        <Skeleton className="ml-auto h-12 w-1/2 rounded-md" />
        <Skeleton className="h-24 w-3/4 rounded-md" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
        {messages.length === 0 && !streamText && (
          <div className="rounded-md border border-[#333333] bg-[#0A0A0A] px-6 py-10 text-center flex flex-col items-center">
            <p className="font-heading text-lg font-bold uppercase tracking-tight text-[#EAEAEA]">
              ASK ANYTHING ABOUT THIS CODEBASE
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] max-w-md">
              TRY &quot;WHERE IS AUTHENTICATION HANDLED?&quot; OR &quot;EXPLAIN THE REPOSITORY INDEXING FLOW.&quot;
            </p>
          </div>
        )}

        <MessageGroup>
          {messages.map((message) => {
            const isUser = message.role === "USER";
            return (
              <Message key={message.id} align={isUser ? "end" : "start"}>
                <MessageAvatar>
                  <Avatar className="size-8 rounded-md border border-[#333333]">
                    <AvatarFallback
                      className={cn(
                        "rounded-md font-mono text-[10px] uppercase tracking-widest text-white",
                        isUser
                          ? "bg-[#E61919]"
                          : "bg-[#111111]"
                      )}
                    >
                      {isUser ? (
                        "OP"
                      ) : (
                        "SYS"
                      )}
                    </AvatarFallback>
                  </Avatar>
                </MessageAvatar>
                <MessageContent>
                  <Bubble
                    variant={isUser ? "default" : "muted"}
                    align={isUser ? "end" : "start"}
                    className={cn(!isUser && "max-w-full")}
                  >
                    <BubbleContent className={cn(!isUser && "w-full max-w-full px-4 py-3")}>
                      {isUser ? (
                        <span className="whitespace-pre-wrap">
                          {message.content}
                        </span>
                      ) : (
                        <ChatMarkdown content={message.content} />
                      )}
                    </BubbleContent>
                  </Bubble>
                  {!isUser && message.citations?.length > 0 && (
                    <MessageFooter>
                      <CitationChips repo={repo} citations={message.citations} />
                    </MessageFooter>
                  )}
                </MessageContent>
              </Message>
            );
          })}

          {streamText && (
            <Message align="start">
              <MessageAvatar>
                <Avatar className="size-8 rounded-md border border-[#333333]">
                  <AvatarFallback className="rounded-md bg-[#111111] font-mono text-[10px] uppercase tracking-widest text-white">
                    SYS
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>
              <MessageContent>
                <Bubble variant="muted" align="start" className="max-w-full">
                  <BubbleContent className="w-full max-w-full px-4 py-3">
                    <ChatMarkdown content={streamText} isStreaming />
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground/50 align-middle" />
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          )}
        </MessageGroup>
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
