import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  DriverApplication,
  DriverProfile,
  PassengerPreference,
  PassengerRequest,
  RegionId,
  RidePost,
  UserLocation,
  UserRole,
} from '../types/safargo';
import {
  applyToRequest,
  completeRequest,
  createRequest,
  getMatchingRequests,
  getMyRequests,
  saveDriverProfile,
  saveUser,
  selectDriver,
  submitRating,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { getTelegramApp, getTelegramIdentity } from '../lib/telegram';

const todayISO = new Date().toISOString().slice(0, 10);

const normalizeError = (): string => 'Xatolik yuz berdi. Qayta urinib ko\'ring.';

let driverRequestsChannel: RealtimeChannel | null = null;
const passengerApplicationChannels = new Map<string, RealtimeChannel>();

type DriverDraft = {
  departureWindow: DriverApplication['departureWindow'];
  pricePerSeat: number;
};

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
  passengerRequests: PassengerRequest[];
  driverProfiles: DriverProfile[];
  ridePosts: RidePost[];
  driverDraft?: DriverDraft;
  ratingTargetRequestId?: string;
  initializeApp: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  setLocation: (location: UserLocation) => Promise<void>;
  confirmLocation: () => Promise<void>;
  addPassengerRequest: (request: Omit<PassengerRequest, 'id' | 'applicants' | 'status'>) => Promise<void>;
  selectDriver: (requestId: string, driverId: string) => Promise<void>;
  completeRequest: (requestId: string) => Promise<void>;
  rateDriver: (driverId: string, stars: number) => Promise<void>;
  addRidePost: (ridePost: Omit<RidePost, 'id' | 'driverId'>) => Promise<void>;
  acceptIncomingRequest: (requestId: string) => Promise<void>;
  rejectIncomingRequest: (requestId: string) => void;
  clearRealtime: () => void;
};

const tearDownRealtime = (): void => {
  if (driverRequestsChannel) {
    supabase.removeChannel(driverRequestsChannel);
    driverRequestsChannel = null;
  }

  passengerApplicationChannels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  passengerApplicationChannels.clear();
};

export const useSafargoStore = create<SafargoState>((set, get) => {
  const syncUser = async (): Promise<void> => {
    const state = get();
    const tgUser = getTelegramApp()?.initDataUnsafe?.user;

    try {
      const user = await saveUser(tgUser, state.role, state.location);
      set({ currentUser: user, error: undefined });
    } catch {
      set({ error: normalizeError() });
    }
  };

  const refreshPassengerData = async (): Promise<void> => {
    const currentUserId = get().currentUser?.id;
    if (!currentUserId) return;

    const data = await getMyRequests(currentUserId);
    set({ passengerRequests: data.requests, driverProfiles: data.drivers });

    const requestIds = data.requests.map((request) => request.id);
    const activeRequestIds = new Set(requestIds);

    passengerApplicationChannels.forEach((channel, requestId) => {
      if (!activeRequestIds.has(requestId)) {
        supabase.removeChannel(channel);
        passengerApplicationChannels.delete(requestId);
      }
    });

    requestIds.forEach((requestId) => {
      if (passengerApplicationChannels.has(requestId)) {
        return;
      }

      const channel = supabase
        .channel(`applications-${requestId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'driver_applications',
            filter: `request_id=eq.${requestId}`,
          },
          () => {
            void refreshPassengerData();
          },
        )
        .subscribe();

      passengerApplicationChannels.set(requestId, channel);
    });
  };

  const refreshDriverData = async (): Promise<void> => {
    const districtId = get().location?.districtId;
    if (!districtId) return;

    const requests = await getMatchingRequests(districtId);
    set({ passengerRequests: requests });

    if (driverRequestsChannel) {
      supabase.removeChannel(driverRequestsChannel);
      driverRequestsChannel = null;
    }

    driverRequestsChannel = supabase
      .channel('requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'passenger_requests',
          filter: `origin_district_id=eq.${districtId}`,
        },
        () => {
          void refreshDriverData();
        },
      )
      .subscribe();
  };

  const refreshRoleData = async (): Promise<void> => {
    const state = get();
    if (!state.confirmedLocation || !state.role) {
      return;
    }

    if (state.role === 'passenger') {
      await refreshPassengerData();
    } else {
      await refreshDriverData();
    }
  };

  return {
    currentUser: undefined,
    role: undefined,
    location: undefined,
    confirmedLocation: false,
    activeTab: 'entry',
    isLoading: false,
    error: undefined,
    passengerRequests: [],
    driverProfiles: [],
    ridePosts: [],
    driverDraft: undefined,
    ratingTargetRequestId: undefined,

    initializeApp: async () => {
      set({ isLoading: true, error: undefined });
      try {
        const identity = getTelegramIdentity();
        const user = await saveUser(identity.user, get().role, get().location);
        set({
          currentUser: user,
          activeTab: get().role ? get().role : 'entry',
          isLoading: false,
        });

        await refreshRoleData();
      } catch {
        set({ isLoading: false, error: normalizeError() });
      }
    },

    setRole: async (role) => {
      set({ role, activeTab: role, error: undefined });
      await syncUser();
      try {
        await refreshRoleData();
      } catch {
        set({ error: normalizeError() });
      }
    },

    setLocation: async (location) => {
      set({ location, confirmedLocation: false, error: undefined });
      await syncUser();
    },

    confirmLocation: async () => {
      set({ confirmedLocation: true, error: undefined });
      await syncUser();
      try {
        await refreshRoleData();
      } catch {
        set({ error: normalizeError() });
      }
    },

    addPassengerRequest: async (request) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;

      set({ isLoading: true, error: undefined });
      try {
        await createRequest({
          passengerId: currentUser.id,
          passengerName: currentUser.name,
          origin: request.origin,
          destinationRegionId: request.destinationRegionId,
          dateISO: request.dateISO,
          timeApprox: request.timeApprox,
          seats: request.seats,
          preferences: request.preferences,
        });

        await refreshPassengerData();
        set({ isLoading: false });
      } catch {
        set({ isLoading: false, error: normalizeError() });
      }
    },

    selectDriver: async (requestId, driverId) => {
      set({ isLoading: true, error: undefined });
      try {
        await selectDriver(requestId, driverId);
        await refreshPassengerData();
        set({ isLoading: false });
      } catch {
        set({ isLoading: false, error: normalizeError() });
      }
    },

    completeRequest: async (requestId) => {
      set({ isLoading: true, error: undefined });
      try {
        await completeRequest(requestId);
        await refreshPassengerData();
        set({ isLoading: false, ratingTargetRequestId: requestId });
      } catch {
        set({ isLoading: false, error: normalizeError() });
      }
    },

    rateDriver: async (driverId, stars) => {
      const state = get();
      const requestId = state.ratingTargetRequestId;
      const passengerId = state.currentUser?.id;
      if (!requestId || !passengerId) return;

      set({ isLoading: true, error: undefined });
      try {
        await submitRating({ requestId, driverId, passengerId, stars });
        await refreshPassengerData();
        set({ isLoading: false, ratingTargetRequestId: undefined });
      } catch {
        set({ isLoading: false, error: normalizeError() });
      }
    },

    addRidePost: async (ridePost) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;

      set((state) => ({
        ridePosts: [
          {
            ...ridePost,
            id: `ride-${Date.now()}`,
            driverId: currentUser.id,
          },
          ...state.ridePosts,
        ],
        driverDraft: {
          departureWindow: ridePost.departureWindow,
          pricePerSeat: ridePost.pricePerSeat,
        },
        error: undefined,
      }));

      try {
        await saveDriverProfile(currentUser.id, 'Noma\'lum', 2020, '+998 90 000 00 00');
      } catch {
        set({ error: normalizeError() });
      }
    },

    acceptIncomingRequest: async (requestId) => {
      const currentUserId = get().currentUser?.id;
      const draft = get().driverDraft;
      if (!currentUserId) return;

      set({ isLoading: true, error: undefined });
      try {
        await applyToRequest(requestId, {
          driverId: currentUserId,
          pricePerSeat: draft?.pricePerSeat ?? 100000,
          departureWindow: draft?.departureWindow ?? 'Hozir',
        });

        const locationDistrictId = get().location?.districtId;
        if (locationDistrictId) {
          const requests = await getMatchingRequests(locationDistrictId);
          set({ passengerRequests: requests });
        }

        set({ isLoading: false });
      } catch {
        set({ isLoading: false, error: normalizeError() });
      }
    },

    rejectIncomingRequest: (requestId) => {
      set((state) => ({
        passengerRequests: state.passengerRequests.filter((request) => request.id !== requestId),
      }));
    },

    clearRealtime: () => {
      tearDownRealtime();
    },
  };
});

export const regionDefaults = {
  destinationRegionId: 'toshkent' as RegionId,
  dateISO: todayISO,
  timeApprox: '07:00–09:00',
  seats: 1,
  preferences: [] as PassengerPreference[],
};
