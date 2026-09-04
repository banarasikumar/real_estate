"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createEnquiry, getOrCreateConversation, useAuth } from "@repo/api";

interface EnquiryFormProps {
  propertyId: string;
  ownerId?: string;
}

export default function EnquiryForm({ propertyId, ownerId }: EnquiryFormProps) {
  const { session } = useAuth();
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdConvId, setCreatedConvId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const fullMessage = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`;

    try {
      // 1. Submit enquiry with user_id and ownerId
      const res = await createEnquiry(propertyId, fullMessage, session?.user?.id || null, ownerId);
      
      // 2. If user is authenticated and ownerId is present, create or link conversation
      if (session?.user?.id && ownerId) {
        try {
          const convRes = await getOrCreateConversation(
            propertyId,
            session.user.id,
            ownerId,
            message.trim() || fullMessage
          );
          if (convRes.success && convRes.data?.id) {
            setCreatedConvId(convRes.data.id);
          }
        } catch (convErr) {
          console.warn("Could not auto-create conversation thread:", convErr);
        }
      }

      if (res.success || createdConvId) {
        setSuccess(true);
        setMessage("");
      } else {
        setError(res.error?.message || "Failed to send enquiry. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 sticky top-8">
      <h3 className="text-xl font-bold text-slate-900 mb-2">Interested in this property?</h3>
      <p className="text-slate-500 mb-6">Contact the seller to get more details and schedule a viewing.</p>
      
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-2">
          <p className="font-semibold text-sm">Your enquiry has been sent successfully!</p>
          {createdConvId ? (
            <div className="pt-1">
              <Link
                href={`/messages?conversationId=${createdConvId}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                Open Live Chat with Seller &rarr;
              </Link>
            </div>
          ) : session ? (
            <div className="pt-1">
              <Link
                href="/messages"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                View Messages Inbox &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-xs text-emerald-700">
              <Link href="/login" className="underline font-semibold">Sign in</Link> to continue this conversation via live real-time messaging.
            </p>
          )}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
          <input 
            type="text" 
            placeholder="John Doe" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input 
            type="email" 
            placeholder="john@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
          <input 
            type="tel" 
            placeholder="+91 98765 43210" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
          <textarea 
            rows={4}
            placeholder="I am interested in this property and would like to schedule a viewing..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none"
          ></textarea>
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Enquiry & Start Chat"}
        </button>
      </form>
    </div>
  );
}
