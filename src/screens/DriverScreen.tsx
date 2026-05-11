import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { regions } from '../data/locations';
import {
  applyToRequest,
  getDriverProfile,
  getMatchingRequests,
  saveDriverProfile,
  saveUser,
  selectDriver,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { getTelegramIdentity, hapticSuccess, hapticTap } from '../lib/telegram';
import { useSafargoStore } from '../store/useSafargoStore';
import type { DriverApplication, PassengerRequest, RegionId } from '../types/safargo';
import { Button, Card, EmptyState, FieldLabel, Input, Pill, Select, Spinner } from '../components/ui';
import { preferenceLabel, requestRoute } from '../utils/format';

type DriverScreenProps = {
  mode?: 'home' | 'new';
};

type DriverProfileSummary = {
  name: string;
  carModel: string;
  carYear: number;
  phone: string;
  ratingAvg: number;
  ratingTrips: number;
};

type DbDriverProfileSummary = {
  car_model: string | null;
  car_year: number | null;
  phone: string | null;
  rating_avg: number | string | null;
  rating_trips: number | null;
};

type DbDriverUserSummary = {
  name: string | null;
};

type ProfileFormErrors = {
  name?: string;
  phone?: string;
  carModel?: string;
  carYear?: string;
};

const carModels = ['Cobalt', 'Nexia 3', 'Gentra', 'Lacetti', 'Onix', 'Monza', 'Spark', 'Matiz', 'Damas', 'Boshqa'];

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

export const DriverScreen = ({ mode = 'new' }: DriverScreenProps) => {
  const location = useSafargoStore((state) => state.location);
  const identity = useMemo(() => getTelegramIdentity(), []);
  const districtId = location?.districtId;
  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [destinationRegionId, setDestinationRegionId] = useState<RegionId>('toshkent');
  const [departureWindow, setDepartureWindow] = useState<DriverApplication['departureWindow']>('Hozir');
  const [seatsAvailable, setSeatsAvailable] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState('120000');
  const [frontSeatExtra, setFrontSeatExtra] = useState('20000');
  const [smoking, setSmoking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileSummary | null>(null);
  const [driverName, setDriverName] = useState(identity.name);
  const [phone, setPhone] = useState('+998 ');
  const [profileCarModel, setProfileCarModel] = useState('');
  const [profileCarYear, setProfileCarYear] = useState('');
  const [carColor, setCarColor] = useState('');
  const [profileErrors, setProfileErrors] = useState<ProfileFormErrors>({});

  const loadDriverProfile = useCallback(async () => {
    setProfileLoading(true);
    setError('');

    try {
      const exists = await getDriverProfile(identity.id);

      if (!exists) {
        setNeedsProfileSetup(true);
        setDriverProfile(null);
        return;
      }

      const [{ data: profile, error: profileError }, { data: user, error: userError }] = await Promise.all([
        supabase
          .from('driver_profiles')
          .select('car_model,car_year,phone,rating_avg,rating_trips')
          .eq('id', identity.id)
          .single<DbDriverProfileSummary>(),
        supabase.from('users').select('name').eq('id', identity.id).maybeSingle<DbDriverUserSummary>(),
      ]);

      if (profileError) {
        throw profileError;
      }

      if (userError) {
        throw userError;
      }

      const summary: DriverProfileSummary = {
        name: user?.name?.trim() || identity.name,
        carModel: profile.car_model ?? 'Mashina',
        carYear: profile.car_year ?? 2020,
        phone: profile.phone ?? '',
        ratingAvg: toNumber(profile.rating_avg),
        ratingTrips: profile.rating_trips ?? 0,
      };

      setDriverProfile(summary);
      setDriverName(summary.name);
      setPhone(summary.phone || '+998 ');
      setProfileCarModel(summary.carModel);
      setProfileCarYear(String(summary.carYear));
      setNeedsProfileSetup(false);
    } catch (err) {
      console.error('driver profile load error:', err);
      setError("Xatolik. Qayta urinib ko'ring.");
      setNeedsProfileSetup(true);
    } finally {
      setProfileLoading(false);
    }
  }, [identity.id, identity.name]);

  useEffect(() => {
    void loadDriverProfile();
  }, [loadDriverProfile]);

  const loadIncomingRequests = useCallback(async () => {
    if (!districtId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMatchingRequests(districtId);
      setRequests(data);
    } catch (err) {
      console.error('loadIncomingRequests error:', err);
      setError("Xatolik. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  }, [districtId]);

  useEffect(() => {
    if (!districtId) {
      setRequests([]);
      setIsLoading(false);
      return undefined;
    }

    void loadIncomingRequests();

    const channel = supabase
      .channel('incoming-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'passenger_requests',
          filter: `origin_district_id=eq.${districtId}`,
        },
        () => {
          void loadIncomingRequests();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [districtId, loadIncomingRequests]);

  const incomingRequests = requests.filter((request) => request.status === 'active');

  const submitRide = async () => {
    if (!location) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      hapticSuccess();
    } catch (err) {
      console.error('submitRide error:', err);
      setError("Xatolik. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateProfileForm = (): ProfileFormErrors => {
    const errors: ProfileFormErrors = {};
    const trimmedName = driverName.trim();
    const trimmedPhone = phone.trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, '');
    const year = Number(profileCarYear);

    if (!trimmedName) {
      errors.name = 'Ism familiyani kiriting';
    }

    if (!trimmedPhone.startsWith('+998') || phoneDigits.length !== 12 || !phoneDigits.startsWith('998')) {
      errors.phone = "Telefon raqamni to'g'ri kiriting: +998 XX XXX XX XX";
    }

    if (!carModels.includes(profileCarModel)) {
      errors.carModel = 'Mashina modelini tanlang';
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2025) {
      errors.carYear = 'Mashina yilini kiriting';
    }

    return errors;
  };

  const submitDriverProfile = async () => {
    if (!location) {
      setError("Joylashuv topilmadi. Qayta urinib ko'ring.");
      return;
    }

    const errors = validateProfileForm();
    setProfileErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingProfile(true);
    setError('');

    try {
      const year = Number(profileCarYear);
      await saveUser(identity.id, driverName.trim(), 'driver', location.regionId, location.districtId, location.labelUz);
      await saveDriverProfile(identity.id, profileCarModel, year, phone.trim());

      setDriverProfile({
        name: driverName.trim(),
        carModel: profileCarModel,
        carYear: year,
        phone: phone.trim(),
        ratingAvg: 0,
        ratingTrips: 0,
      });
      setNeedsProfileSetup(false);
      hapticSuccess();
    } catch (err) {
      console.error('save driver profile error:', err);
      setError("Profilni saqlashda xatolik. Qayta urinib ko'ring.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    if (!districtId) {
      return;
    }

    setActionLoading(requestId);
    setError('');

    try {
      const identity = getTelegramIdentity();
      await selectDriver(requestId, identity.id);
      await applyToRequest(requestId, {
        driverId: identity.id,
        pricePerSeat: Number(pricePerSeat) || 0,
        departureWindow,
      });
      hapticSuccess();
      await loadIncomingRequests();
    } catch (err) {
      console.error('Accept error:', err);
      setError('Qabul qilishda xatolik');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    setError('');

    try {
      const { error: rejectError } = await supabase
        .from('passenger_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (rejectError) {
        throw rejectError;
      }

      hapticTap();
      await loadIncomingRequests();
    } catch (err) {
      console.error('Reject error:', err);
      setError('Rad etishda xatolik');
    } finally {
      setActionLoading(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
        <Card>
          <Spinner />
          <p className="mt-2 text-center text-sm font-bold text-slate-600">Yuklanmoqda...</p>
        </Card>
      </div>
    );
  }

  if (needsProfileSetup) {
    return (
      <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
        <Card>
          <h2 className="text-lg font-extrabold">Haydovchi profili</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">Safarni boshlash uchun ma'lumotlarni kiriting.</p>

          <div className="mt-4 space-y-3">
            <div>
              <FieldLabel>Ism familiya</FieldLabel>
              <Input value={driverName} onChange={(event) => setDriverName(event.target.value)} />
              {profileErrors.name ? <p className="mt-1 text-xs font-bold text-red-500">{profileErrors.name}</p> : null}
            </div>

            <div>
              <FieldLabel>Telefon raqam</FieldLabel>
              <Input
                inputMode="tel"
                placeholder="+998 XX XXX XX XX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              {profileErrors.phone ? <p className="mt-1 text-xs font-bold text-red-500">{profileErrors.phone}</p> : null}
            </div>

            <div>
              <FieldLabel>Mashina modeli</FieldLabel>
              <Select value={profileCarModel} onChange={(event) => setProfileCarModel(event.target.value)}>
                <option value="">Tanlang</option>
                {carModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
              {profileErrors.carModel ? <p className="mt-1 text-xs font-bold text-red-500">{profileErrors.carModel}</p> : null}
            </div>

            <div>
              <FieldLabel>Mashina yili</FieldLabel>
              <Input
                inputMode="numeric"
                min={2000}
                max={2025}
                placeholder="2020"
                type="number"
                value={profileCarYear}
                onChange={(event) => setProfileCarYear(event.target.value)}
              />
              {profileErrors.carYear ? <p className="mt-1 text-xs font-bold text-red-500">{profileErrors.carYear}</p> : null}
            </div>

            <div>
              <FieldLabel>Mashina rangi</FieldLabel>
              <Input placeholder="Masalan: oq" value={carColor} onChange={(event) => setCarColor(event.target.value)} />
            </div>

            <Button className="w-full" onClick={() => void submitDriverProfile()} disabled={savingProfile}>
              Profilni saqlash →
            </Button>
            {savingProfile ? <p className="text-xs font-bold text-slate-500">Yuklanmoqda...</p> : null}
            {error ? <p className="text-xs font-bold text-red-500">{error}</p> : null}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
      {driverProfile ? (
        <Card>
          <p className="text-lg font-extrabold">Salom, {driverProfile.name}! 👋</p>
          <p className="mt-1 text-sm font-bold text-slate-600">
            🚗 {driverProfile.carModel} {driverProfile.carYear}
          </p>
          <p className="mt-2 text-xs font-extrabold text-amber-500">
            ⭐ {driverProfile.ratingAvg.toFixed(1)} · {driverProfile.ratingTrips} safar
          </p>
        </Card>
      ) : null}

      {mode === 'new' ? (
        <Card>
          <h2 className="text-lg font-extrabold">E'lon berish</h2>
          <div className="mt-4 space-y-3">
          <div>
            <FieldLabel>Qayerdan</FieldLabel>
            <div className="rounded-2xl bg-slate-50 px-3 py-4 text-sm font-extrabold">{location?.labelUz}</div>
          </div>

          <div>
            <FieldLabel>Qayerga</FieldLabel>
            <Select value={destinationRegionId} onChange={(event) => setDestinationRegionId(event.target.value as RegionId)}>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.labelUz}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <FieldLabel>Jo'nash</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {(['Hozir', '30 daqiqada', '1 soatda', '2 soatda'] as const).map((item) => (
                <Button key={item} variant={departureWindow === item ? 'primary' : 'secondary'} onClick={() => setDepartureWindow(item)}>
                  {item}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Bo'sh joy</FieldLabel>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <Button
                  key={count}
                  variant={seatsAvailable === count ? 'primary' : 'secondary'}
                  onClick={() => setSeatsAvailable(count)}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Narx</FieldLabel>
              <Input inputMode="numeric" value={pricePerSeat} onChange={(event) => setPricePerSeat(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Old joy +</FieldLabel>
              <Input inputMode="numeric" value={frontSeatExtra} onChange={(event) => setFrontSeatExtra(event.target.value)} />
            </div>
          </div>

          <div>
            <FieldLabel>Chekish</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={!smoking ? 'primary' : 'secondary'} onClick={() => setSmoking(false)}>
                Chekmayman
              </Button>
              <Button variant={smoking ? 'primary' : 'secondary'} onClick={() => setSmoking(true)}>
                Chekaman
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={() => void submitRide()} disabled={isLoading}>
            E'lon qilish →
          </Button>
          {isLoading ? <p className="text-xs font-bold text-slate-500">Yuklanmoqda...</p> : null}
          {error ? <p className="text-xs font-bold text-red-500">Xatolik. Qayta urinib ko'ring.</p> : null}
          </div>
        </Card>
      ) : null}

      {mode === 'home' ? (
        <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Kelgan so'rovlar</h2>
          <Pill tone="blue">{incomingRequests.length} ta</Pill>
        </div>
        <div className="space-y-3">
          {isLoading && incomingRequests.length === 0 ? (
            <Card>
              <Spinner />
              <p className="mt-2 text-center text-sm font-bold text-slate-600">Yuklanmoqda...</p>
            </Card>
          ) : error ? (
            <EmptyState title="Xatolik" text="Xatolik. Qayta urinib ko'ring." />
          ) : incomingRequests.length === 0 ? (
            <EmptyState title="Hozircha so'rovlar yo'q" text="Yangilanishlarni kuting..." />
          ) : (
            incomingRequests.map((request) => (
              <IncomingRequestCard
                key={request.id}
                request={request}
                onAccept={() => void handleAccept(request.id)}
                onReject={() => void handleReject(request.id)}
                             actionLoading={actionLoading}
              />
            ))
          )}
        </div>
        </section>
      ) : null}
    </div>
  );
};

const IncomingRequestCard = ({
  request,
  onAccept,
  onReject,
  actionLoading,
}: {
  request: PassengerRequest;
  onAccept: () => void;
  onReject: () => void;
  actionLoading: string | null;
}) => (
  <Card>
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-primary">
        <Bell size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-extrabold">{request.passengerName}</p>
            <p className="text-xs font-bold text-slate-500">{request.origin.labelUz}</p>
          </div>
          <Pill tone="green">{request.seats} joy</Pill>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-700">{requestRoute(request)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {request.preferences.length === 0 ? (
            <Pill tone="gray">Tanlov yo'q</Pill>
          ) : (
            request.preferences.map((preference) => (
              <Pill key={preference} tone="gray">
                {preferenceLabel(preference)}
              </Pill>
            ))
          )}
        </div>
        <p className="mt-3 text-xs font-bold text-slate-500">Hozirgina yuborildi</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button 
            onClick={onAccept}
            disabled={actionLoading === request.id}
          >
            <span className="inline-flex items-center justify-center gap-1">
              {actionLoading === request.id ? '...' : 'Qabul qilish'} <Check size={16} />
            </span>
          </Button>
          <Button 
            variant="danger" 
            onClick={onReject}
            disabled={actionLoading === request.id}
          >
            <span className="inline-flex items-center justify-center gap-1">
              {actionLoading === request.id ? '...' : 'Rad etish'} <X size={16} />
            </span>
          </Button>
        </div>
      </div>
    </div>
  </Card>
);
