export type MediaCategory =
  | 'All'
  | 'Exterior'
  | 'Living Room'
  | 'Kitchen'
  | 'Master Suite'
  | 'Bathroom'
  | 'Views';

export interface CategorizedMediaItem {
  id: string;
  url: string;
  category: MediaCategory;
  caption?: string;
}

export interface FloorPlanRoom {
  name: string;
  size: string;
  sqft: number;
}

export interface FloorPlanData {
  url: string;
  dimensions: string;
  totalSqft: number;
  rooms: FloorPlanRoom[];
}

export interface VirtualTourData {
  tourUrl: string;
  previewImageUrl: string;
  title: string;
  provider: 'Matterport' | '3D Walkthrough';
}

export interface NeighborhoodData {
  walkScore: number;
  walkDescription: string;
  transitScore: number;
  transitDescription: string;
  bikeScore: number;
  bikeDescription: string;
  highlights: string[];
}

export interface SchoolData {
  id: string;
  name: string;
  rating: number; // e.g. 9 for 9/10
  type: 'Public' | 'Private';
  distance: string;
  grades: string;
}

export interface EnrichedPropertyDetails {
  id: string;
  title: string;
  price: number;
  list_type: 'SALE' | 'RENT';
  prop_type: string;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  address: string;
  city: string;
  state?: string;
  description: string;
  yearBuilt?: number;
  parkingSpaces?: number;
  hoaMonthly?: number;
  annualTaxRate?: number;
  annualInsurance?: number;
  isVerified?: boolean;
  badge?: string;
  specialOffer?: string;
  categorizedMedia: CategorizedMediaItem[];
  floorPlan: FloorPlanData;
  virtualTour: VirtualTourData;
  neighborhood: NeighborhoodData;
  schools: SchoolData[];
  agent: {
    name: string;
    agency: string;
    rating: number;
    reviewCount: number;
    phone: string;
    avatarUrl: string;
    license: string;
    isSuperAgent: boolean;
  };
}

const LUXURY_ROOM_PHOTOS: Record<MediaCategory, string[]> = {
  All: [],
  Exterior: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=85',
  ],
  'Living Room': [
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=85',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=85',
  ],
  Kitchen: [
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=85',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1200&q=85',
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&q=85',
  ],
  'Master Suite': [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=85',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=85',
  ],
  Bathroom: [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=85',
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=85',
  ],
  Views: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=85',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=85',
  ],
};

export function getEnrichedPropertyDetails(rawProperty: any): EnrichedPropertyDetails {
  const isRent = rawProperty?.list_type === 'RENT';
  const price = rawProperty?.price || (isRent ? 4500 : 1250000);
  const beds = rawProperty?.bedrooms || 3;
  const baths = rawProperty?.bathrooms || 2;
  const sqft = rawProperty?.area_sqft || 2150;

  // Build categorized photos
  const rawPhotos: string[] = [];
  if (Array.isArray(rawProperty?.property_media) && rawProperty.property_media.length > 0) {
    rawProperty.property_media.forEach((m: any) => {
      if (m?.url) rawPhotos.push(m.url);
    });
  } else if (rawProperty?.imageUrl) {
    rawPhotos.push(rawProperty.imageUrl);
  }

  const categorizedMedia: CategorizedMediaItem[] = [];

  // Add primary photos
  if (rawPhotos.length > 0) {
    categorizedMedia.push({
      id: 'media-0',
      url: rawPhotos[0],
      category: 'Exterior',
      caption: 'Front Elevation & Architecture',
    });
    if (rawPhotos.length > 1) {
      categorizedMedia.push({
        id: 'media-1',
        url: rawPhotos[1],
        category: 'Living Room',
        caption: 'Grand Living Space & Natural Light',
      });
    }
    if (rawPhotos.length > 2) {
      categorizedMedia.push({
        id: 'media-2',
        url: rawPhotos[2],
        category: 'Kitchen',
        caption: 'Gourmet Chef Kitchen with Island',
      });
    }
  } else {
    categorizedMedia.push({
      id: 'media-ext-1',
      url: LUXURY_ROOM_PHOTOS.Exterior[0],
      category: 'Exterior',
      caption: 'Main Architectural Facade',
    });
  }

  // Ensure full coverage for all room categories
  categorizedMedia.push(
    {
      id: 'media-liv-1',
      url: LUXURY_ROOM_PHOTOS['Living Room'][0],
      category: 'Living Room',
      caption: 'Designer Living Salon & High Ceilings',
    },
    {
      id: 'media-kitch-1',
      url: LUXURY_ROOM_PHOTOS.Kitchen[0],
      category: 'Kitchen',
      caption: 'Custom Italian Cabinetry & Marble Countertops',
    },
    {
      id: 'media-mast-1',
      url: LUXURY_ROOM_PHOTOS['Master Suite'][0],
      category: 'Master Suite',
      caption: 'Primary Suite with Private Balcony',
    },
    {
      id: 'media-bath-1',
      url: LUXURY_ROOM_PHOTOS.Bathroom[0],
      category: 'Bathroom',
      caption: 'Spa Ensuite with Freestanding Soaking Tub',
    },
    {
      id: 'media-view-1',
      url: LUXURY_ROOM_PHOTOS.Views[0],
      category: 'Views',
      caption: 'Unobstructed Panoramic Skyline Views',
    },
    {
      id: 'media-ext-2',
      url: LUXURY_ROOM_PHOTOS.Exterior[1],
      category: 'Exterior',
      caption: 'Private Landscaped Terrace & Courtyard',
    }
  );

  return {
    id: rawProperty?.id || 'prop-default',
    title: rawProperty?.title || 'Modern Luxury Architectural Residence',
    price,
    list_type: isRent ? 'RENT' : 'SALE',
    prop_type: rawProperty?.prop_type || 'APARTMENT',
    bedrooms: beds,
    bathrooms: baths,
    area_sqft: sqft,
    address: rawProperty?.address || 'Prime Residential Avenue',
    city: rawProperty?.city || 'Beverly Hills',
    state: rawProperty?.state || 'CA',
    description:
      rawProperty?.description ||
      'Experience the pinnacle of luxury living in this custom-designed architectural residence. Boasting floor-to-ceiling glass, custom imported millwork, a private elevator, an open-concept entertaining level, and a world-class primary suite with direct terrace access. Finished with smart-home automation and multi-zone climate control.',
    yearBuilt: 2023,
    parkingSpaces: 2,
    hoaMonthly: isRent ? 0 : Math.round(price * 0.00045) || 450,
    annualTaxRate: 0.0125, // 1.25%
    annualInsurance: Math.round((price * 0.0035) || 2400),
    isVerified: rawProperty?.isVerified ?? true,
    badge: rawProperty?.badge || (isRent ? 'Verified Luxury' : 'Exclusive Listing'),
    specialOffer: rawProperty?.specialOffer,
    categorizedMedia,
    floorPlan: {
      url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
      dimensions: `${beds} Beds • ${baths} Baths • ${sqft.toLocaleString()} Sq Ft`,
      totalSqft: sqft,
      rooms: [
        { name: 'Grand Living Room', size: "24' × 18'", sqft: 432 },
        { name: 'Chef Kitchen & Dining', size: "19' × 14'", sqft: 266 },
        { name: 'Primary Suite', size: "20' × 16'", sqft: 320 },
        { name: 'Ensuite Primary Bath', size: "14' × 10'", sqft: 140 },
        { name: 'Guest Bedroom 2', size: "15' × 13'", sqft: 195 },
        { name: 'Wrap-around Terrace', size: "32' × 8'", sqft: 256 },
      ],
    },
    virtualTour: {
      tourUrl: 'https://my.matterport.com/show/?m=sample',
      previewImageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
      title: 'Interactive 3D Virtual Walkthrough',
      provider: 'Matterport',
    },
    neighborhood: {
      walkScore: 94,
      walkDescription: "Walker's Paradise — Daily errands do not require a car",
      transitScore: 88,
      transitDescription: 'Rider’s Paradise — World-class public transportation',
      bikeScore: 82,
      bikeDescription: 'Very Bikeable — Flat terrain with excellent dedicated bike lanes',
      highlights: [
        'Fine Dining & Artisanal Bakeries',
        'Whole Foods & Organic Markets (0.3 mi)',
        'Private Tennis & Fitness Club (0.5 mi)',
        'Centennial Park & Botanical Trail',
      ],
    },
    schools: [
      {
        id: 'sch-1',
        name: 'Beverly Vista Middle & Elementary',
        rating: 9,
        type: 'Public',
        distance: '0.4 mi',
        grades: 'K - 8',
      },
      {
        id: 'sch-2',
        name: 'Beverly Hills High School',
        rating: 9,
        type: 'Public',
        distance: '1.1 mi',
        grades: '9 - 12',
      },
      {
        id: 'sch-3',
        name: 'The Buckley School',
        rating: 10,
        type: 'Private',
        distance: '2.4 mi',
        grades: 'PK - 12',
      },
    ],
    agent: {
      name: 'Sarah Jenkins',
      agency: 'Premier Partner Luxury Estates',
      rating: 4.95,
      reviewCount: 48,
      phone: '+1 (310) 555-0198',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=85',
      license: 'DRE #01928472',
      isSuperAgent: true,
    },
  };
}
