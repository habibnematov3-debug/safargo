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

type DbRatingRow = {
  request_id: string;
};

type PendingRatingRequestRow = Pick<
  DbPassengerRequest,
  'id' | 'origin_label' | 'destination_region_id' | 'date_iso' | 'selected_driver_id' | 'created_at' | 'status'
>;

type DbUserNameRow = {
  id: string;
  name: string;
};

export type PendingRating = {
  id: string;
  tripLabelUz: string;
  driverId: string;
  driverName: string;
  completedAtISO: string;
  status: 'confirmed' | 'completed';
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

export const ensureUser = async (userId: string, name: string): Promise<void> => {
  const id = String(userId || 'dev-user-123');
  const userName = name.trim() || 'Foydalanuvchi';

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  if (data) {
    return;
  }

  const { error: insertError } = await supabase.from('users').insert({
    id,
    name: userName,
    telegram_chat_id: id,
  });

  if (insertError) {
    throw insertError;
  }
};

export const saveDriverProfile = async (
  userId: string,
  carModel: string,
  carYear: number,
  phone: string,
  name = 'Haydovchi',
): Promise<void> => {
  await ensureUser(userId, name);

  const { error } = await supabase.from('driver_profiles').upsert({
    id: userId,
    car_model: carModel,
    car_year: carYear,
    phone,
    is_verified: false,
    is_premium: false,
    rating_avg: 0,
    rating_trips: 0,
    badges: [],
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
  await ensureUser(passengerId, passengerName);

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
    console.warn('Notification failed (non-fatal):', err);
  });

  return row.id;
};

export const getMatchingRequests = async (districtId: string, driverId: string): Promise<PassengerRequest[]> => {
  const { data, error } = await supabase
    .from('passenger_requests')
    .select('*')
    .eq('origin_district_id', districtId)
    .neq('passenger_id', driverId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .returns<DbPassengerRequest[]>();

  if (error) {
    throw error;
  }

  const requests = data ?? [];
  const requestIds = requests.map((request) => request.id);

  if (requestIds.length === 0) {
    return [];
  }

  const { data: applicationRows, error: appsError } = await supabase
    .from('driver_applications')
    .select('*')
    .in('request_id', requestIds)
    .returns<DbDriverApplication[]>();

  if (appsError) {
    throw appsError;
  }

  const applicationsByRequest = new Map<string, DriverApplication[]>();
  (applicationRows ?? []).forEach((application) => {
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

  return requests.map((row) => toPassengerRequest(row, applicationsByRequest.get(row.id) ?? []));
};

export const applyToRequest = async (
  requestId: string,
  driverApplication: {
    driverId: string;
    pricePerSeat: number;
    departureWindow: DriverApplication['departureWindow'];
    note?: string;
    driverName?: string;
  },
): Promise<void> => {
  await ensureUser(driverApplication.driverId, driverApplication.driverName ?? 'Haydovchi');

  const { data: existing, error: existingError } = await supabase
    .from('driver_applications')
    .select('id')
    .eq('request_id', requestId)
    .eq('driver_id', driverApplication.driverId)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return;
  }

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
    console.warn('Notification failed (non-fatal):', err);
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

export const completeRide = async (requestId: string): Promise<void> => {
  const { error } = await supabase
    .from('passenger_requests')
    .update({ status: 'completed' })
    .eq('id', requestId);

  if (error) {
    throw error;
  }
};

export const getPendingRatings = async (passengerId: string): Promise<PendingRating[]> => {
  const confirmedCutoffISO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: requestRows, error: requestsError } = await supabase
    .from('passenger_requests')
    .select('id,origin_label,destination_region_id,date_iso,selected_driver_id,created_at,status')
    .eq('passenger_id', passengerId)
    .or(`status.eq.completed,and(status.eq.confirmed,created_at.lt.${confirmedCutoffISO})`)
    .order('created_at', { ascending: false })
    .returns<PendingRatingRequestRow[]>();

  if (requestsError) {
    throw requestsError;
  }

  const requests = (requestRows ?? []).filter((request) => Boolean(request.selected_driver_id));

  if (requests.length === 0) {
    return [];
  }

  const requestIds = requests.map((request) => request.id);
  const { data: ratingRows, error: ratingsError } = await supabase
    .from('ratings')
    .select('request_id')
    .in('request_id', requestIds)
    .eq('passenger_id', passengerId)
    .returns<DbRatingRow[]>();

  if (ratingsError) {
    throw ratingsError;
  }

  const ratedRequestIds = new Set((ratingRows ?? []).map((rating) => rating.request_id));
  const pendingRequests = requests.filter((request) => !ratedRequestIds.has(request.id));
  const driverIds = Array.from(
    new Set(
      pendingRequests
        .map((request) => request.selected_driver_id)
        .filter((driverId): driverId is string => Boolean(driverId)),
    ),
  );

  let driverNames = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,name')
      .in('id', driverIds)
      .returns<DbUserNameRow[]>();

    if (usersError) {
      throw usersError;
    }

    driverNames = new Map((users ?? []).map((user) => [user.id, user.name]));
  }

  return pendingRequests.map((request) => ({
    id: request.id,
    tripLabelUz: `${request.origin_label} → ${request.destination_region_id}`,
    driverId: request.selected_driver_id ?? '',
    driverName: driverNames.get(request.selected_driver_id ?? '') ?? 'Haydovchi',
    completedAtISO: request.date_iso,
    status: request.status === 'confirmed' ? 'confirmed' : 'completed',
  }));
};

export const submitRating = async (
  requestId: string,
  driverId: string,
  passengerId: string,
  stars: number,
  onTime: number,
  car: number,
  manners: number,
  comment?: string,
): Promise<void> => {
  const { error } = await supabase.from('ratings').insert({
    request_id: requestId,
    driver_id: driverId,
    passenger_id: passengerId,
    stars,
    on_time: onTime,
    car,
    manners,
    comment: comment ?? null,
  });

  if (error) {
    throw error;
  }
};

export const getDriverProfile = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('id', userId)
    .single<{ id: string }>();

  return Boolean(data);
};

export const getPassengerStats = async (
  passengerId: string,
): Promise<{
  total: number;
  completed: number;
  rated: number;
}> => {
  const [requests, ratings] = await Promise.all([
    supabase
      .from('passenger_requests')
      .select('status')
      .eq('passenger_id', passengerId),
    supabase
      .from('ratings')
      .select('id')
      .eq('passenger_id', passengerId),
  ]);

  const total = requests.data?.length ?? 0;
  const completed = requests.data?.filter((r) => r.status === 'completed').length ?? 0;
  const rated = ratings.data?.length ?? 0;

  return { total, completed, rated };
};

export const getDriverStats = async (
  driverId: string,
): Promise<{
  totalTrips: number;
  thisMonth: number;
  avgRating: number;
  onTimePct: number;
  carPct: number;
  mannersPct: number;
}> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [profile, ratingsData, thisMonthData] = await Promise.all([
    supabase
      .from('driver_profiles')
      .select('rating_avg, rating_trips')
      .eq('id', driverId)
      .single<{ rating_avg: number | string | null; rating_trips: number | null }>(),
    supabase
      .from('ratings')
      .select('stars, on_time, car, manners')
      .eq('driver_id', driverId)
      .returns<{ stars?: number; on_time?: number; car?: number; manners?: number }[]>(),
    supabase
      .from('passenger_requests')
      .select('id')
      .eq('selected_driver_id', driverId)
      .eq('status', 'completed')
      .gte('created_at', monthStart),
  ]);

  const ratings = ratingsData.data ?? [];
  const avg = (field: 'on_time' | 'car' | 'manners' | 'stars'): number => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((s: number, r: Record<string, number | undefined>) => {
      const val = r[field] ?? 0;
      return s + val;
    }, 0);
    return Math.round((sum / ratings.length) * 20);
  };

  return {
    totalTrips: profile.data?.rating_trips ?? 0,
    thisMonth: thisMonthData.data?.length ?? 0,
    avgRating: toNumber(profile.data?.rating_avg, 0),
    onTimePct: avg('on_time'),
    carPct: avg('car'),
    mannersPct: avg('manners'),
  };
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  const { error } = await supabase.from('users').update({ role }).eq('id', userId);

  if (error) {
    throw error;
  }
};
