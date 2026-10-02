import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Bot,
  User,
  ChevronDown,
  Calendar,
  BookOpen,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  modelUsed?: string;
}

const STARTER_PROMPTS = [
  { label: "📅 Friday Schedule", query: "What lectures or labs are scheduled on Friday for SE-ECCE?" },
  { label: "👨‍🏫 Faculty Workload", query: "Which subjects and classes does Prof. M. A. Mulay teach?" },
  { label: "🏫 Labs & Rooms", query: "Where are the specialized computer and electronics labs located?" },
  { label: "💡 How to Export", query: "How do I export the timetable to multi-sheet Excel or PDF?" },
];

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hello! I am **ACADSYNC AI**, powered by **Gemini 3.6 Flash**.\n\nI can answer questions about your **live timetable data** (classes, lectures, practical labs, teachers, rooms) and guide you on how to use every feature in RP-ACADSYNC.\n\n*Click a suggested prompt below or ask any question!*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      // Build history payload for context
      const formattedHistory = newHistory.slice(-8).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: formattedHistory,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            modelUsed: data.modelUsed,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: `⚠️ **Assistant Error**: ${data.error || "Unable to get answer from Gemini."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `⚠️ **Network Error**: ${err.message || "Failed to communicate with local chatbot server."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: "bot",
        text: "Conversation cleared. How else can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const renderFormattedText = (content: string) => {
    // Simple markdown-style renderer for bold, lists, and line breaks
    const lines = content.split("\n");
    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Headers
          if (line.startsWith("### ")) {
            return (
              <h4 key={idx} className="font-semibold text-primary pt-1 text-sm border-b pb-0.5 mb-1">
                {line.replace("### ", "")}
              </h4>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h3 key={idx} className="font-bold text-foreground pt-1.5 text-base">
                {line.replace("## ", "")}
              </h3>
            );
          }

          // Bullet points
          if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
            const clean = line.trim().replace(/^[\*\-]\s+/, "");
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                <span className="text-primary mt-1 text-xs">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
              </div>
            );
          }

          // Regular lines
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInline = (text: string) => {
    return text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-muted text-foreground rounded text-xs font-mono">$1</code>')
      // Italics
      .replace(/\*(.*?)\*/g, '<em class="italic text-muted-foreground">$1</em>');
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="h-14 px-4 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-primary hover:from-blue-700 hover:to-primary text-white flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
          >
            <div className="relative">
              <Bot className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-medium leading-none text-blue-100">Ask AI</div>
              <div className="text-sm font-bold leading-tight">ACADSYNC Assistant</div>
            </div>
          </Button>
        )}
      </div>

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/15 via-blue-600/10 to-transparent border-b flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm leading-none">ACADSYNC AI</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Gemini 3.6 Flash
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Live Timetable & Platform Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleReset}
                title="Clear conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-muted/70 text-foreground border border-border/60 rounded-tl-xs"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    renderFormattedText(msg.text)
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}
                  <div
                    className={`text-[10px] mt-1.5 flex items-center justify-between gap-2 ${
                      msg.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground/70"
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.modelUsed && <span>⚡ {msg.modelUsed}</span>}
                  </div>
                </div>

                {msg.sender === "user" && (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted/70 border border-border/60 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"></div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Consulting Gemini 3.6 Flash...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter Chips */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 border-t bg-muted/20">
              <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Suggested queries:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt.query)}
                    className="text-xs px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors text-left"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 border-t bg-background/80 flex flex-col gap-1.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about lectures, teachers, rooms, or navigation..."
                className="h-10 text-sm focus-visible:ring-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>Grounds responses in active timetable SQLite DB</span>
              <span>Gemini 3.6 Flash</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
