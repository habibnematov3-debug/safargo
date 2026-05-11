import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Bell, Check, X } from 'lucide-react';
import { regions } from '../data/locations';
import { applyToRequest, getMatchingRequests, saveDriverProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getTelegramIdentity, hapticSuccess } from '../lib/telegram';
import { useSafargoStore } from '../store/useSafargoStore';
import type { DriverApplication, PassengerRequest, RegionId } from '../types/safargo';
import { Button, Card, EmptyState, FieldLabel, Input, Pill, Select, Spinner } from '../components/ui';
import { preferenceLabel, requestRoute } from '../utils/format';

export const DriverScreen = () => {
  const location = useSafargoStore((state) => state.location);
  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [destinationRegionId, setDestinationRegionId] = useState<RegionId>('toshkent');
  const [departureWindow, setDepartureWindow] = useState<DriverApplication['departureWindow']>('Hozir');
  const [seatsAvailable, setSeatsAvailable] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState('120000');
  const [frontSeatExtra, setFrontSeatExtra] = useState('20000');
  const [smoking, setSmoking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = async (districtId: string) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getMatchingRequests(districtId);
      setRequests(data);
    } catch {
      setError("Xatolik. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const districtId = location?.districtId;

    if (!districtId) {
      setRequests([]);
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    void loadRequests(districtId);

    const channel: RealtimeChannel = supabase
      .channel('new-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'passenger_requests',
          filter: `origin_district_id=eq.${districtId}`,
        },
        () => {
          if (active) {
            void loadRequests(districtId);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [location?.districtId]);

  const incomingRequests = requests.filter((request) => request.status === 'active');

  const submitRide = async () => {
    if (!location) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const identity = getTelegramIdentity();
      await saveDriverProfile(identity.id, 'Noma\'lum', 2020, '+998 90 000 00 00');
      hapticSuccess();
    } catch {
      setError("Xatolik. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  const accept = async (requestId: string) => {
    if (!location) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const identity = getTelegramIdentity();
      await applyToRequest(requestId, {
        driverId: identity.id,
        pricePerSeat: Number(pricePerSeat) || 0,
        departureWindow,
      });
      await loadRequests(location.districtId);
      hapticSuccess();
    } catch {
      setError("Xatolik. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
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
            <EmptyState title="Hozircha so'rovlar yo'q" text="Sizning tumaningizdan yo'lovchi chiqsa shu yerda ko'rinadi." />
          ) : (
            incomingRequests.map((request) => (
              <IncomingRequestCard
                key={request.id}
                request={request}
                onAccept={() => void accept(request.id)}
                onReject={() => setRequests((current) => current.filter((item) => item.id !== request.id))}
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
  onAccept,
  onReject,
}: {
  request: PassengerRequest;
  onAccept: () => void;
  onReject: () => void;
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
          <Button onClick={onAccept}>
            <span className="inline-flex items-center justify-center gap-1">
              Qabul qilish <Check size={16} />
            </span>
          </Button>
          <Button variant="danger" onClick={onReject}>
            <span className="inline-flex items-center justify-center gap-1">
              Rad etish <X size={16} />
            </span>
          </Button>
        </div>
      </div>
    </div>
  </Card>
);
