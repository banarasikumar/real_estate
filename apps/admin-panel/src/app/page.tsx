import React from 'react';
import { Building2, Users, FileText, TrendingUp } from 'lucide-react';
import ApprovalDashboard from '../components/ApprovalDashboard';

export default function AdminHomePage() {
  const stats = [
    { name: 'Total Properties', value: '1,245', icon: Building2, change: '+12%' },
    { name: 'Active Users', value: '8,432', icon: Users, change: '+5%' },
    { name: 'New Listings', value: '143', icon: FileText, change: '+18%' },
    { name: 'Monthly Revenue', value: '$45,231', icon: TrendingUp, change: '+8%' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">{stat.change}</span>
                <span className="text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8">
        <ApprovalDashboard />
      </div>
    </div>
  );
}
