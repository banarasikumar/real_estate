import React from 'react';
import { Building2, Users, FileText, TrendingUp } from 'lucide-react';
import ModerationQueue from '../components/ModerationQueue';

export default function AdminHomePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ModerationQueue initialFilter="PENDING" />
    </div>
  );
}
