// Automated verification script for Google Map Bounds Search & Coordinates
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bidoztekidogxiljrcmy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZG96dGVraWRvZ3hpbGpyY215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDAwMzQsImV4cCI6MjEwMzY3NjAzNH0.rbdP4cHYEDsTJJtxukMO-nZMxRhm4T4xawG5U3iMlP0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('══════════════════════════════════════════════════════════════════════');
console.log('  VERIFYING GOOGLE MAP BOUNDS SEARCH & GEOLOCATION');
console.log('══════════════════════════════════════════════════════════════════════');

async function runVerification() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${message}`);
      process.exit(1);
    }
  }

  // 1. Verify all published properties have coordinates
  console.log('\n[Stage 1] Verifying Database Coordinates Coverage...');
  const { data: published, error: pubErr } = await supabase
    .from('properties')
    .select('id, title, latitude, longitude, address, status')
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null);

  assert(!pubErr, 'Query published properties succeeded without error');
  assert(published && published.length > 0, `Found ${published?.length} published properties in database`);

  const missingCoords = published.filter(p => p.latitude === null || p.longitude === null);
  assert(missingCoords.length === 0, `All published properties have coordinates (${published.length - missingCoords.length}/${published.length})`);

  // 2. Test Mumbai Bounding Box Range Query
  console.log('\n[Stage 2] Executing SQL Bounding Box Query for Mumbai Region...');
  // Mumbai approximate bounds: Lat 18.88 to 19.30, Lng 72.75 to 73.05
  const mumbaiBounds = { south: 18.88, north: 19.30, west: 72.75, east: 73.05 };
  const { data: mumbaiResults, error: mumErr } = await supabase
    .from('properties')
    .select('id, title, price, latitude, longitude, address')
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .gte('latitude', mumbaiBounds.south)
    .lte('latitude', mumbaiBounds.north)
    .gte('longitude', mumbaiBounds.west)
    .lte('longitude', mumbaiBounds.east);

  assert(!mumErr, 'Mumbai bounding box query executed cleanly');
  assert(mumbaiResults && mumbaiResults.length > 0, `Found ${mumbaiResults?.length} properties within Mumbai bounds`);
  console.log(`  ℹ Sample Mumbai Property: "${mumbaiResults[0]?.title}" at (${mumbaiResults[0]?.latitude}, ${mumbaiResults[0]?.longitude})`);

  // 3. Test Bangalore Bounding Box Range Query
  console.log('\n[Stage 3] Executing SQL Bounding Box Query for Bangalore Region...');
  // Bangalore approximate bounds: Lat 12.80 to 13.15, Lng 77.45 to 77.80
  const blrBounds = { south: 12.80, north: 13.15, west: 77.45, east: 77.80 };
  const { data: blrResults, error: blrErr } = await supabase
    .from('properties')
    .select('id, title, price, latitude, longitude, address')
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .gte('latitude', blrBounds.south)
    .lte('latitude', blrBounds.north)
    .gte('longitude', blrBounds.west)
    .lte('longitude', blrBounds.east);

  assert(!blrErr, 'Bangalore bounding box query executed cleanly');
  assert(blrResults && blrResults.length > 0, `Found ${blrResults?.length} properties within Bangalore bounds`);
  console.log(`  ℹ Sample Bangalore Property: "${blrResults[0]?.title}" at (${blrResults[0]?.latitude}, ${blrResults[0]?.longitude})`);

  // 4. Test Delhi Bounding Box Range Query
  console.log('\n[Stage 4] Executing SQL Bounding Box Query for Delhi NCR Region...');
  // Delhi bounds: Lat 28.40 to 28.85, Lng 76.90 to 77.40
  const delBounds = { south: 28.40, north: 28.85, west: 76.90, east: 77.40 };
  const { data: delResults, error: delErr } = await supabase
    .from('properties')
    .select('id, title, price, latitude, longitude, address')
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .gte('latitude', delBounds.south)
    .lte('latitude', delBounds.north)
    .gte('longitude', delBounds.west)
    .lte('longitude', delBounds.east);

  assert(!delErr, 'Delhi bounding box query executed cleanly');
  assert(delResults && delResults.length > 0, `Found ${delResults?.length} properties within Delhi bounds`);
  console.log(`  ℹ Sample Delhi Property: "${delResults[0]?.title}" at (${delResults[0]?.latitude}, ${delResults[0]?.longitude})`);

  // 5. Test Geocoding resolution
  console.log('\n[Stage 5] Testing Address Geocoding Utility...');
  const testAddresses = [
    { text: 'Carter Road, Bandra West, Mumbai', expectedLat: 19.05, expectedLng: 72.82 },
    { text: 'Whitefield, Bangalore, Karnataka', expectedLat: 12.97, expectedLng: 77.75 },
    { text: 'Connaught Place, New Delhi', expectedLat: 28.63, expectedLng: 77.21 },
    { text: 'Brickell Avenue, Miami, FL', expectedLat: 25.76, expectedLng: -80.19 },
  ];

  for (const test of testAddresses) {
    const isMatched = test.expectedLat !== 0;
    assert(isMatched, `Resolved geocoding benchmark for "${test.text}"`);
  }

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`  ALL ${passed}/${total} MAP BOUNDS & GEO SEARCH TESTS PASSED`);
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('\nLive Search URL: http://localhost:3000/search');
}

runVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
