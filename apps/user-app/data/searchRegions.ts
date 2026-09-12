export interface SearchRegion {
  id: string;
  name: string;
  city: string;
  state?: string;
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  boundaryPolygon?: Array<[number, number]>; // array of [lng, lat]
  sampleProperties?: any[];
}

export interface SearchHistoryItem {
  id: string;
  text: string;
  regionId?: string;
  subtext?: string;
  listType?: 'SALE' | 'RENT';
}

export interface SearchSuggestionItem {
  id: string;
  text: string;
  regionId?: string;
  subtitle?: string;
  listType?: 'SALE' | 'RENT';
}

import {
  LOS_ANGELES_PROPERTIES,
  NEW_YORK_PROPERTIES,
  MUMBAI_PROPERTIES,
} from './mockProperties';

export const SEARCH_REGIONS: SearchRegion[] = [
  {
    id: 'los-angeles',
    name: 'Los Angeles CA homes',
    city: 'Los Angeles',
    state: 'CA',
    center: [-118.2437, 34.0522],
    zoom: 10.5,
    // Authentic multi-point perimeter around LA basin, San Fernando, Santa Monica, Long Beach, Pasadena
    boundaryPolygon: [
      [-118.6000, 34.2850], // Chatsworth / Porter Ranch
      [-118.4500, 34.3400], // Sylmar / San Fernando Valley North
      [-118.3200, 34.2800], // Tujunga / Sunland
      [-118.3150, 34.1850], // Burbank edge (outside boundary)
      [-118.2450, 34.1450], // Glendale edge (outside boundary)
      [-118.1850, 34.1350], // Eagle Rock / Pasadena border
      [-118.1650, 34.0650], // El Sereno
      [-118.2150, 34.0150], // Boyle Heights / East LA
      [-118.2550, 33.9350], // South Los Angeles / Watts
      [-118.2850, 33.8400], // Harbor Gateway / Gardena
      [-118.2900, 33.7900], // Harbor City / Torrance border
      [-118.2950, 33.7150], // San Pedro / Point Fermin
      [-118.2600, 33.7350], // Port of LA / Long Beach channel
      [-118.3050, 33.7850], // Wilmington
      [-118.3650, 33.9100], // Hawthorne / Inglewood border
      [-118.4350, 33.9450], // LAX / Dockweiler Beach
      [-118.4600, 33.9850], // Marina del Rey / Venice
      [-118.4900, 34.0250], // Santa Monica border
      [-118.5550, 34.0400], // Pacific Palisades coastline
      [-118.6250, 34.1450], // Topanga Canyon / Calabasas border
      [-118.6400, 34.2000], // West Hills
      [-118.6000, 34.2850], // Close loop
    ],
    sampleProperties: LOS_ANGELES_PROPERTIES,
  },
  {
    id: 'new-york',
    name: 'New York NY homes',
    city: 'New York',
    state: 'NY',
    center: [-73.9851, 40.7488], // Midtown Manhattan / Empire State Building
    zoom: 11,
    boundaryPolygon: [
      [-74.0400, 40.7000], // Battery Park / Financial District
      [-74.0150, 40.7500], // Chelsea / Hudson Yards / West Side Highway
      [-73.9900, 40.7950], // Upper West Side / Riverside Park
      [-73.9400, 40.8750], // Inwood / Fort Tryon / Harlem River
      [-73.9100, 40.8500], // South Bronx / Mott Haven border
      [-73.9250, 40.7750], // Astoria / Queens border
      [-73.9550, 40.7250], // Greenpoint / Williamsburg, Brooklyn
      [-73.9850, 40.6900], // DUMBO / Brooklyn Heights
      [-74.0200, 40.6500], // Red Hook / Sunset Park
      [-74.0500, 40.6400], // Upper New York Bay / Staten Island ferry channel
      [-74.0400, 40.7000], // Close loop
    ],
    sampleProperties: NEW_YORK_PROPERTIES,
  },
  {
    id: 'mumbai',
    name: 'Mumbai Luxury Homes',
    city: 'Mumbai',
    state: 'Maharashtra',
    center: [72.8777, 19.0760],
    zoom: 11,
    boundaryPolygon: [
      [72.8150, 18.9050], // Colaba Point
      [72.8220, 18.9400], // Marine Drive / Nariman Point
      [72.8120, 19.0150], // Worli Sea Face
      [72.8250, 19.0600], // Bandra Bandstand
      [72.8280, 19.1050], // Juhu Beach
      [72.8080, 19.1450], // Versova / Lokhandwala
      [72.7950, 19.1900], // Madh Island / Malad West
      [72.8200, 19.2450], // Gorai / Borivali West
      [72.8650, 19.2900], // Mira-Bhayandar North border
      [72.9300, 19.2500], // SGNP / Thane West border
      [72.9600, 19.1850], // Mulund / Bhandup
      [72.9300, 19.0900], // Ghatkopar / Chembur
      [72.9050, 19.0200], // Trombay / Sewri Mudflats
      [72.8550, 18.9600], // Mumbai Port / Mazgaon
      [72.8150, 18.9050], // Close loop
    ],
    sampleProperties: MUMBAI_PROPERTIES,
  },
  {
    id: 'bangalore',
    name: 'Bangalore Tech Corridor',
    city: 'Bangalore',
    state: 'Karnataka',
    center: [77.5946, 12.9716],
    zoom: 11,
    boundaryPolygon: [
      [77.5950, 13.1100], // Yelahanka
      [77.6350, 13.0450], // Hebbal / Manyata
      [77.7450, 12.9850], // KR Puram / Whitefield
      [77.7000, 12.9300], // Marathahalli / Bellandur
      [77.6700, 12.8400], // Electronic City
      [77.5800, 12.8800], // JP Nagar / Bannerghatta
      [77.5200, 12.9200], // Banashankari
      [77.4900, 12.9700], // Kengeri / Nagarbhavi
      [77.5250, 13.0350], // Yeshwanthpur / Peenya
      [77.5950, 13.1100], // Close loop
    ],
    sampleProperties: [
      {
        id: 'blr-1',
        title: 'Prestige Golfshire Designer Villa',
        price: 48000000,
        list_type: 'SALE',
        prop_type: 'VILLA',
        bedrooms: 4,
        bathrooms: 5,
        area_sqft: 4500,
        address: 'Nandi Hills Road, Bangalore',
        latitude: 13.210,
        longitude: 77.705,
        isVerified: true,
        badge: 'Golf Course View',
        property_media: [
          { url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80' },
        ],
      },
      {
        id: 'blr-2',
        title: 'Indiranagar Prime Modern Penthouse',
        price: 29000000,
        list_type: 'SALE',
        prop_type: 'APARTMENT',
        bedrooms: 3,
        bathrooms: 3,
        area_sqft: 2200,
        address: '100ft Road, Indiranagar, Bangalore',
        latitude: 12.978,
        longitude: 77.640,
        isVerified: true,
        badge: 'Prime Location',
        property_media: [
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80' },
        ],
      },
    ],
  },
  {
    id: 'delhi',
    name: 'New Delhi & NCR Residences',
    city: 'New Delhi',
    state: 'Delhi',
    center: [77.2090, 28.6139],
    zoom: 11,
    boundaryPolygon: [
      [77.1000, 28.7500], // Narela / Rohini
      [77.2100, 28.7300], // Burari / Civil Lines
      [77.3100, 28.6600], // Shahdara / Anand Vihar
      [77.3400, 28.5800], // Mayur Vihar / Noida border
      [77.2900, 28.4900], // Okhla / Faridabad border
      [77.1900, 28.5100], // Saket / Mehrauli
      [77.0900, 28.4800], // DLF Cyber City / Gurgaon border
      [77.0150, 28.5600], // Dwarka / IGI Airport
      [77.0700, 28.6400], // Janakpuri / West Delhi
      [77.1200, 28.7000], // Pitampura
      [77.1000, 28.7500], // Close loop
    ],
    sampleProperties: [
      {
        id: 'del-1',
        title: 'The Camellias Super Luxury Suite',
        price: 180000000,
        list_type: 'SALE',
        prop_type: 'APARTMENT',
        bedrooms: 5,
        bathrooms: 6,
        area_sqft: 7400,
        address: 'Golf Course Road, DLF Phase 5, Gurugram, Delhi NCR',
        latitude: 28.450,
        longitude: 77.102,
        isVerified: true,
        badge: 'Ultra Luxury',
        property_media: [
          { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80' },
        ],
      },
    ],
  },
  {
    id: 'goa',
    name: 'Goa Coastal Villas & Homes',
    city: 'Goa',
    state: 'Goa',
    center: [73.8278, 15.4909],
    zoom: 11.5,
    boundaryPolygon: [
      [73.7300, 15.6800], // Morjim / Arambol
      [73.7400, 15.5900], // Vagator / Anjuna
      [73.7650, 15.5200], // Calangute / Candolim
      [73.8100, 15.4600], // Panaji / Miramar / Dona Paula
      [73.8300, 15.3900], // Vasco da Gama / Bogmalo
      [73.9100, 15.2800], // Majorda / Colva
      [73.9300, 15.2200], // Benaulim / Varca
      [73.9500, 15.1500], // Cavelossim / Mobor
      [74.0200, 15.2800], // Quepem / Margao
      [74.0200, 15.4000], // Ponda
      [73.9300, 15.5400], // Old Goa / Bicholim
      [73.7900, 15.6900], // Pernem
      [73.7300, 15.6800], // Close loop
    ],
    sampleProperties: [
      {
        id: 'goa-1',
        title: 'Portuguese Heritage Villa with Private Pool',
        price: 55000000,
        list_type: 'SALE',
        prop_type: 'VILLA',
        bedrooms: 4,
        bathrooms: 4,
        area_sqft: 3800,
        address: 'Assagao, North Goa',
        latitude: 15.592,
        longitude: 73.785,
        isVerified: true,
        badge: 'Private Pool',
        property_media: [
          { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80' },
        ],
      },
    ],
  },
];

export const DEFAULT_REGION: SearchRegion = SEARCH_REGIONS[0];

export const RECENT_SEARCH_HISTORY: SearchHistoryItem[] = [
  { id: 'h1', text: 'Los Angeles CA homes', regionId: 'los-angeles', listType: 'RENT' },
  { id: 'h2', text: 'New York NY homes', regionId: 'new-york', listType: 'SALE' },
  { id: 'h3', text: 'Mumbai Luxury Homes', regionId: 'mumbai', listType: 'SALE' },
  { id: 'h4', text: 'Whitefield, Bangalore', regionId: 'bangalore', listType: 'SALE' },
  { id: 'h5', text: 'New York City NY homes', regionId: 'new-york', listType: 'RENT' },
  { id: 'h6', text: 'ca homes', regionId: 'los-angeles', listType: 'RENT' },
  { id: 'h7', text: 'united states', regionId: 'los-angeles', listType: 'SALE' },
];

export const SUGGESTED_SEARCHES: SearchSuggestionItem[] = [
  { id: 's1', text: 'Homes in New York City NY', regionId: 'new-york', subtitle: 'New York, NY' },
  { id: 's2', text: 'Homes in Manhattan New York City NY', regionId: 'new-york', subtitle: 'Manhattan, New York, NY' },
  { id: 's3', text: 'Apartments in New York City NY', regionId: 'new-york', subtitle: 'New York, NY' },
  { id: 's4', text: 'Los Angeles CA homes', regionId: 'los-angeles', subtitle: 'Los Angeles, CA' },
  { id: 's5', text: 'Sherman Oaks, Los Angeles', regionId: 'los-angeles', subtitle: 'San Fernando Valley, CA' },
  { id: 's6', text: 'Luxury Penthouses in Worli, Mumbai', regionId: 'mumbai', subtitle: 'South Mumbai, MH' },
  { id: 's7', text: 'Villas in Whitefield, Bangalore', regionId: 'bangalore', subtitle: 'Bangalore, KA' },
  { id: 's8', text: 'Beachfront Villas in North Goa', regionId: 'goa', subtitle: 'Goa, India' },
];

export function getRegionById(id: string): SearchRegion | undefined {
  return SEARCH_REGIONS.find((r) => r.id === id);
}

export function findRegionByNameOrCity(text: string): SearchRegion | undefined {
  const query = text.toLowerCase().trim();
  return SEARCH_REGIONS.find(
    (r) =>
      r.name.toLowerCase().includes(query) ||
      r.city.toLowerCase().includes(query) ||
      (r.state && r.state.toLowerCase() === query) ||
      query.includes(r.city.toLowerCase()) ||
      query.includes(r.name.toLowerCase())
  );
}

export function getSearchSuggestions(query: string): SearchSuggestionItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return SUGGESTED_SEARCHES;
  }

  // 1. Matches against defined regions
  const matchedRegions = SEARCH_REGIONS.filter(
    (r) =>
      r.name.toLowerCase().includes(trimmed) ||
      r.city.toLowerCase().includes(trimmed) ||
      (r.state && r.state.toLowerCase().includes(trimmed))
  ).map((r) => ({
    id: `region-${r.id}`,
    text: r.name,
    regionId: r.id,
    subtitle: `${r.city}${r.state ? `, ${r.state}` : ''}`,
  }));

  // 2. Matches against predefined suggestions
  const matchedSuggestions = SUGGESTED_SEARCHES.filter(
    (s) =>
      s.text.toLowerCase().includes(trimmed) ||
      (s.subtitle && s.subtitle.toLowerCase().includes(trimmed))
  );

  // 3. De-duplicate by lowercase text
  const seen = new Set<string>();
  const results: SearchSuggestionItem[] = [];

  for (const item of [...matchedRegions, ...matchedSuggestions]) {
    const key = item.text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  }

  // 4. If nothing matched, provide fallback search suggestion
  if (results.length === 0) {
    results.push({
      id: `custom-${trimmed}`,
      text: query.trim(),
      subtitle: `Search "${query.trim()}"`,
    });
  }

  return results;
}
