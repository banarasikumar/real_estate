import React from "react";
import { MapPin, Bed, Bath, Square, ShieldCheck, Calendar, Home } from "lucide-react";
import { getPropertyById, getPublishedProperties } from "@repo/api";
import SafeImage from "../../../components/SafeImage";
import EnquiryForm from "../../../components/EnquiryForm";
import SavePropertyButton from "../../../components/SavePropertyButton";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Try to fetch real properties, or fall back to mock
  let property = null;
  
  try {
    if (id) {
      property = await getPropertyById(id);
    }
  } catch (error) {
    console.error("Failed to fetch property:", error);
  }

  if (!property) {
    // Mock fallback
    const MOCK_PROPERTIES = [
      {
        id: "1",
        title: "Modern Apartment in Downtown",
        address: "123 Main St, Mumbai",
        price: "₹1.5 Cr",
        beds: 3,
        baths: 2,
        sqft: 1200,
        images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80"],
        isVerified: true,
        description: "Welcome to this stunning modern apartment located in the heart of Downtown Mumbai. Featuring an open-concept layout, high-end appliances, and floor-to-ceiling windows that provide incredible natural light and city views. Perfect for urban professionals seeking luxury and convenience.",
        builtYear: 2020,
        propertyType: "Apartment"
      },
      {
        id: "2",
        title: "Luxury Villa with Pool",
        address: "45 Palm Jumeirah, Bangalore",
        price: "₹4.2 Cr",
        beds: 5,
        baths: 6,
        sqft: 4500,
        images: ["https://images.unsplash.com/photo-1613490908836-e05e54d6d654?w=1200&q=80"],
        isVerified: true,
        description: "An exquisite luxury villa offering unmatched elegance and privacy. Highlights include a private infinity pool, landscaped gardens, a chef's kitchen, and spacious en-suite bedrooms. A true masterpiece of architecture and design.",
        builtYear: 2018,
        propertyType: "Villa"
      },
      {
        id: "3",
        title: "Cozy Studio near Metro",
        address: "78 Park Ave, Delhi",
        price: "₹65 Lacs",
        beds: 1,
        baths: 1,
        sqft: 550,
        images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80"],
        isVerified: false,
        description: "This cozy and well-maintained studio apartment is perfect for first-time buyers or investors. Located just steps away from the metro station, offering excellent connectivity. Features smart storage solutions and a functional layout.",
        builtYear: 2015,
        propertyType: "Studio"
      },
    ];
    property = MOCK_PROPERTIES.find((p) => p.id === id) || MOCK_PROPERTIES[0];
  }

  const defaultImage = property.property_media?.[0]?.url || property.images?.[0] || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Image */}
      <div className="w-full h-[40vh] md:h-[60vh] relative">
        <SafeImage 
          src={defaultImage} 
          alt={property.title}
          className="w-full h-full object-cover"
        />
        {property.isVerified && (
          <div className="absolute top-6 left-6 bg-green-500 text-white font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Verified Listing
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 pr-4">{property.title}</h1>
                    <SavePropertyButton propertyId={property.id} />
                  </div>
                  <div className="flex items-center text-slate-500 text-lg">
                    <MapPin className="w-5 h-5 mr-2" />
                    {property.address}
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-extrabold text-blue-600">
                  {property.price}
                </div>
              </div>

              {/* Key Features */}
              <div className="flex flex-wrap items-center gap-6 mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <Bed className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{property.beds}</p>
                    <p className="text-sm text-slate-500">Bedrooms</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <Bath className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{property.baths}</p>
                    <p className="text-sm text-slate-500">Bathrooms</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <Square className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{property.sqft}</p>
                    <p className="text-sm text-slate-500">Sq Ft</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">About this property</h2>
              <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-line">
                {property.description || "No description provided."}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Property Type</p>
                    <p className="font-medium text-slate-900">{property.propertyType || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Built Year</p>
                    <p className="font-medium text-slate-900">{property.builtYear || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Contact Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 flex flex-col gap-6">
              <EnquiryForm propertyId={property.id} ownerId={property.owner_id} />
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <a
                  href="https://wa.me/1234567890?text=I%20am%20interested%20in%20this%20property"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg flex items-center justify-center transition-all"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
