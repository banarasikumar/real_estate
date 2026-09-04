"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useAuth,
  getUserConversations,
  getConversationMessages,
  sendChatMessage,
  subscribeToConversationMessages,
  subscribeToUserConversations,
  Conversation,
  ChatMessage,
} from "@repo/api";

const QUICK_REPLIES = [
  "Is this property still available?",
  "Can I schedule a physical tour this weekend?",
  "Are pets allowed in this property?",
  "Is the price negotiable?",
];

function MessagesContent() {
  const { session, user } = useAuth();
  const searchParams = useSearchParams();
  const targetConvId = searchParams.get("conversationId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(targetConvId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const convs = await getUserConversations(session.user.id);
      setConversations(convs);

      // If activeConvId is not set, pick the first or the target from URL
      if (targetConvId && convs.some((c) => c.id === targetConvId)) {
        setActiveConvId(targetConvId);
        setMobileChatOpen(true);
      } else if (!activeConvId && convs.length > 0) {
        setActiveConvId(convs[0].id);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  }, [session?.user?.id, targetConvId, activeConvId]);

  useEffect(() => {
    if (session?.user?.id) {
      loadConversations();
      // Subscribe to conversation updates (new threads or new last_message)
      const unsub = subscribeToUserConversations(session.user.id, () => {
        loadConversations();
      });
      return () => unsub();
    } else {
      setLoadingConvs(false);
    }
  }, [session?.user?.id, loadConversations]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    getConversationMessages(activeConvId)
      .then((msgs) => {
        if (isMounted) {
          const unique = Array.from(new Map((msgs || []).map((m) => [m.id, m])).values());
          setMessages(unique);
          setLoadingMessages(false);
          setTimeout(scrollToBottom, 100);
        }
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        if (isMounted) setLoadingMessages(false);
      });

    // Realtime subscription for incoming messages
    const unsubscribe = subscribeToConversationMessages(activeConvId, (newMsg) => {
      if (isMounted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // Match pending optimistic message
          const optIdx = prev.findIndex(
            (m) => m.id.startsWith("temp-") && m.sender_id === newMsg.sender_id && m.text === newMsg.text
          );
          if (optIdx !== -1) {
            const updated = [...prev];
            updated[optIdx] = newMsg;
            return updated;
          }

          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeConvId]);

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || !activeConvId || !session?.user?.id || sending) return;

    setSending(true);
    setInputMessage("");

    // Optimistic message
    const tempId = "temp-" + Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: session.user.id,
      text: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await sendChatMessage(activeConvId, session.user.id, text.trim());
      if (res.success && res.data) {
        const realMsg = res.data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === realMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? realMsg : m));
        });
        // Update conversation's last message in local state
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? { ...c, last_message: text.trim(), last_message_at: new Date().toISOString() }
              : c
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Counterpart profile (if current user is buyer, show owner; else show buyer)
  const isBuyer = activeConv?.buyer_id === session?.user?.id;
  const counterpart = isBuyer ? activeConv?.owner : activeConv?.buyer;
  const counterpartName = counterpart?.full_name || (isBuyer ? "Property Owner / Agent" : "Prospective Buyer");
  const counterpartAvatar =
    counterpart?.avatar_url ||
    `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80`;

  const filteredConversations = conversations.filter((conv) => {
    const title = conv.properties?.title || "";
    const otherName =
      conv.buyer_id === session?.user?.id
        ? conv.owner?.full_name || ""
        : conv.buyer?.full_name || "";
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || otherName.toLowerCase().includes(query);
  });

  if (loadingConvs) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
          Realtime 2-way chat with verified property owners, managers, and concierge advisors.
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                {searchQuery ? "No conversations match your search." : "No conversation threads yet."}
                <div className="mt-4">
                  <Link
                    href="/search"
                    className="inline-block text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg"
                  >
                    Browse Listings & Inquire
                  </Link>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                const isCurrentBuyer = conv.buyer_id === session.user.id;
                const other = isCurrentBuyer ? conv.owner : conv.buyer;
                const name = other?.full_name || (isCurrentBuyer ? "Property Owner" : "Inquirer");
                const avatar =
                  other?.avatar_url ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80";

                const propThumb = conv.properties?.property_media?.[0]?.url;

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
                        src={propThumb || avatar}
                        alt={name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {name}
                        </h4>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-600 font-medium truncate mb-1">
                        {conv.properties?.title || "Property Inquiry"}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {conv.last_message || "Conversation started"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Window */}
        <div
          className={`flex-1 flex flex-col bg-white ${
            !mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
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
                      src={counterpartAvatar}
                      alt={counterpartName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      {counterpartName}
                      <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                        Online
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-xs">
                      {activeConv.properties ? (
                        <Link
                          href={`/property/${activeConv.property_id}`}
                          className="text-rose-600 hover:underline font-medium"
                        >
                          {activeConv.properties.title}
                        </Link>
                      ) : (
                        "Property Chat"
                      )}
                    </p>
                  </div>
                </div>

                {/* View Listing Button */}
                {activeConv.property_id && (
                  <Link
                    href={`/property/${activeConv.property_id}`}
                    className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    View Listing
                  </Link>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 bg-slate-50/40">
                <div className="text-center my-2">
                  <span className="text-[11px] bg-slate-200/70 text-slate-600 px-3 py-1 rounded-full font-medium">
                    Verified real estate thread for {activeConv.properties?.title || "Property"}
                  </span>
                </div>

                {loadingMessages ? (
                  <div className="flex justify-center p-8">
                    <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No messages in this conversation yet. Send a message below to start chatting!
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isUser = msg.sender_id === session.user.id;
                    return (
                      <div
                        key={`${msg.id || 'msg'}-${idx}`}
                        className={`flex items-end gap-2 ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isUser && (
                          <img
                            src={counterpartAvatar}
                            alt={counterpartName}
                            className="w-7 h-7 rounded-full object-cover mb-1 flex-shrink-0"
                          />
                        )}
                        <div
                          className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isUser
                              ? "bg-rose-600 text-white rounded-br-none shadow-sm"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          <span
                            className={`block text-[10px] mt-1 text-right ${
                              isUser ? "text-rose-200" : "text-slate-400"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
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
                    disabled={sending}
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
                    disabled={!inputMessage.trim() || sending}
                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center flex-shrink-0"
                  >
                    <svg className="w-5 h-5 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <svg className="w-12 h-12 text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h3 className="text-base font-semibold text-slate-700 mb-1">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose a conversation from the list to view real-time messages, or browse properties to start a new inquiry.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
