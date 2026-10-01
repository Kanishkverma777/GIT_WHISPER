"use client";

import { useState } from "react";
import { SendHorizontal, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";

export function ChatComposer({
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  disabled?: boolean;
  streaming?: boolean;
  onSend: (content: string) => void | Promise<void>;
  onStop?: () => void;
}) {
  const [value, setValue] = useState("");

  async function submit() {
    const content = value.trim();
    if (!content || disabled || streaming) return;
    setValue("");
    await onSend(content);
  }

  return (
    <div className="border-t border-[#333333] bg-[#0A0A0A] p-4">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="flex items-end gap-2 rounded-md border border-[#333333] bg-[#111111] p-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ASK ABOUT ARCHITECTURE, FILES, FLOWS..."
            disabled={disabled}
            className="min-h-12 flex-1 border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0 font-mono text-xs uppercase tracking-widest text-[#EAEAEA] placeholder:text-[#555555]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {streaming ? (
            <Button
              size="icon-lg"
              variant="secondary"
              onClick={onStop}
              aria-label="Stop generating"
              className="rounded-md border border-[#333333] bg-transparent hover:bg-white hover:text-black transition-colors"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon-lg"
              disabled={disabled || !value.trim()}
              onClick={() => void submit()}
              aria-label="Send message"
              className="rounded-md bg-[#E61919] text-white hover:bg-[#E61919]/80 transition-colors"
            >
              {disabled ? <Spinner /> : <SendHorizontal />}
            </Button>
          )}
        </div>
        <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-[#555555]">
          PRESS <Kbd className="rounded-md border-[#333333] bg-[#111111]">ENTER</Kbd> TO SEND // <Kbd className="rounded-md border-[#333333] bg-[#111111]">SHIFT</Kbd> + <Kbd className="rounded-md border-[#333333] bg-[#111111]">ENTER</Kbd>{" "}
          FOR A NEW LINE
        </p>
      </div>
    </div>
  );
}
