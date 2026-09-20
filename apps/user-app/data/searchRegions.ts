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
  MUMBAI_PROPERTIES,
  BANGALORE_PROPERTIES,
  DELHI_PROPERTIES,
  GOA_PROPERTIES,
  RANCHI_PROPERTIES,
} from './mockProperties';

export const SEARCH_REGIONS: SearchRegion[] = [
  {
    id: 'mumbai',
    name: 'Mumbai Luxury Homes',
    city: 'Mumbai',
    state: 'Maharashtra',
    center: [72.8777, 19.0760],
    zoom: 11,
    boundaryPolygon: [
      [72.8130, 18.8950], // Colaba tip (Backbay)
      [72.8190, 18.9200], // Cuffe Parade / Navy Nagar
      [72.8230, 18.9400], // Marine Drive south
      [72.8200, 18.9600], // Girgaon Chowpatty
      [72.8150, 18.9800], // Mahalaxmi / Haji Ali
      [72.8100, 19.0000], // Lower Parel coastal
      [72.8120, 19.0200], // Worli Sea Link south
      [72.8180, 19.0400], // Worli Sea Face north
      [72.8220, 19.0550], // Bandra Bandstand
      [72.8260, 19.0750], // Bandra Reclamation
      [72.8280, 19.0950], // Khar / Santacruz west
      [72.8300, 19.1100], // Juhu Beach
      [72.8200, 19.1300], // Juhu / Vile Parle west
      [72.8100, 19.1500], // Versova / Andheri west
      [72.8000, 19.1700], // Madh Island south
      [72.7950, 19.1950], // Malad west coast
      [72.8050, 19.2200], // Marve / Erangal
      [72.8200, 19.2500], // Gorai / Uttan
      [72.8500, 19.2800], // Borivali west coast
      [72.8800, 19.2950], // Dahisar / Mira-Bhayandar border
      [72.9200, 19.2700], // SGNP / Thane border NE
      [72.9500, 19.2200], // Powai lake area
      [72.9650, 19.1850], // Mulund / Bhandup
      [72.9500, 19.1400], // Vikhroli / Kanjurmarg
      [72.9350, 19.0950], // Ghatkopar / Kurla east
      [72.9200, 19.0500], // Chembur / Trombay north
      [72.9050, 19.0200], // Trombay / Sewri east
      [72.8800, 18.9900], // Wadala / Sewri bridge
      [72.8550, 18.9600], // Mumbai Port / Mazgaon
      [72.8350, 18.9300], // Fort / CST area
      [72.8130, 18.8950], // Close loop
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
    sampleProperties: BANGALORE_PROPERTIES,
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
    sampleProperties: DELHI_PROPERTIES,
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
    sampleProperties: GOA_PROPERTIES,
  },
  {
    id: 'ranchi',
    name: 'Ranchi Green Valley Residences',
    city: 'Ranchi',
    state: 'Jharkhand',
    center: [85.3096, 23.3441],
    zoom: 11,
    boundaryPolygon: [
      [85.2950, 23.4550], // Kanke Dam North
      [85.3250, 23.4450], // Kanke / Ring Road North
      [85.3500, 23.4350], // BIT Mesra area
      [85.3700, 23.4200], // Booty More / Tagore Hill
      [85.3900, 23.3950], // Kokar / Khelgaon
      [85.4100, 23.3650], // Tatisilwai / Namkum East
      [85.3950, 23.3350], // Namkum Industrial Area
      [85.3850, 23.3150], // Chutia / Namkum Station
      [85.3600, 23.2950], // Kusai / Doranda East
      [85.3350, 23.2750], // Dhurwa / Ring Road South
      [85.3100, 23.2700], // JSCA Stadium area
      [85.2850, 23.2850], // Hatia / HEC
      [85.2600, 23.3050], // Pundag / Argora South
      [85.2400, 23.3300], // Kathal More / Argora West
      [85.2300, 23.3600], // Hehal / Itki Road
      [85.2350, 23.3850], // Ratu / Ring Road West
      [85.2550, 23.4150], // Pandra / Kanke Road West
      [85.2750, 23.4350], // Kanke Dam West
      [85.2950, 23.4550], // Close loop
    ],
    sampleProperties: RANCHI_PROPERTIES,
  },
];

export const DEFAULT_REGION: SearchRegion = SEARCH_REGIONS[0];

export const RECENT_SEARCH_HISTORY: SearchHistoryItem[] = [
  { id: 'h1', text: 'Kanke Road, Ranchi', regionId: 'ranchi', listType: 'SALE' },
  { id: 'h2', text: 'Worli, Mumbai', regionId: 'mumbai', listType: 'SALE' },
  { id: 'h3', text: 'Morabadi, Ranchi', regionId: 'ranchi', listType: 'RENT' },
  { id: 'h4', text: 'Indiranagar, Bangalore', regionId: 'bangalore', listType: 'RENT' },
  { id: 'h5', text: 'Golf Course Road, Delhi NCR', regionId: 'delhi', listType: 'SALE' },
  { id: 'h6', text: 'Bandra West, Mumbai', regionId: 'mumbai', listType: 'SALE' },
  { id: 'h7', text: 'North Goa Villas', regionId: 'goa', listType: 'SALE' },
  { id: 'h8', text: 'Harmu & Argora, Ranchi', regionId: 'ranchi', listType: 'SALE' },
  { id: 'h9', text: 'Koramangala, Bangalore', regionId: 'bangalore', listType: 'RENT' },
  { id: 'h10', text: 'Chanakyapuri, New Delhi', regionId: 'delhi', listType: 'RENT' },
];

export const SUGGESTED_SEARCHES: SearchSuggestionItem[] = [
  { id: 's1', text: 'Luxury Villas in Kanke Road, Ranchi', regionId: 'ranchi', subtitle: 'Kanke Dam & Plateau, Ranchi' },
  { id: 's2', text: 'Modern Apartments in Morabadi, Ranchi', regionId: 'ranchi', subtitle: 'Tagore Hill & Morabadi, Ranchi' },
  { id: 's3', text: 'Luxury Penthouses in Worli, Mumbai', regionId: 'mumbai', subtitle: 'South Mumbai, Maharashtra' },
  { id: 's4', text: 'Villas in Whitefield, Bangalore', regionId: 'bangalore', subtitle: 'Bangalore, Karnataka' },
  { id: 's5', text: 'DLF The Camellias, Golf Course Road', regionId: 'delhi', subtitle: 'Gurugram, Delhi NCR' },
  { id: 's6', text: 'Residences in Harmu & Argora, Ranchi', regionId: 'ranchi', subtitle: 'Harmu Housing Colony, Ranchi' },
  { id: 's7', text: 'Sea-Facing Residences in Bandra West', regionId: 'mumbai', subtitle: 'Western Suburbs, Mumbai' },
  { id: 's8', text: 'Beachfront Villas in North Goa', regionId: 'goa', subtitle: 'Assagao & Vagator, Goa' },
  { id: 's9', text: 'Luxury Flats in Indiranagar, Bangalore', regionId: 'bangalore', subtitle: 'East Bangalore, Karnataka' },
  { id: 's10', text: 'Diplomatic Enclave Residences, Chanakyapuri', regionId: 'delhi', subtitle: 'New Delhi, Delhi' },
  { id: 's11', text: 'Colonial Mansions in Sadashivanagar', regionId: 'bangalore', subtitle: 'North Bangalore, Karnataka' },
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
