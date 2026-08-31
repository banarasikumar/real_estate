"use client";

import React, { useEffect, useState } from 'react';
import { getPendingProperties, approveProperty, rejectProperty } from '@repo/api';

type Property = {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  property_media: { url: string }[];
};

export default function ApprovalDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPendingProperties = async () => {
    setLoading(true);
    const data = await getPendingProperties();
    setProperties(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingProperties();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const result = await approveProperty(id);
    if (result.success) {
      setProperties((prev) => prev.filter((p) => p.id !== id));
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const result = await rejectProperty(id);
    if (result.success) {
      setProperties((prev) => prev.filter((p) => p.id !== id));
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No pending properties</h3>
        <p className="text-gray-500">You're all caught up! There are no properties awaiting approval at this time.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
        <p className="text-sm text-gray-500">Review and approve properties submitted by users.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
              <th className="py-4 px-6 font-medium">Property</th>
              <th className="py-4 px-6 font-medium">Price</th>
              <th className="py-4 px-6 font-medium">Status</th>
              <th className="py-4 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {properties.map((property) => (
              <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    {property.property_media && property.property_media.length > 0 ? (
                      <img src={property.property_media[0].url} alt={property.title} className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No image</div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{property.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-1 max-w-xs">{property.description}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 font-medium text-gray-900">
                  ${property.price?.toLocaleString()}
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleApprove(property.id)}
                      disabled={actionLoading === property.id}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                      {actionLoading === property.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(property.id)}
                      disabled={actionLoading === property.id}
                      className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
