import { create } from 'zustand';
import { defaultLocation } from '../data/locations';
import { saveUser } from '../lib/api';
import { getTelegramIdentity } from '../lib/telegram';
import type { PassengerPreference, RegionId, UserLocation, UserRole } from '../types/safargo';

type CurrentUser = {
  id: string;
  name: string;
};

type SafargoState = {
  currentUser?: CurrentUser;
  role?: UserRole;
  location?: UserLocation;
  confirmedLocation: boolean;
  activeTab: 'entry' | 'driver' | 'passenger';
  isLoading: boolean;
  error?: string;
  initializeApp: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  setLocation: (location: UserLocation) => Promise<void>;
  confirmLocation: () => Promise<void>;
  resetToEntry: () => void;
  clearRealtime: () => void;
};

const normalizeError = (): string => 'Xatolik yuz berdi. Qayta urinib ko\'ring.';

const fallbackLocation = defaultLocation;

export const useSafargoStore = create<SafargoState>((set, get) => ({
  currentUser: undefined,
  role: undefined,
  location: undefined,
  confirmedLocation: false,
  activeTab: 'entry',
  isLoading: false,
  error: undefined,

  initializeApp: async () => {
    set({ isLoading: true, error: undefined });

    try {
      const identity = getTelegramIdentity();
      const location = get().location ?? fallbackLocation;
      const currentUser = await saveUser(
        identity.id,
        identity.name,
        get().role ?? 'passenger',
        location.regionId,
        location.districtId,
        location.labelUz,
      );

      set({
        currentUser,
        activeTab: get().role ? get().role : 'entry',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: normalizeError() });
    }
  },

  setRole: async (role) => {
    set({ role, activeTab: role, error: undefined });
  },

  setLocation: async (location) => {
    set({ location, confirmedLocation: false, error: undefined });
  },

  confirmLocation: async () => {
    set({ confirmedLocation: true, error: undefined });
  },

  resetToEntry: () => {
    set({
      currentUser: undefined,
      role: undefined,
      confirmedLocation: false,
      activeTab: 'entry',
      isLoading: false,
      error: undefined,
    });
  },

  clearRealtime: () => {
    void 0;
  },
}));

export const regionDefaults = {
  destinationRegionId: 'toshkent' as RegionId,
  dateISO: new Date().toISOString().slice(0, 10),
  timeApprox: '07:00–09:00',
  seats: 1,
  preferences: [] as PassengerPreference[],
};
