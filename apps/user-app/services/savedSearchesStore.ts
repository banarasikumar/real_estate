import { SavedSearch, createSavedSearch, getSavedSearches as apiGetSavedSearches, deleteSavedSearch as apiDeleteSavedSearch } from '@repo/api';

export interface SavedSearchItem extends SavedSearch {
  subtitle?: string;
  isCustomBoundary?: boolean;
}

// Initial curated luxury saved searches for out-of-the-box delight
export const INITIAL_SAVED_SEARCHES: SavedSearchItem[] = [
  {
    id: 'search-la-luxury',
    name: 'Los Angeles Luxury Estates',
    query: 'Los Angeles CA homes',
    notification_frequency: 'INSTANT',
    alert_new_matches: true,
    alert_price_drop: true,
    match_count: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    filters: {
      list_type: 'SALE',
      prop_type: 'VILLA',
      bedrooms: 4,
      bathrooms: 3,
      priceRange: 'above_3cr',
    },
    polygon: null,
  },
  {
    id: 'search-custom-boundary',
    name: 'Bel-Air & Sunset Boundary',
    query: 'Custom Drawn Boundary Area',
    notification_frequency: 'INSTANT',
    alert_new_matches: true,
    alert_price_drop: true,
    match_count: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    isCustomBoundary: true,
    filters: {
      list_type: 'SALE',
      prop_type: 'HOUSE',
    },
    polygon: [
      { latitude: 34.088, longitude: -118.448 },
      { latitude: 34.095, longitude: -118.435 },
      { latitude: 34.082, longitude: -118.420 },
      { latitude: 34.072, longitude: -118.438 },
      { latitude: 34.088, longitude: -118.448 },
    ],
  },
  {
    id: 'search-miami-waterfront',
    name: 'Miami Beachfront Penthouses',
    query: 'Miami FL waterfront',
    notification_frequency: 'DAILY',
    alert_new_matches: true,
    alert_price_drop: true,
    match_count: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    filters: {
      list_type: 'SALE',
      prop_type: 'APARTMENT',
      bedrooms: 3,
      priceRange: '1cr_3cr',
    },
    polygon: null,
  },
];

class SavedSearchesStore {
  private searches: SavedSearchItem[] = [...INITIAL_SAVED_SEARCHES];
  private listeners: Set<(searches: SavedSearchItem[]) => void> = new Set();
  private pendingSearchToRun: SavedSearchItem | null = null;
  private onRunListeners: Set<(search: SavedSearchItem) => void> = new Set();

  constructor() {}

  public getSearches(): SavedSearchItem[] {
    return this.searches;
  }

  public subscribe(listener: (searches: SavedSearchItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = [...this.searches];
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (e) {
        console.warn('[SavedSearchesStore] Listener error:', e);
      }
    });
  }

  public async saveSearch(
    data: {
      name: string;
      query?: string;
      filters?: Record<string, any>;
      polygon?: Array<{ latitude: number; longitude: number }> | null;
      notificationFrequency?: 'INSTANT' | 'DAILY' | 'NEVER' | string;
      alertNewMatches?: boolean;
      alertPriceDrop?: boolean;
      userId?: string | null;
    }
  ): Promise<SavedSearchItem> {
    const newItem: SavedSearchItem = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: data.userId || null,
      name: data.name.trim(),
      query: data.query || '',
      filters: data.filters || {},
      polygon: data.polygon || null,
      notification_frequency: data.notificationFrequency || 'INSTANT',
      alert_new_matches: data.alertNewMatches ?? true,
      alert_price_drop: data.alertPriceDrop ?? true,
      match_count: 0,
      isCustomBoundary: !!(data.polygon && data.polygon.length > 0),
      created_at: new Date().toISOString(),
    };

    // Prepend to local memory store
    this.searches = [newItem, ...this.searches.filter((s) => s.id !== newItem.id)];
    this.notify();

    // Async sync with Supabase if authenticated
    if (data.userId) {
      createSavedSearch({
        userId: data.userId,
        name: newItem.name,
        query: newItem.query,
        filters: newItem.filters,
        polygon: newItem.polygon || undefined,
        notificationFrequency: newItem.notification_frequency,
        alertNewMatches: newItem.alert_new_matches,
        alertPriceDrop: newItem.alert_price_drop,
      }).then((res) => {
        if (res?.data?.id && res.data.id !== newItem.id) {
          // Update id to remote id
          this.searches = this.searches.map((s) => (s.id === newItem.id ? { ...s, id: res.data!.id } : s));
          this.notify();
        }
      }).catch((err) => {
        console.warn('[SavedSearchesStore] Sync error:', err);
      });
    }

    return newItem;
  }

  public async removeSearch(id: string, userId?: string | null): Promise<void> {
    this.searches = this.searches.filter((s) => s.id !== id);
    this.notify();

    if (userId) {
      apiDeleteSavedSearch(id, userId).catch((err) => {
        console.warn('[SavedSearchesStore] Delete sync error:', err);
      });
    }
  }

  public async updateSearch(id: string, updates: Partial<SavedSearchItem>, userId?: string | null): Promise<void> {
    this.searches = this.searches.map((item) => {
      if (item.id === id) {
        return { ...item, ...updates, updated_at: new Date().toISOString() };
      }
      return item;
    });
    this.notify();
  }

  public async syncWithRemote(userId?: string | null) {
    if (!userId) return;
    try {
      const remote = await apiGetSavedSearches(userId);
      if (Array.isArray(remote) && remote.length > 0) {
        // Merge without losing local items
        const remoteIds = new Set(remote.map((r) => r.id));
        const nonDuplicateLocal = this.searches.filter((s) => !remoteIds.has(s.id));
        this.searches = [...(remote as SavedSearchItem[]), ...nonDuplicateLocal];
        this.notify();
      }
    } catch (err) {
      console.warn('[SavedSearchesStore] Remote fetch warning:', err);
    }
  }

  /**
   * Triggers running a saved search on the map view
   */
  public triggerRunOnMap(search: SavedSearchItem) {
    this.pendingSearchToRun = search;
    this.onRunListeners.forEach((listener) => {
      try {
        listener(search);
      } catch (err) {
        console.warn('[SavedSearchesStore] Run listener error:', err);
      }
    });
  }

  public subscribeToRunOnMap(listener: (search: SavedSearchItem) => void): () => void {
    this.onRunListeners.add(listener);
    return () => {
      this.onRunListeners.delete(listener);
    };
  }

  public popPendingSearchToRun(): SavedSearchItem | null {
    const search = this.pendingSearchToRun;
    this.pendingSearchToRun = null;
    return search;
  }
}

export const savedSearchesStore = new SavedSearchesStore();
