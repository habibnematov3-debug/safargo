import { create } from 'zustand';
import { defaultLocation } from '../data/locations';
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

const todayISO = new Date().toISOString().slice(0, 10);

const tomorrowISO = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const driverProfiles: DriverProfile[] = [
  {
    id: 'driver-akmal',
    name: 'Akmal Rahimov',
    initials: 'AR',
    carModel: 'Chevrolet Cobalt',
    carYear: 2022,
    phone: '+998 90 123 45 67',
    badges: ['verified', 'clean', 'on_time'],
    rating: { avg: 4.8, trips: 126 },
    isPremium: true,
  },
  {
    id: 'driver-dilshod',
    name: 'Dilshod Karimov',
    initials: 'DK',
    carModel: 'Chevrolet Nexia 3',
    carYear: 2020,
    phone: '+998 91 456 78 90',
    badges: ['verified', 'on_time'],
    rating: { avg: 4.6, trips: 78 },
    isPremium: false,
  },
];

const mockDriverApplications: DriverApplication[] = [
  {
    id: 'app-akmal',
    driverId: 'driver-akmal',
    pricePerSeat: 120000,
    departureWindow: '30 daqiqada',
  },
  {
    id: 'app-dilshod',
    driverId: 'driver-dilshod',
    pricePerSeat: 110000,
    departureWindow: '1 soatda',
  },
];

type SafargoState = {
  role?: UserRole;
  location?: UserLocation;
  confirmedLocation: boolean;
  passengerRequests: PassengerRequest[];
  driverProfiles: DriverProfile[];
  ridePosts: RidePost[];
  ratingTargetRequestId?: string;
  setRole: (role: UserRole) => void;
  setLocation: (location: UserLocation) => void;
  confirmLocation: () => void;
  addPassengerRequest: (request: Omit<PassengerRequest, 'id' | 'applicants' | 'status'>) => void;
  selectDriver: (requestId: string, driverId: string) => void;
  completeRequest: (requestId: string) => void;
  rateDriver: (driverId: string, stars: number) => void;
  addRidePost: (ridePost: Omit<RidePost, 'id' | 'driverId'>) => void;
  acceptIncomingRequest: (requestId: string) => void;
  rejectIncomingRequest: (requestId: string) => void;
};

export const useSafargoStore = create<SafargoState>((set) => ({
  location: undefined,
  confirmedLocation: false,
  passengerRequests: [
    {
      id: 'request-demo',
      passengerName: 'Sardor',
      origin: defaultLocation,
      destinationRegionId: 'toshkent',
      dateISO: tomorrowISO(),
      timeApprox: '09:00–12:00',
      seats: 2,
      preferences: ['non_smoking', 'clean_car'],
      applicants: mockDriverApplications,
      status: 'active',
    },
  ],
  driverProfiles,
  ridePosts: [],
  setRole: (role) => set({ role }),
  setLocation: (location) => set({ location, confirmedLocation: false }),
  confirmLocation: () => set({ confirmedLocation: true }),
  addPassengerRequest: (request) => {
    const origin = request.origin;
    const matchingApplicants =
      origin.districtId === defaultLocation.districtId ? mockDriverApplications : [];

    set((state) => ({
      passengerRequests: [
        {
          ...request,
          id: `request-${Date.now()}`,
          applicants: matchingApplicants,
          status: 'active',
        },
        ...state.passengerRequests,
      ],
    }));
  },
  selectDriver: (requestId, driverId) =>
    set((state) => ({
      passengerRequests: state.passengerRequests.map((request) =>
        request.id === requestId
          ? { ...request, status: 'confirmed', selectedDriverId: driverId }
          : request,
      ),
    })),
  completeRequest: (requestId) =>
    set((state) => ({
      passengerRequests: state.passengerRequests.map((request) =>
        request.id === requestId ? { ...request, status: 'completed' } : request,
      ),
      ratingTargetRequestId: requestId,
    })),
  rateDriver: (driverId, stars) =>
    set((state) => ({
      driverProfiles: state.driverProfiles.map((driver) => {
        if (driver.id !== driverId) return driver;

        const trips = driver.rating.trips + 1;
        const avg = Number(((driver.rating.avg * driver.rating.trips + stars) / trips).toFixed(1));

        return { ...driver, rating: { avg, trips } };
      }),
      ratingTargetRequestId: undefined,
    })),
  addRidePost: (ridePost) =>
    set((state) => ({
      ridePosts: [
        {
          ...ridePost,
          id: `ride-${Date.now()}`,
          driverId: 'current-driver',
        },
        ...state.ridePosts,
      ],
    })),
  acceptIncomingRequest: (requestId) =>
    set((state) => ({
      passengerRequests: state.passengerRequests.map((request) =>
        request.id === requestId ? { ...request, status: 'confirmed' } : request,
      ),
    })),
  rejectIncomingRequest: (requestId) =>
    set((state) => ({
      passengerRequests: state.passengerRequests.filter((request) => request.id !== requestId),
    })),
}));

export const regionDefaults = {
  destinationRegionId: 'toshkent' as RegionId,
  dateISO: todayISO,
  timeApprox: '07:00–09:00',
  seats: 1,
  preferences: [] as PassengerPreference[],
};
