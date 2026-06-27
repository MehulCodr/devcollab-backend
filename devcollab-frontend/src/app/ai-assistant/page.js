"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/ui/Card";
import { Sparkles, FileText, ListTodo, Lightbulb, MessageSquare, Send, Loader2 } from "lucide-react";

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi there! I'm your DevCollaborator AI Assistant. I can help you analyze projects, generate documentation, break down complex tasks, and suggest next steps. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const actions = [
    { id: "summarize", icon: Sparkles, label: "Summarize Project", description: "Get a quick overview of a workspace" },
    { id: "readme", icon: FileText, label: "Generate README", description: "Draft documentation for your repo" },
    { id: "tasks", icon: ListTodo, label: "Task Breakdown", description: "Split a feature into subtasks" },
    { id: "next", icon: Lightbulb, label: "Suggest Next Steps", description: "What should you work on next?" }
  ];

  const handleSend = (text = input) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages([...newMessages, { 
        role: "assistant", 
        content: `I can certainly help with "${text}". This feature is currently running in simulation mode, but in the final version, I will connect to the DevCollaborator AI engine to process this request properly based on your organization's context.` 
      }]);
    }, 1500);
  };

  return (
    <AppShell
      title="AI Assistant"
      description="Your intelligent partner for project management and coding tasks."
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-220px)]">
        
        {/* Quick Actions Sidebar */}
        <div className="hidden lg:flex flex-col gap-4">
          <h3 className="font-semibold text-slate-300">Quick Actions</h3>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleSend(action.label)}
              className="flex flex-col items-start p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-blue-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-slate-200">{action.label}</span>
              </div>
              <span className="text-xs text-slate-500">{action.description}</span>
            </button>
          ))}
          
          <div className="mt-auto p-4 rounded-xl border border-slate-800 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-semibold text-sm">Pro Tip</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mention a specific project using @projectname to give the AI context for its answers.
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="lg:col-span-3 flex flex-col p-0 overflow-hidden bg-slate-950/80">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'
                }`}>
                  {msg.role === 'user' ? <UserIcon /> : <Sparkles className="w-4 h-4 text-blue-400" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-4 max-w-[80%]">
                <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm">Generating response...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-slate-800 bg-slate-950">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI assistant anything..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:hover:text-blue-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
