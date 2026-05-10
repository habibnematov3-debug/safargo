export type UserRole = 'driver' | 'passenger';

export type RegionId =
  | 'toshkent'
  | 'samarkand'
  | 'fargona'
  | 'buxoro'
  | 'namangan'
  | 'andijon'
  | 'qashqadaryo';

export type DistrictId = string;

export type PassengerPreference =
  | 'front_seat'
  | 'non_smoking'
  | 'clean_car'
  | 'women_only';

export type DriverBadge = 'verified' | 'clean' | 'on_time';

export type UserLocation = {
  regionId: RegionId;
  districtId: DistrictId;
  labelUz: string;
  source: 'gps' | 'manual';
};

export type DriverApplication = {
  id: string;
  driverId: string;
  pricePerSeat: number;
  departureWindow: 'Hozir' | '30 daqiqada' | '1 soatda' | '2 soatda';
  note?: string;
};

export type PassengerRequest = {
  id: string;
  passengerName: string;
  origin: UserLocation;
  destinationRegionId: RegionId;
  dateISO: string;
  timeApprox: string;
  seats: number;
  preferences: PassengerPreference[];
  applicants: DriverApplication[];
  status: 'active' | 'confirmed' | 'completed' | 'cancelled';
  selectedDriverId?: string;
};

export type DriverProfile = {
  id: string;
  name: string;
  initials: string;
  carModel: string;
  carYear: number;
  phone: string;
  badges: DriverBadge[];
  rating: { avg: number; trips: number };
  isPremium: boolean;
};

export type RidePost = {
  id: string;
  driverId: string;
  origin: UserLocation;
  destinationRegionId: RegionId;
  departureWindow: DriverApplication['departureWindow'];
  seatsAvailable: number;
  pricePerSeat: number;
  frontSeatExtra: number;
  smoking: boolean;
};
