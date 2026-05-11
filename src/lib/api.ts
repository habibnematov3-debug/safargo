import { supabase } from './supabase';
import type {
  DriverApplication,
  DriverBadge,
  DriverProfile,
  PassengerPreference,
  PassengerRequest,
  UserLocation,
  UserRole,
} from '../types/safargo';

const PASSENGER_PREFERENCES: PassengerPreference[] = [
  'front_seat',
  'non_smoking',
  'clean_car',
  'women_only',
];

const DRIVER_BADGES: DriverBadge[] = ['verified', 'clean', 'on_time'];
const DRIVER_WINDOWS: DriverApplication['departureWindow'][] = ['Hozir', '30 daqiqada', '1 soatda', '2 soatda'];

type DbPassengerRequest = {
  id: string;
  passenger_id: string;
  passenger_name: string;
  origin_region_id: string;
  origin_district_id: string;
  origin_label: string;
  destination_region_id: string;
  date_iso: string;
  time_approx: string;
  seats: number;
  preferences: string[] | null;
  status: 'active' | 'confirmed' | 'cancelled' | 'completed';
  selected_driver_id: string | null;
  created_at: string;
};

type DbDriverApplication = {
  id: string;
  request_id: string;
  driver_id: string;
  price_per_seat: number;
  departure_window: string;
  note: string | null;
  created_at: string;
};

type DbDriverProfile = {
  id: string;
  car_model: string | null;
  car_year: number | null;
  phone: string | null;
  is_verified: boolean | null;
  is_premium: boolean | null;
  rating_avg: number | string | null;
  rating_trips: number | null;
  badges: string[] | null;
};

type DbUserRow = {
  id: string;
  name: string;
  driver_profiles: DbDriverProfile | DbDriverProfile[] | null;
};

const toPassengerPreferences = (values: string[] | null): PassengerPreference[] =>
  (values ?? []).filter((item): item is PassengerPreference =>
    PASSENGER_PREFERENCES.includes(item as PassengerPreference),
  );

const toDriverBadges = (values: string[] | null, isVerified: boolean): DriverBadge[] => {
  const badges = (values ?? []).filter((item): item is DriverBadge => DRIVER_BADGES.includes(item as DriverBadge));

  if (isVerified && !badges.includes('verified')) {
    badges.unshift('verified');
  }

  return badges;
};

const toDepartureWindow = (value: string): DriverApplication['departureWindow'] => {
  if (DRIVER_WINDOWS.includes(value as DriverApplication['departureWindow'])) {
    return value as DriverApplication['departureWindow'];
  }

  return 'Hozir';
};

const getProfile = (profile: DbDriverProfile | DbDriverProfile[] | null): DbDriverProfile | null => {
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }

  return profile;
};

const toNumber = (value: string | number | null | undefined, fallback = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const buildInitials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'SF';

const toDriverProfile = (user: DbUserRow): DriverProfile => {
  const profile = getProfile(user.driver_profiles);
  const isVerified = Boolean(profile?.is_verified);

  return {
    id: user.id,
    name: user.name,
    initials: buildInitials(user.name),
    carModel: profile?.car_model ?? 'Mashina ko\'rsatilmagan',
    carYear: profile?.car_year ?? 2020,
    phone: profile?.phone ?? '+998 90 000 00 00',
    badges: toDriverBadges(profile?.badges ?? [], isVerified),
    rating: {
      avg: toNumber(profile?.rating_avg, 0),
      trips: profile?.rating_trips ?? 0,
    },
    isPremium: Boolean(profile?.is_premium),
  };
};

const toPassengerRequest = (
  row: DbPassengerRequest,
  applicants: DriverApplication[],
): PassengerRequest => ({
  id: row.id,
  passengerName: row.passenger_name,
  origin: {
    regionId: row.origin_region_id as UserLocation['regionId'],
    districtId: row.origin_district_id,
    labelUz: row.origin_label,
    source: 'manual',
  },
  destinationRegionId: row.destination_region_id as UserLocation['regionId'],
  dateISO: row.date_iso,
  timeApprox: row.time_approx,
  seats: row.seats,
  preferences: toPassengerPreferences(row.preferences),
  applicants,
  status: row.status,
  selectedDriverId: row.selected_driver_id ?? undefined,
});

export const saveUser = async (
  userId: string,
  name: string,
  role: UserRole,
  regionId: string,
  districtId: string,
  districtLabel: string,
): Promise<{ id: string; name: string }> => {
  const id = String(userId || 'dev-user-123');
  const userName = name.trim() || 'Foydalanuvchi';

  const { error } = await supabase.from('users').upsert({
    id,
    name: userName,
    role,
    region_id: regionId,
    district_id: districtId,
    district_label: districtLabel,
    telegram_chat_id: id,
  });

  if (error) {
    throw error;
  }

  return { id, name: userName };
};

export const saveDriverProfile = async (
  userId: string,
  carModel: string,
  carYear: number,
  phone: string,
): Promise<void> => {
  const { error } = await supabase.from('driver_profiles').upsert({
    id: userId,
    car_model: carModel,
    car_year: carYear,
    phone,
  });

  if (error) {
    throw error;
  }
};

export const createRequest = async (
  passengerId: string,
  passengerName: string,
  originRegionId: string,
  originDistrictId: string,
  originLabel: string,
  destinationRegionId: PassengerRequest['destinationRegionId'],
  dateIso: string,
  timeApprox: string,
  seats: number,
  preferences: string[],
): Promise<string> => {
  const payload = {
    passenger_id: passengerId,
    passenger_name: passengerName,
    origin_region_id: originRegionId,
    origin_district_id: originDistrictId,
    origin_label: originLabel,
    destination_region_id: destinationRegionId,
    date_iso: dateIso,
    time_approx: timeApprox,
    seats,
    preferences,
    status: 'active' as const,
  };

  const { data: row, error } = await supabase
    .from('passenger_requests')
    .insert(payload)
    .select('id')
    .single<{ id: string }>();

  if (error || !row) {
    throw error ?? new Error('Request yaratilmadi');
  }

  // Non-blocking -- notification failure should not block request creation.
  supabase.functions.invoke('notify-drivers', {
    body: { requestId: row.id },
  }).catch((err: unknown) => {
    console.warn('notify-drivers failed (non-fatal):', err);
  });

  return row.id;
};

export const getMatchingRequests = async (districtId: string): Promise<PassengerRequest[]> => {
  const { data, error } = await supabase
    .from('passenger_requests')
    .select('*')
    .eq('origin_district_id', districtId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .returns<DbPassengerRequest[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toPassengerRequest(row, []));
};

export const applyToRequest = async (
  requestId: string,
  driverApplication: {
    driverId: string;
    pricePerSeat: number;
    departureWindow: DriverApplication['departureWindow'];
    note?: string;
  },
): Promise<void> => {
  const { error } = await supabase.from('driver_applications').upsert(
    {
      request_id: requestId,
      driver_id: driverApplication.driverId,
      price_per_seat: driverApplication.pricePerSeat,
      departure_window: driverApplication.departureWindow,
      note: driverApplication.note ?? null,
    },
    { onConflict: 'request_id,driver_id' },
  );

  if (error) {
    throw error;
  }
};

export const getMyRequests = async (
  passengerId: string,
): Promise<{ requests: PassengerRequest[]; drivers: DriverProfile[] }> => {
  const { data: requestRows, error: requestsError } = await supabase
    .from('passenger_requests')
    .select('*')
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false })
    .returns<DbPassengerRequest[]>();

  if (requestsError) {
    throw requestsError;
  }

  const requests = requestRows ?? [];
  const requestIds = requests.map((request) => request.id);

  if (requestIds.length === 0) {
    return { requests: [], drivers: [] };
  }

  const { data: applicationRows, error: appsError } = await supabase
    .from('driver_applications')
    .select('*')
    .in('request_id', requestIds)
    .order('created_at', { ascending: false })
    .returns<DbDriverApplication[]>();

  if (appsError) {
    throw appsError;
  }

  const applications = applicationRows ?? [];
  const selectedDriverIds = requests
    .map((request) => request.selected_driver_id)
    .filter((driverId): driverId is string => Boolean(driverId));
  const driverIds = Array.from(
    new Set([...applications.map((application) => application.driver_id), ...selectedDriverIds]),
  );

  let drivers: DriverProfile[] = [];
  if (driverIds.length > 0) {
    const { data: userRows, error: usersError } = await supabase
      .from('users')
      .select('id,name,driver_profiles(id,car_model,car_year,phone,is_verified,is_premium,rating_avg,rating_trips,badges)')
      .in('id', driverIds)
      .returns<DbUserRow[]>();

    if (usersError) {
      throw usersError;
    }

    drivers = (userRows ?? []).map(toDriverProfile);
  }

  const applicationsByRequest = new Map<string, DriverApplication[]>();
  applications.forEach((application) => {
    const bucket = applicationsByRequest.get(application.request_id) ?? [];
    bucket.push({
      id: application.id,
      driverId: application.driver_id,
      pricePerSeat: application.price_per_seat,
      departureWindow: toDepartureWindow(application.departure_window),
      note: application.note ?? undefined,
    });
    applicationsByRequest.set(application.request_id, bucket);
  });

  return {
    requests: requests.map((row) => toPassengerRequest(row, applicationsByRequest.get(row.id) ?? [])),
    drivers,
  };
};

export type DriverOrder = {
  request: PassengerRequest;
  priceEarned: number;
};

export const getDriverOrders = async (driverId: string): Promise<DriverOrder[]> => {
  const { data: requestRows, error: requestsError } = await supabase
    .from('passenger_requests')
    .select('*')
    .eq('selected_driver_id', driverId)
    .in('status', ['confirmed', 'completed'])
    .order('created_at', { ascending: false })
    .returns<DbPassengerRequest[]>();

  if (requestsError) {
    throw requestsError;
  }

  const requests = requestRows ?? [];
  const requestIds = requests.map((request) => request.id);

  if (requestIds.length === 0) {
    return [];
  }

  const { data: applicationRows, error: appsError } = await supabase
    .from('driver_applications')
    .select('*')
    .eq('driver_id', driverId)
    .in('request_id', requestIds)
    .returns<DbDriverApplication[]>();

  if (appsError) {
    throw appsError;
  }

  const priceByRequest = new Map<string, number>();
  (applicationRows ?? []).forEach((application) => {
    priceByRequest.set(application.request_id, application.price_per_seat);
  });

  return requests.map((request) => ({
    request: toPassengerRequest(request, []),
    priceEarned: (priceByRequest.get(request.id) ?? 0) * request.seats,
  }));
};

export const selectDriver = async (requestId: string, driverId: string): Promise<void> => {
  const { error } = await supabase
    .from('passenger_requests')
    .update({ status: 'confirmed', selected_driver_id: driverId })
    .eq('id', requestId);

  if (error) {
    throw error;
  }

  // Non-blocking -- notification failure should not block driver selection.
  supabase.functions.invoke('notify-passenger', {
    body: { requestId },
  }).catch((err: unknown) => {
    console.warn('notify-passenger failed (non-fatal):', err);
  });
};

export const completeRequest = async (requestId: string): Promise<void> => {
  const { error } = await supabase
    .from('passenger_requests')
    .update({ status: 'completed' })
    .eq('id', requestId);

  if (error) {
    throw error;
  }
};

export const submitRating = async (rating: {
  requestId: string;
  driverId: string;
  passengerId: string;
  stars: number;
  onTime: number;
  car: number;
  manners: number;
  comment?: string;
}): Promise<void> => {
  const { error: ratingError } = await supabase.from('ratings').insert({
    request_id: rating.requestId,
    driver_id: rating.driverId,
    passenger_id: rating.passengerId,
    stars: rating.stars,
    on_time: rating.onTime,
    car: rating.car,
    manners: rating.manners,
    comment: rating.comment ?? null,
  });

  if (ratingError) {
    throw ratingError;
  }

  const { data: profile, error: profileError } = await supabase
    .from('driver_profiles')
    .select('rating_avg,rating_trips')
    .eq('id', rating.driverId)
    .single<{ rating_avg: number | string | null; rating_trips: number | null }>();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  const trips = (profile?.rating_trips ?? 0) + 1;
  const currentAvg = toNumber(profile?.rating_avg, 0);
  const avg = Number(((currentAvg * (trips - 1) + rating.stars) / trips).toFixed(1));

  const { error: updateError } = await supabase.from('driver_profiles').upsert({
    id: rating.driverId,
    rating_avg: avg,
    rating_trips: trips,
  });

  if (updateError) {
    throw updateError;
  }
};

export const getDriverProfile = async (driverId: string): Promise<DriverProfile | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,driver_profiles(id,car_model,car_year,phone,is_verified,is_premium,rating_avg,rating_trips,badges)')
    .eq('id', driverId)
    .maybeSingle<DbUserRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toDriverProfile(data);
};
