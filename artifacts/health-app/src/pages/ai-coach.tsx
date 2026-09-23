import { useState, useEffect, useRef } from "react";
import { useGetAiMessages, useSendAiMessage, getGetAiMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "How's my nutrition?",
  "Best workout today?",
  "Improve my sleep",
  "Meal suggestions",
  "Life balance tips"
];

export default function AiCoach() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages, isLoading } = useGetAiMessages();
  const qc = useQueryClient();
  
  const sendMessage = useSendAiMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessage.isPending]);

  const handleSubmit = (e: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const content = textOverride || input;
    if (!content.trim()) return;
    
    sendMessage.mutate({ data: { content } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetAiMessagesQueryKey() });
        setInput("");
      }
    });
  };

  if (isLoading) return <AiCoachSkeleton />;

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] bg-background overflow-hidden relative">
      <header className="px-5 py-3 border-b border-border/50 glass flex items-center gap-3 shrink-0 z-10 sticky top-0">
        <div className="relative">
          <img src="/bodylogic-logo.png" alt="AI" className="w-10 h-10 rounded-xl" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-sm">BodyLogic AI</h1>
          <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Powered by AI</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-2 shadow-lg glow-primary">
              <Sparkles className="w-8 h-8 text-background" />
            </div>
            <div>
              <p className="font-black text-xl mb-1">Your Personal Coach</p>
              <p className="text-sm text-muted-foreground">Ask me about your nutrition, workout routines, sleep habits, or wellness advice.</p>
            </div>
          </div>
        )}

        {messages?.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
              {!isUser && (
                <div className="w-8 h-8 rounded-lg shrink-0 mt-auto overflow-hidden bg-muted">
                  <img src="/bodylogic-logo.png" alt="AI" className="w-full h-full object-cover" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] px-4 py-3 text-sm leading-relaxed",
                isUser 
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm" 
                  : "bg-card border border-border/50 text-foreground rounded-2xl rounded-bl-sm shadow-sm"
              )}>
                {msg.content}
              </div>
            </div>
          );
        })}
        
        {sendMessage.isPending && (
          <div className="flex gap-3 flex-row-reverse">
             <div className={cn("max-w-[80%] px-4 py-3 text-sm leading-relaxed bg-primary/70 text-primary-foreground rounded-2xl rounded-br-sm")}>
               <div className="flex gap-1 items-center h-5">
                 <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                 <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-background border-t border-border/50 shrink-0 space-y-3 pb-8">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={(e) => handleSubmit(e, s)} className="px-3 py-1.5 rounded-full bg-muted border border-border/50 text-xs font-medium whitespace-nowrap hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors press-scale">
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Message your coach..." 
            className="rounded-full bg-card border border-border/50 focus-visible:ring-primary h-12 px-5 text-sm"
            disabled={sendMessage.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full h-12 w-12 shrink-0 bg-primary text-background hover:bg-primary/90 transition-transform active:scale-95 shadow-md glow-primary"
            disabled={sendMessage.isPending || !input.trim()}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function AiCoachSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] bg-background">
      <header className="px-5 py-3 border-b flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </header>
      <div className="flex-1 p-5 space-y-6">
        <div className="flex gap-3 flex-row-reverse">
          <Skeleton className="h-12 w-[60%] rounded-2xl rounded-br-sm" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-lg shrink-0 mt-auto" />
          <Skeleton className="h-24 w-[75%] rounded-2xl rounded-bl-sm" />
        </div>
      </div>
      <div className="p-4 border-t flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}