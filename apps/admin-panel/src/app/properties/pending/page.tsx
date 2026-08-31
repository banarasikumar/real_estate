import React from 'react';

// Mock data for properties pending approval
const mockPendingProperties = [
  { id: '1', title: 'Luxury Villa', location: 'Beverly Hills, CA', price: '$4,500,000', status: 'PENDING_APPROVAL' },
  { id: '2', title: 'Modern Apartment', location: 'New York, NY', price: '$850,000', status: 'PENDING_APPROVAL' },
  { id: '3', title: 'Cozy Cottage', location: 'Asheville, NC', price: '$350,000', status: 'PENDING_APPROVAL' },
];

export default function PendingPropertiesPage() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Pending Approvals</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockPendingProperties.map((property) => (
              <tr key={property.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{property.title}</div>
                  <div className="text-sm text-gray-500">ID: {property.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{property.location}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{property.price}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {property.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-green-600 hover:text-green-900 font-semibold mr-4 px-3 py-1 rounded border border-green-600 hover:bg-green-50 transition">
                    Approve
                  </button>
                  <button className="text-red-600 hover:text-red-900 font-semibold px-3 py-1 rounded border border-red-600 hover:bg-red-50 transition">
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mockPendingProperties.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No properties pending approval.
          </div>
        )}
      </div>
    </div>
  );
}
