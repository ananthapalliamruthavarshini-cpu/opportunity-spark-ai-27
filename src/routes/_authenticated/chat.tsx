import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Mentor · OpportunityHub AI" }] }),
  component: Chat,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What career suits me?",
  "Which internships should I apply for?",
  "How can I become an AI Engineer?",
  "Give me resume tips.",
];

function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatFn = useServerFn(aiChat);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("chat_history")
        .select("role,content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data as Msg[]);
    })();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [loading]);

  async function send(msg?: string) {
    const text = (msg ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await chatFn({ data: { message: text } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-hero)] flex items-center justify-center"><Sparkles className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="font-bold">AI Career Mentor</h1>
            <p className="text-xs text-muted-foreground">Personalized using your profile</p>
          </div>
        </div>

        <Card className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center text-sm text-muted-foreground py-8 space-y-4">
              <p>Ask anything about your career, scholarships, certifications, or applications.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => send(s)}>{s}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && <div className="h-8 w-8 shrink-0 rounded-full bg-[image:var(--gradient-hero)] flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>}
              <div className={cn(
                "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap max-w-[80%]",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
              )}>{m.content}</div>
              {m.role === "user" && <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center"><User className="h-4 w-4" /></div>}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-[image:var(--gradient-hero)] flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
              <div className="rounded-2xl bg-secondary px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div>
            </div>
          )}
          <div ref={endRef} />
        </Card>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask your AI mentor..."
            rows={1}
            className="resize-none"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}