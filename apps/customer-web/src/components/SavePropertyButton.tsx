"use client";

import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth, checkIfSaved, toggleSavedProperty } from "@repo/api";
import { useRouter } from "next/navigation";

interface SavePropertyButtonProps {
  propertyId: string;
}

export default function SavePropertyButton({ propertyId }: SavePropertyButtonProps) {
  const { session } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStatus = async () => {
      if (session?.user?.id) {
        const saved = await checkIfSaved(session.user.id, propertyId);
        setIsSaved(saved);
      }
      setLoading(false);
    };
    fetchStatus();
  }, [session, propertyId]);

  const handleToggle = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    
    // Optimistic update
    setIsSaved(!isSaved);
    
    const result = await toggleSavedProperty(session.user.id, propertyId);
    if (!result.success) {
      // Revert if failed
      setIsSaved(result.isSaved);
    }
  };

  if (loading && !session) return null;

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isSaved 
          ? "bg-red-50 text-red-600 border border-red-200" 
          : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
      {isSaved ? "Saved" : "Save"}
    </button>
  );
}
