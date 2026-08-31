import React from "react";
import { FilterBar, PropertyCard } from "@real-estate/ui";

const MOCK_PROPERTIES = [
  {
    id: "1",
    title: "Modern Apartment in Downtown",
    address: "123 Main St, Mumbai",
    price: "₹1.5 Cr",
    beds: 3,
    baths: 2,
    sqft: 1200,
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80"],
    isVerified: true,
  },
  {
    id: "2",
    title: "Luxury Villa with Pool",
    address: "45 Palm Jumeirah, Bangalore",
    price: "₹4.2 Cr",
    beds: 5,
    baths: 6,
    sqft: 4500,
    images: ["https://images.unsplash.com/photo-1613490908836-e05e54d6d654?w=800&q=80"],
    isVerified: true,
  },
  {
    id: "3",
    title: "Cozy Studio near Metro",
    address: "78 Park Ave, Delhi",
    price: "₹65 Lacs",
    beds: 1,
    baths: 1,
    sqft: 550,
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"],
    isVerified: false,
  },
  {
    id: "4",
    title: "Penthouse with City View",
    address: "99 Skyline Tower, Mumbai",
    price: "₹5.5 Cr",
    beds: 4,
    baths: 4,
    sqft: 3200,
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"],
    isVerified: true,
  },
];

export default function SearchPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden">
      {/* Sticky Top Filter Bar */}
      <div className="w-full border-b bg-white z-10 px-4 py-3 shadow-sm">
        <FilterBar />
      </div>

      {/* Dual View Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left/Top: List View */}
        <div className="w-full lg:w-1/2 xl:w-7/12 flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-6 no-scrollbar relative">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Mumbai, Maharashtra</h1>
            <p className="text-sm font-medium text-slate-500">{MOCK_PROPERTIES.length} homes</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {MOCK_PROPERTIES.map((property) => (
              <a href={`/property/${property.id}`} key={property.id} className="block">
                <PropertyCard {...property} />
              </a>
            ))}
          </div>
        </div>

        {/* Right: Interactive Map (Desktop Only for this basic implementation) */}
        <div className="hidden lg:block lg:w-1/2 xl:w-5/12 bg-slate-200 relative">
          {/* Mock Map Image for MVP */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80')] bg-cover bg-center opacity-80">
            {/* Mock Price Pins (Airbnb style) */}
            <div className="absolute top-1/4 left-1/4 rounded-full bg-white px-3 py-1.5 text-sm font-bold shadow-md hover:scale-110 transition-transform cursor-pointer border border-slate-200">
              ₹1.5 Cr
            </div>
            <div className="absolute top-1/2 left-1/3 rounded-full bg-primary text-white px-3 py-1.5 text-sm font-bold shadow-lg hover:scale-110 transition-transform cursor-pointer">
              ₹4.2 Cr
            </div>
            <div className="absolute bottom-1/3 right-1/4 rounded-full bg-white px-3 py-1.5 text-sm font-bold shadow-md hover:scale-110 transition-transform cursor-pointer border border-slate-200">
              ₹65 Lacs
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
