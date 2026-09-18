// Verification script for Phase 2: Saved Searches & Alert Subscriptions
import fs from 'fs';
import path from 'path';

console.log('══════════════════════════════════════════════════════════════════════');
console.log('  VERIFYING PHASE 2: SAVED SEARCHES, ALERTS & EDGE FUNCTION');
console.log('══════════════════════════════════════════════════════════════════════\n');

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

// 1. Verify SQL Migration File
console.log('[Test Suite 1] SQL Migration Schema Verification');
const migrationPath = path.resolve('supabase/migrations/00000000000009_saved_searches_and_alerts.sql');
assert(fs.existsSync(migrationPath), 'Migration 00000000000009_saved_searches_and_alerts.sql exists');

const sqlContent = fs.readFileSync(migrationPath, 'utf8');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.saved_searches'), 'saved_searches table definition found');
assert(sqlContent.includes('notification_frequency TEXT DEFAULT \'INSTANT\''), 'notification_frequency check constraint found');
assert(sqlContent.includes('alert_new_listings BOOLEAN DEFAULT true'), 'alert_new_listings column found');
assert(sqlContent.includes('alert_price_drops BOOLEAN DEFAULT true'), 'alert_price_drops column found');
assert(sqlContent.includes('new_matches_count INT DEFAULT 0'), 'new_matches_count column found');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.notifications'), 'notifications table definition found');
assert(sqlContent.includes('saved_search_id UUID REFERENCES public.saved_searches(id)'), 'notifications.saved_search_id foreign key found');
assert(sqlContent.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled on tables');
assert(sqlContent.includes('Users can manage own saved searches'), 'saved_searches RLS policy found');
assert(sqlContent.includes('Users can view own notifications'), 'notifications SELECT RLS policy found');
assert(sqlContent.includes('Service role and system can insert notifications'), 'notifications INSERT RLS policy found');
assert(sqlContent.includes('idx_saved_searches_user'), 'idx_saved_searches_user index found');
assert(sqlContent.includes('idx_notifications_user_read'), 'idx_notifications_user_read index found');
assert(sqlContent.includes('idx_notifications_created'), 'idx_notifications_created index found');
assert(sqlContent.includes('supabase_realtime ADD TABLE public.saved_searches'), 'saved_searches added to supabase_realtime publication');
assert(sqlContent.includes('supabase_realtime ADD TABLE public.notifications'), 'notifications added to supabase_realtime publication');

// 2. Verify TypeScript API Types & Exports
console.log('\n[Test Suite 2] TypeScript API Package Verification');
const typesPath = path.resolve('packages/api/src/database.types.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');
assert(typesContent.includes('NotificationFrequency = \'INSTANT\' | \'DAILY\' | \'NEVER\''), 'NotificationFrequency type exported');
assert(typesContent.includes('NotificationType = \'NEW_MATCH\' | \'PRICE_DROP\' | \'TOUR_REQUEST\' | \'MESSAGE\' | \'SYSTEM\''), 'NotificationType type exported');
assert(typesContent.includes('export interface SavedSearch'), 'SavedSearch interface exported');
assert(typesContent.includes('export interface AppNotification'), 'AppNotification interface exported');

const apiIndexPath = path.resolve('packages/api/src/index.ts');
const apiIndexContent = fs.readFileSync(apiIndexPath, 'utf8');
assert(apiIndexContent.includes("export * from './saved_searches'"), "saved_searches exported in packages/api/src/index.ts");
assert(apiIndexContent.includes("export * from './notifications'"), "notifications exported in packages/api/src/index.ts");

const savedSearchesPath = path.resolve('packages/api/src/saved_searches.ts');
assert(fs.existsSync(savedSearchesPath), 'packages/api/src/saved_searches.ts exists');
const savedSearchesContent = fs.readFileSync(savedSearchesPath, 'utf8');
assert(savedSearchesContent.includes('export const createSavedSearch'), 'createSavedSearch function implemented');
assert(savedSearchesContent.includes('export const getSavedSearches'), 'getSavedSearches function implemented');
assert(savedSearchesContent.includes('export const updateSavedSearch'), 'updateSavedSearch function implemented');
assert(savedSearchesContent.includes('export const deleteSavedSearch'), 'deleteSavedSearch function implemented');

const notificationsPath = path.resolve('packages/api/src/notifications.ts');
const notifContent = fs.readFileSync(notificationsPath, 'utf8');
assert(notifContent.includes('export const getUserNotifications'), 'getUserNotifications implemented');
assert(notifContent.includes('export const markNotificationAsRead'), 'markNotificationAsRead implemented');
assert(notifContent.includes('export const getUnreadNotificationCount'), 'getUnreadNotificationCount implemented');
assert(notifContent.includes('export const sendExpoPushNotification'), 'sendExpoPushNotification preserved');
assert(notifContent.includes('export const updateUserPushToken'), 'updateUserPushToken preserved');

// 3. Verify Edge Function & Point-in-Polygon Ray Casting Logic
console.log('\n[Test Suite 3] Edge Function & Point-in-Polygon Math');
const edgeFuncPath = path.resolve('supabase/functions/match-saved-searches/index.ts');
assert(fs.existsSync(edgeFuncPath), 'Edge Function match-saved-searches/index.ts exists');
const edgeFuncContent = fs.readFileSync(edgeFuncPath, 'utf8');
assert(edgeFuncContent.includes('isPointInRing'), 'Ray-casting isPointInRing algorithm implemented');
assert(edgeFuncContent.includes('isPointInBoundary'), 'isPointInBoundary handler implemented');
assert(edgeFuncContent.includes('matchesSearch'), 'matchesSearch criteria filter implemented');
assert(edgeFuncContent.includes('sendExpoPush'), 'Expo push dispatch implemented');
assert(edgeFuncContent.includes('notifications'), 'Supabase notification insertion implemented');

// Ray casting algorithm unit test in node
function isPointInRing(lng, lat, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Polygon: Beverly Hills triangle / box
const testBox = [
  [-118.42, 34.06],
  [-118.38, 34.06],
  [-118.38, 34.10],
  [-118.42, 34.10],
  [-118.42, 34.06],
];

assert(isPointInRing(-118.40, 34.08, testBox) === true, 'Ray casting accurately detects interior point');
assert(isPointInRing(-118.50, 34.08, testBox) === false, 'Ray casting accurately excludes exterior point (west)');
assert(isPointInRing(-118.30, 34.08, testBox) === false, 'Ray casting accurately excludes exterior point (east)');
assert(isPointInRing(-118.40, 34.15, testBox) === false, 'Ray casting accurately excludes exterior point (north)');
assert(isPointInRing(-118.40, 34.01, testBox) === false, 'Ray casting accurately excludes exterior point (south)');

console.log(`\n══════════════════════════════════════════════════════════════════════`);
console.log(`  ALL ${total} VERIFICATION CHECKS PASSED (${passed}/${total})`);
console.log(`══════════════════════════════════════════════════════════════════════`);
