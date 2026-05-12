import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import {
  applyToRequest,
  getMatchingRequests,
  saveUser,
  selectDriver,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { getTelegramIdentity, hapticSuccess, hapticTap } from '../lib/telegram';
import { toUzbekErrorMessage } from '../lib/errors';
import { useSafargoStore } from '../store/useSafargoStore';
import type { DriverApplication, PassengerRequest } from '../types/safargo';
import {
  Button,
  Card,
  EmptyState,
  FieldLabel,
  Input,
  LoadingState,
  MissingLocationState,
  Pill,
  Select,
  Toast,
} from '../components/ui';
import { preferenceLabel, requestRoute } from '../utils/format';

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

type DriverScreenProps = {
  onGoHome: () => void;
  onGoProfile: () => void;
};

const departureWindows: DriverApplication['departureWindow'][] = ['Hozir', '30 daqiqada', '1 soatda', '2 soatda'];

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const readDismissedRequestIds = (driverId: string): Set<string> => {
  const raw = window.localStorage.getItem(`safargo-rejected-${driverId}`);

  if (!raw) {
    return new Set<string>();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((item): item is string => typeof item === 'string'))
      : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

export const DriverScreen = ({ onGoHome, onGoProfile }: DriverScreenProps) => {
  const location = useSafargoStore((state) => state.location);
  const currentUser = useSafargoStore((state) => state.currentUser);
  const identity = useMemo(() => getTelegramIdentity(), []);
  const districtId = location?.districtId;

  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [departureWindow, setDepartureWindow] = useState<DriverApplication['departureWindow']>('Hozir');
  const [pricePerSeat, setPricePerSeat] = useState('120000');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileSummary | null>(null);
  const [driverName, setDriverName] = useState(identity.name);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<Set<string>>(() =>
    readDismissedRequestIds(identity.id),
  );
  const [toast, setToast] = useState<string | undefined>();

  const hasPhone = Boolean(driverProfile?.phone.trim());

  const loadDriverProfile = useCallback(async () => {
    setProfileLoading(true);
    setError('');

    try {
      const [{ data: profile, error: profileError }, { data: user, error: userError }] = await Promise.all([
        supabase
          .from('driver_profiles')
          .select('car_model,car_year,phone,rating_avg,rating_trips')
          .eq('id', identity.id)
          .maybeSingle<DbDriverProfileSummary>(),
        supabase.from('users').select('name').eq('id', identity.id).maybeSingle<DbDriverUserSummary>(),
      ]);

      if (profileError) throw profileError;
      if (userError) throw userError;

      const profileName = user?.name?.trim() || identity.name;

      if (!profile) {
        setDriverProfile(null);
        setDriverName(profileName);
        return;
      }

      const summary: DriverProfileSummary = {
        name: profileName,
        carModel: profile.car_model?.trim() || "Noma'lum",
        carYear: profile.car_year ?? 2020,
        phone: profile.phone?.trim() ?? '',
        ratingAvg: toNumber(profile.rating_avg),
        ratingTrips: profile.rating_trips ?? 0,
      };

      setDriverProfile(summary);
      setDriverName(summary.name);
    } catch (err) {
      console.error('Haydovchi profilini yuklashda xatolik:', err);
      setError(toUzbekErrorMessage(err));
      setDriverProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [identity.id, identity.name]);

  const loadIncomingRequests = useCallback(async () => {
    if (!districtId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMatchingRequests(districtId, identity.id);
      setRequests(data);
    } catch (err) {
      console.error("So'rovlarni yuklashda xatolik:", err);
      setError(toUzbekErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [districtId, identity.id]);

  useEffect(() => {
    void loadDriverProfile();
  }, [loadDriverProfile]);

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
          event: '*',
          schema: 'public',
          table: 'passenger_requests',
          filter: `origin_district_id=eq.${districtId}`,
        },
        () => {
          void loadIncomingRequests();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_applications',
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

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(undefined), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const incomingRequests = requests.filter(
    (request) => request.status === 'active' && !dismissedRequestIds.has(request.id),
  );

  const handleAccept = async (requestId: string) => {
    if (!location) {
      setError('Joylashuv aniqlanmadi.');
      return;
    }

    setActionLoading(requestId);
    setError('');

    try {
      const trimmedName = driverName.trim() || identity.name;
      await saveUser(identity.id, trimmedName, 'driver', location.regionId, location.districtId, location.labelUz);
      await applyToRequest(requestId, {
        driverId: identity.id,
        driverName: trimmedName,
        pricePerSeat: Number(pricePerSeat) || 0,
        departureWindow,
      });
      await selectDriver(requestId, identity.id);
      setToast("✅ Yo'lovchi qabul qilindi!");
      hapticSuccess();
      await loadIncomingRequests();
    } catch (err) {
      console.error('Qabul qilishda xatolik:', err);
      setError(toUzbekErrorMessage(err, 'Qabul qilishda xatolik'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (requestId: string) => {
    const confirmed = window.confirm("Rad etishga ishonchingiz komilmi?");

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(requestId);
      const nextDismissed = new Set(dismissedRequestIds);
      nextDismissed.add(requestId);
      setDismissedRequestIds(nextDismissed);
      window.localStorage.setItem(`safargo-rejected-${identity.id}`, JSON.stringify([...nextDismissed]));
      hapticTap();
    } catch (err) {
      console.error('Rad etishda xatolik:', err);
      setError(toUzbekErrorMessage(err, 'Rad etishda xatolik'));
    } finally {
      setActionLoading(null);
    }
  };

  if (!location || !location.regionId) {
    return <MissingLocationState onBackHome={onGoHome} />;
  }

  if (profileLoading) {
    return (
      <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
        <LoadingState />
      </div>
    );
  }

  const displayName = driverProfile?.name ?? currentUser?.name ?? driverName;
  const districtLabel = location.labelUz.split(',').at(-1)?.trim() || location.labelUz;

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5 pb-24">
      {toast ? <Toast message={toast} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">
            Salom, {displayName}!{driverProfile ? ' 🚗' : ''}
          </p>
          {driverProfile ? (
            <h2 className="mt-1 text-2xl font-extrabold leading-tight">
              {driverProfile.carModel} {driverProfile.carYear} · {districtLabel}
            </h2>
          ) : (
            <button
              className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-left text-sm font-extrabold text-amber-700"
              onClick={onGoProfile}
              type="button"
            >
              ⚠️ Profilingizni to'ldiring →
            </button>
          )}
        </div>
        <Button className="shrink-0 px-3 py-2 text-xs" onClick={() => void loadIncomingRequests()} variant="secondary">
          🔄 Yangilash
        </Button>
      </div>

      {!driverProfile ? (
        <Card className="border border-amber-100 bg-amber-50">
          <p className="text-sm font-extrabold text-amber-700">Profilingizni to'ldiring</p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            Yo'lovchilar mashina modeli, yil va telefon raqamingizni ko'radi.
          </p>
          <Button className="mt-3 w-full" onClick={onGoProfile} variant="secondary">
            Profilni to'ldirish →
          </Button>
        </Card>
      ) : !hasPhone ? (
        <Card className="border border-red-100 bg-red-50">
          <p className="text-sm font-extrabold text-red-600">📞 Telefon qo'shilmagan</p>
          <Button className="mt-3 w-full" onClick={onGoProfile} variant="secondary">
            Profilni to'ldiring →
          </Button>
          <button className="mt-2 text-xs font-extrabold text-red-600 underline" onClick={onGoProfile} type="button">
            Profil sahifasiga o'tish
          </button>
        </Card>
      ) : null}

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Narx</FieldLabel>
            <Input
              inputMode="numeric"
              placeholder="120000"
              value={pricePerSeat}
              onChange={(event) => setPricePerSeat(event.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Jo'nash</FieldLabel>
            <Select
              value={departureWindow}
              onChange={(event) => setDepartureWindow(event.target.value as DriverApplication['departureWindow'])}
            >
              {departureWindows.map((windowLabel) => (
                <option key={windowLabel} value={windowLabel}>
                  {windowLabel}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Kelgan so'rovlar</h2>
          {incomingRequests.length > 0 ? <Pill tone="blue">{incomingRequests.length} ta yangi</Pill> : null}
        </div>
        <div className="space-y-3">
          {isLoading && incomingRequests.length === 0 ? (
            <LoadingState />
          ) : error ? (
            <EmptyState title="Xatolik" text={error} />
          ) : incomingRequests.length === 0 ? (
            <EmptyState
              title="📭 Hozircha so'rovlar yo'q"
              text="Sizning tumaningizdan yangi so'rovlar kelganda bu yerda ko'rinadi"
            />
          ) : (
            incomingRequests.map((request) => (
              <IncomingRequestCard
                actionLoading={actionLoading}
                acceptDisabled={!hasPhone}
                currentUserId={identity.id}
                key={request.id}
                onAccept={() => void handleAccept(request.id)}
                onReject={() => handleReject(request.id)}
                request={request}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const IncomingRequestCard = ({
  request,
  currentUserId,
  onAccept,
  onReject,
  actionLoading,
  acceptDisabled,
}: {
  request: PassengerRequest;
  currentUserId: string;
  onAccept: () => void;
  onReject: () => void;
  actionLoading: string | null;
  acceptDisabled: boolean;
}) => {
  const alreadyApplied = request.applicants.some((application) => application.driverId === currentUserId);
  const isBusy = actionLoading === request.id;

  return (
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
            <Pill tone="green">{request.seats} ta joy so'ralgan</Pill>
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
            {alreadyApplied ? (
              <Button className="col-span-2 bg-slate-100 text-slate-500 shadow-none" disabled variant="secondary">
                ✓ Ariza berildi
              </Button>
            ) : (
              <>
                <Button disabled={isBusy || acceptDisabled} onClick={onAccept}>
                  <span className="inline-flex items-center justify-center gap-1">
                    {isBusy ? '...' : 'Qabul qilish'} <Check size={16} />
                  </span>
                </Button>
                <Button disabled={isBusy} onClick={onReject} variant="danger">
                  <span className="inline-flex items-center justify-center gap-1">
                    {isBusy ? '...' : 'Rad etish'} <X size={16} />
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
