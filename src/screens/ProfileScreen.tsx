import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPassengerStats, getDriverStats, updateUserRole, saveDriverProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getTelegramIdentity, hapticSuccess, type TelegramUser } from '../lib/telegram';
import { toUzbekErrorMessage } from '../lib/errors';
import { useSafargoStore } from '../store/useSafargoStore';
import { getRegionLabel } from '../data/locations';
import type { UserRole, UserLocation } from '../types/safargo';
import { Button, Card, EmptyState, LoadingState, MissingLocationState, Pill } from '../components/ui';

type CurrentUser = {
  id: string;
  name: string;
};

const carModels = ['Cobalt', 'Nexia 3', 'Gentra', 'Lacetti', 'Onix', 'Monza', 'Spark', 'Matiz', 'Damas', 'Boshqa'];

type TelegramIdentity = {
  id: string;
  name: string;
  user?: TelegramUser;
};

const ProgressBar = ({ percentage, label }: { percentage: number; label: string }) => {
  const filled = Math.min(Math.max(percentage, 0), 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-500">{filled}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-primary" style={{ width: `${filled}%` }} />
      </div>
    </div>
  );
};

export const ProfileScreen = ({ onGoHome }: { onGoHome: () => void }) => {
  const role = useSafargoStore((state) => state.role);
  const location = useSafargoStore((state) => state.location);
  const currentUser = useSafargoStore((state) => state.currentUser);
  const setRole = useSafargoStore((state) => state.setRole);
  const identity = useMemo(() => getTelegramIdentity(), []);

  if (!role) {
    return null;
  }

  if (!location || !location.regionId) {
    return <MissingLocationState onBackHome={onGoHome} />;
  }

  return role === 'passenger' ? (
    <PassengerProfile identity={identity} location={location} currentUser={currentUser} setRole={setRole} />
  ) : (
    <DriverProfile identity={identity} location={location} currentUser={currentUser} setRole={setRole} />
  );
};

const PassengerProfile = ({
  identity,
  location,
  currentUser,
  setRole,
}: {
  identity: TelegramIdentity;
  location: UserLocation;
  currentUser?: CurrentUser;
  setRole: (role: UserRole) => Promise<void>;
}) => {
  const [stats, setStats] = useState<{ total: number; completed: number; rated: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getPassengerStats(identity.id);
      setStats(data);
    } catch (err) {
      console.error("Yo'lovchi statistikasini yuklashda xatolik:", err);
      setError(toUzbekErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [identity.id]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const initials = currentUser?.name
    ?.split(' ')
    .map((part: string) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'SF';

  const locationLabel = location.labelUz;
  const regionLabel = getRegionLabel(location.regionId);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="safe-bottom space-y-4 px-5 py-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-extrabold text-white">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold">{currentUser?.name ?? 'Foydalanuvchi'}</h2>
            <Pill tone="blue">
              Yo'lovchi
            </Pill>
            <p className="mt-2 text-xs font-bold text-slate-500">
              📍 {locationLabel}, {regionLabel}
            </p>
          </div>
        </div>
      </div>

      {error ? <EmptyState title="Xatolik" text={error} /> : null}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-2xl font-extrabold text-primary">{stats?.total ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Jami safarlar</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-extrabold text-primary">{stats?.completed ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Yakunlangan</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-extrabold text-primary">{stats?.rated ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Baholar</p>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <div className="space-y-3">
          <SettingRow
            icon="🔄"
            label="Rolni o'zgartirish"
            onTap={async () => {
              const confirmed = window.confirm("Rolni o'zgartirishga ishonchingiz komilmi?");
              if (confirmed) {
                try {
                  await updateUserRole(identity.id, 'driver');
                  await setRole('driver');
                  hapticSuccess();
                } catch (err) {
                  console.error("Rolni o'zgartirishda xatolik:", err);
                }
              }
            }}
          />
          <SettingRow
            icon="📍"
            label="Joylashuvni yangilash"
            onTap={() => window.location.reload()}
          />
          <SettingRow
            icon="ℹ️"
            label="Safargo haqida"
            onTap={() => {
              alert('Safargo v1.0.0\n\nTelegram orqali bog\'laning:\n@Safargot_bot');
            }}
          />
        </div>
      </Card>
    </div>
  );
};

const DriverProfile = ({
  identity,
  location,
  currentUser,
  setRole,
}: {
  identity: TelegramIdentity;
  location: UserLocation;
  currentUser?: CurrentUser;
  setRole: (role: UserRole) => Promise<void>;
}) => {
  type DriverProfileDetails = {
    carModel: string;
    carYear: number;
    phone: string;
  };

  type DbDriverProfileDetails = {
    car_model: string | null;
    car_year: number | null;
    phone: string | null;
  };

  const [stats, setStats] = useState<{
    totalTrips: number;
    thisMonth: number;
    avgRating: number;
    onTimePct: number;
    carPct: number;
    mannersPct: number;
  } | null>(null);
  const [profileDetails, setProfileDetails] = useState<DriverProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editData, setEditData] = useState({ carModel: '', carYear: '', phone: '' });

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [data, profile] = await Promise.all([
        getDriverStats(identity.id),
        supabase
          .from('driver_profiles')
          .select('car_model,car_year,phone')
          .eq('id', identity.id)
          .maybeSingle<DbDriverProfileDetails>(),
      ]);

      if (profile.error) {
        throw profile.error;
      }

      setStats(data);
      setProfileDetails({
        carModel: profile.data?.car_model ?? 'Mashina ko\'rsatilmagan',
        carYear: profile.data?.car_year ?? 2020,
        phone: profile.data?.phone ?? '',
      });
    } catch (err) {
      console.error('Haydovchi statistikasini yuklashda xatolik:', err);
      setError(toUzbekErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [identity.id]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleSaveProfile = async () => {
    try {
      const year = Number(editData.carYear);
      await saveDriverProfile(identity.id, editData.carModel, year, editData.phone, currentUser?.name ?? identity.name);
      setProfileDetails({
        carModel: editData.carModel,
        carYear: year,
        phone: editData.phone,
      });
      setShowEditSheet(false);
      await loadStats();
      hapticSuccess();
    } catch (err) {
      console.error('Profilni saqlashda xatolik:', err);
      setError(toUzbekErrorMessage(err, "Profilni saqlashda xatolik. Qayta urinib ko'ring."));
    }
  };

  const initials = currentUser?.name
    ?.split(' ')
    .map((part: string) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'SF';

  const locationLabel = location.labelUz;
  const regionLabel = getRegionLabel(location.regionId);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="safe-bottom space-y-4 px-5 py-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-green-600 text-2xl font-extrabold text-white">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold">{currentUser?.name ?? 'Foydalanuvchi'}</h2>
            <Pill tone="green">
              Haydovchi
            </Pill>
            <p className="mt-2 text-xs font-bold text-slate-500">
              📍 {locationLabel}, {regionLabel}
            </p>
          </div>
        </div>
      </div>

      {error ? <EmptyState title="Xatolik" text={error} /> : null}

      {/* Rating Card */}
      <Card className="border-2 border-primary">
        {stats && stats.avgRating > 0 ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-extrabold">⭐ {stats.avgRating.toFixed(1)}</span>
              <div>
                <p className="text-sm font-bold text-slate-600">{stats.totalTrips} ta safar</p>
                <p className="text-xs font-bold text-slate-500">yakunlangan</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <ProgressBar percentage={stats.onTimePct} label="⏱ Vaqtida" />
              <ProgressBar percentage={stats.carPct} label="🚗 Mashina" />
              <ProgressBar percentage={stats.mannersPct} label="😊 Muomala" />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-extrabold text-slate-900">Hali baholar yo'q</p>
            <p className="mt-2 text-sm font-bold text-slate-500">Safarlarni yakunlang va baholar to'plang</p>
          </div>
        )}
      </Card>

      {/* Car Info */}
      <Card>
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-500">Mashina</p>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="font-extrabold">
              🚗 {profileDetails?.carModel ?? "Mashina ko'rsatilmagan"} {profileDetails?.carYear ?? ''}
            </p>
            {profileDetails?.phone ? (
              <p className="mt-1 text-sm font-bold text-slate-500">📞 {profileDetails.phone}</p>
            ) : (
              <p className="mt-1 text-sm font-extrabold text-red-600">📞 Telefon qo'shilmagan</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="green">✓ Tasdiqlangan</Pill>
            <Pill tone="gray">✦ Toza</Pill>
            <Pill tone="gray">⏱ O'z vaqtida</Pill>
          </div>
          <Button className="w-full" onClick={() => setShowEditSheet(true)}>
            Profilni tahrirlash →
          </Button>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-2xl font-extrabold text-primary">{stats?.totalTrips ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Jami safarlar</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-extrabold text-primary">{stats?.thisMonth ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Bu oy</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-extrabold text-primary">{stats?.avgRating.toFixed(1) ?? '0'}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Reyting</p>
        </Card>
      </div>

      {/* Earnings */}
      <Card className="bg-emerald-50">
        <p className="text-sm font-bold text-slate-500">Daromad (taxminiy)</p>
        <p className="mt-2 text-lg font-extrabold text-emerald-700">Bu oy: 2,400,000 so'm</p>
        <p className="mt-1 text-xs font-bold text-slate-500">* Haqiqiy narxlar bo'yicha hisoblanmagan</p>
      </Card>

      {/* Settings */}
      <Card>
        <div className="space-y-3">
          <SettingRow
            icon="🔄"
            label="Rolni o'zgartirish"
            onTap={async () => {
              const confirmed = window.confirm("Rolni o'zgartirishga ishonchingiz komilmi?");
              if (confirmed) {
                try {
                  await updateUserRole(identity.id, 'passenger');
                  await setRole('passenger');
                  hapticSuccess();
                } catch (err) {
                  console.error("Rolni o'zgartirishda xatolik:", err);
                }
              }
            }}
          />
          <SettingRow
            icon="📍"
            label="Joylashuvni yangilash"
            onTap={() => window.location.reload()}
          />
          <SettingRow
            icon="ℹ️"
            label="Safargo haqida"
            onTap={() => {
              alert('Safargo v1.0.0\n\nTelegram orqali bog\'laning:\n@Safargot_bot');
            }}
          />
        </div>
      </Card>

      {/* Edit Profile Bottom Sheet */}
      {showEditSheet ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40">
          <div
            className="flex-1"
            onClick={() => setShowEditSheet(false)}
          />
          <Card className="mx-5 mb-5 rounded-3xl">
            <h3 className="text-lg font-extrabold">Profilni tahrirlash</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600">Mashina modeli</label>
                <select
                  value={editData.carModel}
                  onChange={(e) => setEditData({ ...editData, carModel: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"
                >
                  <option value="">Tanlang</option>
                  {carModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600">Mashina yili</label>
                <input
                  type="number"
                  min={2000}
                  max={2025}
                  value={editData.carYear}
                  onChange={(e) => setEditData({ ...editData, carYear: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"
                  placeholder="2020"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600">Telefon raqam</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"
                  placeholder="+998 XX XXX XX XX"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setShowEditSheet(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={() => void handleSaveProfile()}>Saqlash →</Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

const SettingRow = ({ icon, label, onTap }: { icon: string; label: string; onTap: () => void }) => (
  <button className="flex items-center justify-between gap-3 py-2 text-left" onClick={onTap}>
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <p className="font-bold text-slate-900">{label}</p>
    </div>
    <span className="text-slate-400">→</span>
  </button>
);
