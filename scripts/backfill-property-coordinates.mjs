import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://bidoztekidogxiljrcmy.supabase.co';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZG96dGVraWRvZ3hpbGpyY215Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODEwMDAzNCwiZXhwIjoyMTAzNjc2MDM0fQ.ay6N2NqWUvJZ6UYibMCDtuyN167LFca2XKj7lBahOdQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

function getDeterministicOffset(id) {
  let hash = 0;
  const str = String(id || '');
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  // Spread within approx +/- 0.015 degrees (~1.5 km)
  const norm1 = (((hash & 0x7fff) / 0x7fff) - 0.5) * 0.03;
  const norm2 = (((((hash >> 15) & 0x7fff)) / 0x7fff) - 0.5) * 0.03;
  return {
    latOffset: parseFloat(norm1.toFixed(6)),
    lngOffset: parseFloat(norm2.toFixed(6))
  };
}

export function resolveCoordinates(prop) {
  const text = `${prop.address || ''} ${prop.title || ''} ${prop.description || ''}`.toLowerCase();
  const offset = getDeterministicOffset(prop.id);

  let baseLat = 19.0760;
  let baseLng = 72.8777;
  let matchedCity = 'Default (Mumbai)';

  if (text.includes('miami') || text.includes('florida') || text.includes('brickell') || text.includes('south beach')) {
    baseLat = 25.7617;
    baseLng = -80.1918;
    matchedCity = 'Miami / Florida';
  } else if (text.includes('delhi') || text.includes('noida') || text.includes('gurgaon') || text.includes('gurugram') || text.includes('ncr')) {
    if (text.includes('noida')) {
      baseLat = 28.5355;
      baseLng = 77.3910;
      matchedCity = 'Delhi / Noida';
    } else if (text.includes('gurgaon') || text.includes('gurugram')) {
      baseLat = 28.4595;
      baseLng = 77.0266;
      matchedCity = 'Delhi / Gurgaon';
    } else {
      baseLat = 28.6139;
      baseLng = 77.2090;
      matchedCity = 'Delhi';
    }
  } else if (text.includes('bangalore') || text.includes('bengaluru') || text.includes('whitefield') || text.includes('indiranagar') || text.includes('koramangala')) {
    if (text.includes('whitefield')) {
      baseLat = 12.9698;
      baseLng = 77.7499;
      matchedCity = 'Bangalore (Whitefield)';
    } else if (text.includes('indiranagar')) {
      baseLat = 12.9784;
      baseLng = 77.6408;
      matchedCity = 'Bangalore (Indiranagar)';
    } else if (text.includes('koramangala')) {
      baseLat = 12.9352;
      baseLng = 77.6245;
      matchedCity = 'Bangalore (Koramangala)';
    } else {
      baseLat = 12.9716;
      baseLng = 77.5946;
      matchedCity = 'Bangalore';
    }
  } else if (text.includes('pune') || text.includes('hinjewadi') || text.includes('wakad') || text.includes('koregaon') || text.includes('baner')) {
    baseLat = 18.5204;
    baseLng = 73.8567;
    matchedCity = 'Pune';
  } else if (text.includes('hyderabad') || text.includes('secunderabad') || text.includes('hitec city') || text.includes('gachibowli') || text.includes('jubilee hills')) {
    baseLat = 17.3850;
    baseLng = 78.4867;
    matchedCity = 'Hyderabad';
  } else if (text.includes('mumbai') || text.includes('bandra') || text.includes('bandstand') || text.includes('lower parel') || text.includes('worli') || text.includes('juhu') || text.includes('andheri') || text.includes('powai') || text.includes('colaba')) {
    if (text.includes('bandstand') || text.includes('bandra')) {
      baseLat = 19.0596;
      baseLng = 72.8295;
      matchedCity = 'Mumbai (Bandra / Bandstand)';
    } else if (text.includes('lower parel') || text.includes('worli')) {
      baseLat = 18.9986;
      baseLng = 72.8306;
      matchedCity = 'Mumbai (Lower Parel / Worli)';
    } else if (text.includes('juhu')) {
      baseLat = 19.1075;
      baseLng = 72.8263;
      matchedCity = 'Mumbai (Juhu)';
    } else if (text.includes('powai')) {
      baseLat = 19.1176;
      baseLng = 72.9060;
      matchedCity = 'Mumbai (Powai)';
    } else {
      baseLat = 19.0760;
      baseLng = 72.8777;
      matchedCity = 'Mumbai';
    }
  }

  const finalLat = parseFloat((baseLat + offset.latOffset).toFixed(6));
  const finalLng = parseFloat((baseLng + offset.lngOffset).toFixed(6));

  return {
    latitude: finalLat,
    longitude: finalLng,
    matchedCity
  };
}

async function runBackfill() {
  console.log('Fetching properties from Supabase...');

  // Fetch properties where status = 'PUBLISHED' or latitude IS NULL
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, address, description, latitude, longitude, status')
    .or('status.eq.PUBLISHED,latitude.is.null');

  if (error) {
    console.error('Failed to fetch properties:', error);
    process.exit(1);
  }

  console.log(`Found ${properties.length} candidate property record(s) to inspect/backfill.\n`);

  let updatedCount = 0;

  for (const prop of properties) {
    const needCoords = prop.latitude === null || prop.longitude === null || prop.status === 'PUBLISHED';
    
    // Determine coordinates
    const { latitude, longitude, matchedCity } = resolveCoordinates(prop);

    // If coordinates already exist and are valid and not null, we can keep them or update if null
    const newLat = (prop.latitude !== null && prop.latitude !== undefined) ? prop.latitude : latitude;
    const newLng = (prop.longitude !== null && prop.longitude !== undefined) ? prop.longitude : longitude;

    const shouldUpdate = prop.latitude === null || prop.longitude === null;

    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          latitude: newLat,
          longitude: newLng,
          updated_at: new Date().toISOString()
        })
        .eq('id', prop.id);

      if (updateError) {
        console.error(`Error updating property ${prop.id} (${prop.title}):`, updateError.message);
      } else {
        console.log(`[Backfilled] ${prop.id} | "${prop.title}" -> ${matchedCity} (${newLat}, ${newLng})`);
        updatedCount++;
      }
    } else {
      console.log(`[Valid] ${prop.id} | "${prop.title}" already has coordinates (${prop.latitude}, ${prop.longitude})`);
    }
  }

  console.log(`\nBackfill complete. Updated ${updatedCount} property records.`);

  // Verification step: verify that all published properties have non-null coordinates
  console.log('\n--- Verifying Published Properties Coordinates ---');
  const { data: publishedWithoutCoords, error: verifyError } = await supabase
    .from('properties')
    .select('id, title, status, latitude, longitude')
    .eq('status', 'PUBLISHED')
    .or('latitude.is.null,longitude.is.null');

  if (verifyError) {
    console.error('Error verifying published properties:', verifyError);
    process.exit(1);
  }

  if (publishedWithoutCoords.length === 0) {
    console.log('SUCCESS: All published properties have valid non-null coordinates!');
  } else {
    console.error(`WARNING: Found ${publishedWithoutCoords.length} published property(ies) without coordinates:`, publishedWithoutCoords);
    process.exit(1);
  }

  // Summary of all published properties with coordinates
  const { data: allPublished } = await supabase
    .from('properties')
    .select('id, title, address, latitude, longitude')
    .eq('status', 'PUBLISHED');

  console.log(`\nVerified ${allPublished?.length || 0} published property(ies):`);
  for (const p of allPublished || []) {
    console.log(` - [${p.id.slice(0, 8)}] ${p.title} @ (${p.latitude}, ${p.longitude}) | ${p.address || 'No address'}`);
  }
}

runBackfill().catch((err) => {
  console.error('Fatal error during backfill:', err);
  process.exit(1);
});
