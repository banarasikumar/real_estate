"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@repo/api";

interface MessageItem {
  id: string;
  sender: "agent" | "user";
  text: string;
  time: string;
}

interface Conversation {
  id: string;
  name: string;
  role: string;
  avatar: string;
  propertyTitle: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  messages: MessageItem[];
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    name: "Rajesh Sharma",
    role: "Verified Agent",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80",
    propertyTitle: "Modern Apartment in Downtown",
    lastMessage: "Hello! The owner is available for a physical walkthrough this Saturday at 11 AM.",
    time: "10:24 AM",
    unread: 2,
    online: true,
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "Hi Rajesh, I submitted an enquiry for the 3BHK Modern Apartment in Downtown. Is it available for viewing?",
        time: "10:15 AM",
      },
      {
        id: "m2",
        sender: "agent",
        text: "Hi there! Yes, the apartment is currently available and ready for immediate possession.",
        time: "10:20 AM",
      },
      {
        id: "m3",
        sender: "agent",
        text: "Hello! The owner is available for a physical walkthrough this Saturday at 11 AM.",
        time: "10:24 AM",
      },
    ],
  },
  {
    id: "conv-2",
    name: "Priya Patel",
    role: "Property Owner",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=80",
    propertyTitle: "Luxury Villa with Pool",
    lastMessage: "I have shared the floor layout and maintenance breakdown PDF.",
    time: "Yesterday",
    unread: 0,
    online: false,
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "Hello Priya, could you share details on maintenance fees and society amenities for the Villa in Bangalore?",
        time: "Yesterday 4:10 PM",
      },
      {
        id: "m2",
        sender: "agent",
        text: "I have shared the floor layout and maintenance breakdown PDF.",
        time: "Yesterday 5:30 PM",
      },
    ],
  },
  {
    id: "conv-3",
    name: "Amit Deshmukh",
    role: "Real Estate Consultant",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
    propertyTitle: "Cozy Studio near Metro",
    lastMessage: "Feel free to let me know if you would like video tour assistance.",
    time: "Aug 28",
    unread: 0,
    online: true,
    messages: [
      {
        id: "m1",
        sender: "agent",
        text: "Thank you for reaching out regarding the Cozy Studio. Feel free to let me know if you would like video tour assistance.",
        time: "Aug 28 2:15 PM",
      },
    ],
  },
];

const QUICK_REPLIES = [
  "Is the price negotiable?",
  "Can I schedule a visit tomorrow?",
  "Are pets allowed in this society?",
  "Please share the brochure & floor plan.",
];

export default function MessagesPage() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>(INITIAL_CONVERSATIONS[0].id);
  const [inputMessage, setInputMessage] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const newMessage: MessageItem = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: text.trim(),
      time: "Just now",
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeConv.id) {
          return {
            ...conv,
            lastMessage: text.trim(),
            time: "Just now",
            messages: [...conv.messages, newMessage],
          };
        }
        return conv;
      })
    );

    setInputMessage("");

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === activeConv.id) {
            return {
              ...conv,
              lastMessage: "Thanks for your message! The team will get back to you shortly.",
              time: "Just now",
              messages: [
                ...conv.messages,
                {
                  id: "msg-reply-" + Date.now(),
                  sender: "agent",
                  text: "Thanks for your message! The team will get back to you shortly.",
                  time: "Just now",
                },
              ],
            };
          }
          return conv;
        })
      );
    }, 1200);
  };

  if (!session) {
    return (
      <div className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-md text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Direct Messaging Inbox</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Sign in to communicate directly with verified agents, sellers, and property managers in real time.
        </p>
        <Link
          href="/login"
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all text-center"
        >
          Sign In to Your Account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-6xl flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Messages
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
          Chat with verified property managers, owners, and concierge advisors.
        </p>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3.5 border-b border-slate-200 bg-white">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-100 rounded-xl border border-transparent focus:bg-white focus:border-slate-300 outline-none transition-all"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.map((conv) => {
              const isSelected = conv.id === activeConv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setMobileChatOpen(true);
                  }}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isSelected
                      ? "bg-rose-50/60 border-l-4 border-rose-600"
                      : "hover:bg-slate-100/70"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={conv.avatar}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {conv.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {conv.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-600 font-medium truncate mb-1">
                      {conv.propertyTitle}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Chat Window */}
        <div
          className={`flex-1 flex flex-col bg-white ${
            !mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              {/* Back button for mobile */}
              <button
                onClick={() => setMobileChatOpen(false)}
                className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <div className="relative">
                <img
                  src={activeConv.avatar}
                  alt={activeConv.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                {activeConv.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  {activeConv.name}
                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                    Online
                  </span>
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  {activeConv.role} - <span className="text-slate-700 font-medium">{activeConv.propertyTitle}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40">
            <div className="text-center my-2">
              <span className="text-[11px] bg-slate-200/70 text-slate-600 px-3 py-1 rounded-full font-medium">
                Inquiry created for {activeConv.propertyTitle}
              </span>
            </div>

            {activeConv.messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <img
                      src={activeConv.avatar}
                      alt={activeConv.name}
                      className="w-7 h-7 rounded-full object-cover mb-1"
                    />
                  )}
                  <div
                    className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? "bg-rose-600 text-white rounded-br-none shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`block text-[10px] mt-1 text-right ${
                        isUser ? "text-rose-200" : "text-slate-400"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-slate-400 whitespace-nowrap mr-1 font-medium">
              Suggestions:
            </span>
            {QUICK_REPLIES.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(reply)}
                className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 md:p-4 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center flex-shrink-0"
              >
                <svg className="w-5 h-5 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
