"use client";

import React from "react";
import ModerationQueue from "../../components/ModerationQueue";

export default function PropertiesModerationPage() {
  return (
    <div className="max-w-7xl mx-auto py-2 px-2 sm:px-4">
      <ModerationQueue initialFilter="ALL" />
    </div>
  );
}
