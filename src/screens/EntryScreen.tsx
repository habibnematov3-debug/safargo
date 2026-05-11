import { useEffect, useMemo, useState } from 'react';
import { Car, Compass, MapPin } from 'lucide-react';
import { buildLocation, defaultLocation, districts, getDistrictsByRegion, regions } from '../data/locations';
import { reverseGeocode } from '../lib/geocode';
import { saveUser } from '../lib/api';
import { getTelegramUserName, requestTelegramLocation } from '../lib/telegram';
import { useSafargoStore } from '../store/useSafargoStore';
import type { DistrictId, RegionId, UserRole } from '../types/safargo';
import { Button, Card, FieldLabel, Select, Spinner } from '../components/ui';

export const EntryScreen = () => {
  const location = useSafargoStore((state) => state.location);
  const role = useSafargoStore((state) => state.role);
  const setLocation = useSafargoStore((state) => state.setLocation);
  const confirmLocation = useSafargoStore((state) => state.confirmLocation);
  const confirmedLocation = useSafargoStore((state) => state.confirmedLocation);
  const setRole = useSafargoStore((state) => state.setRole);

  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const [error, setError] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [regionId, setRegionId] = useState<RegionId>(defaultLocation.regionId);
  const [districtId, setDistrictId] = useState<DistrictId>(defaultLocation.districtId);

  const availableDistricts = useMemo(() => getDistrictsByRegion(regionId), [regionId]);

  useEffect(() => {
    const detect = async () => {
      try {
        const gps = await requestTelegramLocation();
        const resolved = await reverseGeocode(gps.latitude, gps.longitude);
        setLocation(resolved);
        setRegionId(resolved.regionId);
        setDistrictId(resolved.districtId);
        setManual(false);
        setManualMessage('');
      } catch (detectError) {
        setManual(true);
        const message = detectError instanceof Error ? detectError.message : '';
        setManualMessage(
          message === "GPS sekin ishladi. Qo'lda tanlang:"
            ? message
            : "GPS aniqlanmadi. Qo'lda tanlang:",
        );
      } finally {
        setLoading(false);
      }
    };

    detect();
  }, [setLocation]);

  const persistUser = async (nextRole: UserRole, nextLocation: { regionId: RegionId; districtId: DistrictId; labelUz: string }) => {
    setSavingUser(true);
    setError('');

    try {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const userId = String(tgUser?.id ?? 'dev-user-123');
      const userName = tgUser?.first_name ?? 'Foydalanuvchi';

      await saveUser(userId, userName, nextRole, nextLocation.regionId, nextLocation.districtId, nextLocation.labelUz);
    } catch {
      setError("Xatolik. Qayta urinib ko'ring.");
    } finally {
      setSavingUser(false);
    }
  };

  const saveManualLocation = async () => {
    const nextDistrictId = availableDistricts.some((district) => district.id === districtId)
      ? districtId
      : availableDistricts[0]?.id ?? districts[0].id;
    const nextLocation = buildLocation(regionId, nextDistrictId);
    setLocation(nextLocation);
    await persistUser(role ?? 'passenger', nextLocation);
    confirmLocation();
    setManual(false);
  };

  const confirmGpsLocation = async () => {
    confirmLocation();
    setManual(false);
    setManualMessage('');
  };

  const chooseRole = async (nextRole: UserRole) => {
    const nextLocation = location ?? defaultLocation;
    await persistUser(nextRole, nextLocation);
    setRole(nextRole);
  };

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
      <div>
        <p className="text-sm font-bold text-slate-500">Salom, {getTelegramUserName()}</p>
        <h2 className="mt-1 text-2xl font-extrabold leading-tight text-slate-950">Yo'lni qulay boshlaymiz</h2>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-primary">
            <MapPin size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900">Joylashuv</p>
            {loading ? (
              <div className="mt-5">
                <Spinner />
                <p className="mt-3 text-center text-xs font-bold text-slate-500">📡 Joylashuvingiz aniqlanmoqda...</p>
              </div>
            ) : confirmedLocation ? (
              <div className="mt-3 rounded-2xl bg-blue-50 px-3 py-4">
                <p className="text-lg font-extrabold leading-snug">📍 {location?.labelUz} tanlandi</p>
              </div>
            ) : manual ? (
              <div className="mt-4 space-y-3">
                {manualMessage ? <p className="text-xs font-bold text-slate-500">{manualMessage}</p> : null}
                {error ? <p className="text-xs font-bold text-red-500">{error}</p> : null}
                <div>
                  <FieldLabel>Viloyat</FieldLabel>
                  <Select
                    value={regionId}
                    onChange={(event) => {
                      const nextRegionId = event.target.value as RegionId;
                      const firstDistrict = getDistrictsByRegion(nextRegionId)[0];
                      setRegionId(nextRegionId);
                      setDistrictId(firstDistrict.id);
                    }}
                  >
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.labelUz}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel>Tuman</FieldLabel>
                  <Select value={districtId} onChange={(event) => setDistrictId(event.target.value)}>
                    {availableDistricts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.labelUz}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button className="w-full" onClick={saveManualLocation}>
                  Tasdiqlash ✓
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-lg font-extrabold leading-snug">📍 {location?.labelUz} — to'g'rimi?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={confirmGpsLocation}>Ha, to'g'ri ✓</Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setManual(true);
                      setManualMessage("Qo'lda tanlang:");
                    }}
                  >
                    O'zgartirish
                  </Button>
                </div>
              </div>
            )}
          </div>
          {savingUser ? <p className="mt-3 text-xs font-bold text-slate-500">Yuklanmoqda...</p> : null}
        </div>
      </Card>

      {confirmedLocation ? (
        <Card>
          <p className="text-sm font-extrabold text-slate-900">Rolni tanlang</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              className={`rounded-[22px] border p-4 text-left transition active:scale-[0.98] ${
                role === 'driver' ? 'border-primary bg-blue-50' : 'border-slate-100 bg-white'
              }`}
              onClick={() => void chooseRole('driver')}
            >
              <Car className="text-primary" size={28} />
              <p className="mt-4 text-lg font-extrabold">Haydovchiman</p>
            </button>
            <button
              className={`rounded-[22px] border p-4 text-left transition active:scale-[0.98] ${
                role === 'passenger' ? 'border-primary bg-blue-50' : 'border-slate-100 bg-white'
              }`}
              onClick={() => void chooseRole('passenger')}
            >
              <Compass className="text-primary" size={28} />
              <p className="mt-4 text-lg font-extrabold">Yo'lovchiman</p>
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
