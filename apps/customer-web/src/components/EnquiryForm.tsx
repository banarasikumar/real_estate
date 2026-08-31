"use client";

import React, { useState } from "react";
import { createEnquiry } from "@repo/api";

interface EnquiryFormProps {
  propertyId: string;
  ownerId?: string; // Might be missing or we can pass it if available
}

export default function EnquiryForm({ propertyId, ownerId }: EnquiryFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Combine all fields into a single message for the API, 
    // since createEnquiry only takes message right now.
    const fullMessage = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`;

    try {
      const res = await createEnquiry(propertyId, fullMessage);
      if (res.success) {
        setSuccess(true);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
      } else {
        setError("Failed to send enquiry. Please try again.");
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
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          Your enquiry has been sent successfully!
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
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
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
          ></textarea>
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? "Sending..." : "Enquire Now"}
        </button>
      </form>
    </div>
  );
}
