import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDriverOrders, getMyRequests, type DriverOrder, completeRide, submitRating } from '../lib/api';
import { getTelegramIdentity, hapticSuccess } from '../lib/telegram';
import { toUzbekErrorMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { useSafargoStore } from '../store/useSafargoStore';
import type { DriverProfile, PassengerRequest } from '../types/safargo';
import { Button, Card, EmptyState, LoadingState, Pill } from '../components/ui';
import { getRegionLabel } from '../data/locations';
import { money, requestRoute } from '../utils/format';

type Status = PassengerRequest['status'];

const statusTone: Record<Status, 'blue' | 'green' | 'gray' | 'red'> = {
  active: 'blue',
  confirmed: 'green',
  completed: 'gray',
  cancelled: 'red',
};

const statusLabel: Record<Status, string> = {
  active: 'Faol',
  confirmed: 'Tasdiqlandi',
  completed: 'Yakunlandi',
  cancelled: 'Bekor',
};

export const OrdersScreen = () => {
  const role = useSafargoStore((state) => state.role);
  const identity = useMemo(() => getTelegramIdentity(), []);
  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driverOrders, setDriverOrders] = useState<DriverOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completeConfirm, setCompleteConfirm] = useState<string | undefined>();
  const [ratingTarget, setRatingTarget] = useState<string | undefined>();
  const [stars, setStars] = useState(5);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      if (role === 'driver') {
        const orders = await getDriverOrders(identity.id);
        setDriverOrders(orders);
        setRequests([]);
        setDrivers([]);
      } else {
        const data = await getMyRequests(identity.id);
        setRequests(data.requests);
        setDrivers(data.drivers);
        setDriverOrders([]);
      }
    } catch (err) {
      console.error('loadOrders error:', err);
      setError(toUzbekErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [identity.id, role]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const filter = role === 'driver' ? `selected_driver_id=eq.${identity.id}` : `passenger_id=eq.${identity.id}`;
    const channel = supabase
      .channel(`orders-${role ?? 'unknown'}-${identity.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'passenger_requests',
          filter,
        },
        () => {
          void loadOrders();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [identity.id, loadOrders, role]);

  const handleCompleteRide = async (requestId: string): Promise<void> => {
    setIsSubmitting(true);
    setError('');

    try {
      await completeRide(requestId);
      await loadOrders();
      setCompleteConfirm(undefined);
      hapticSuccess();
    } catch (err) {
      console.error('completeRide error:', err);
      setError(toUzbekErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateDriver = async (requestId: string, driverId: string): Promise<void> => {
    setIsSubmitting(true);
    setError('');

    try {
      await submitRating(
        requestId,
        driverId,
        identity.id,
        stars,
        stars,
        stars,
        stars,
      );
      await loadOrders();
      setRatingTarget(undefined);
      hapticSuccess();
    } catch (err) {
      console.error('submitRating error:', err);
      setError(toUzbekErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const content =
    role === 'driver' ? (
      <DriverOrdersList
        orders={driverOrders}
        completeConfirm={completeConfirm}
        isSubmitting={isSubmitting}
        onCompleteConfirm={setCompleteConfirm}
        onCompleteRide={handleCompleteRide}
      />
    ) : (
      <PassengerOrdersList
        requests={requests}
        drivers={drivers}
        completeConfirm={completeConfirm}
        ratingTarget={ratingTarget}
        stars={stars}
        isSubmitting={isSubmitting}
        onCompleteConfirm={setCompleteConfirm}
        onRatingTarget={setRatingTarget}
        onStarsChange={setStars}
        onCompleteRide={handleCompleteRide}
        onRateDriver={handleRateDriver}
      />
    );

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
      <div>
        <h2 className="text-xl font-extrabold">Arizalarim</h2>
        <p className="text-sm font-bold text-slate-500">Safarlar tarixi va holati</p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState title="Xatolik" text={error} />
      ) : (
        content
      )}
    </div>
  );
};

const PassengerOrdersList = ({
  requests,
  drivers,
  completeConfirm,
  ratingTarget,
  stars,
  isSubmitting,
  onCompleteConfirm,
  onRatingTarget,
  onStarsChange,
  onCompleteRide,
  onRateDriver,
}: {
  requests: PassengerRequest[];
  drivers: DriverProfile[];
  completeConfirm: string | undefined;
  ratingTarget: string | undefined;
  stars: number;
  isSubmitting: boolean;
  onCompleteConfirm: (id: string | undefined) => void;
  onRatingTarget: (id: string | undefined) => void;
  onStarsChange: (count: number) => void;
  onCompleteRide: (requestId: string) => Promise<void>;
  onRateDriver: (requestId: string, driverId: string) => Promise<void>;
}) => {
  if (requests.length === 0) {
    return <EmptyState title="Hali safarlar yo'q" text="Safar yaratilganda shu yerda ko'rinadi." />;
  }

  return (
    <div className="space-y-3 pb-4">
      {requests.map((request) => {
        const selectedDriver = drivers.find((driver) => driver.id === request.selectedDriverId);

        return (
          <Card key={request.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold">{requestRoute(request)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {request.dateISO} · {request.timeApprox}
                </p>
              </div>
              <Pill tone={statusTone[request.status]}>{statusLabel[request.status]}</Pill>
            </div>

            {request.status === 'confirmed' && selectedDriver ? (
              <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-sm font-extrabold text-primary">
                🚗 {selectedDriver.name} · {selectedDriver.phone}
              </p>
            ) : null}

            {request.status === 'confirmed' ? (
              <div className="mt-3 grid gap-2">
                {completeConfirm === request.id ? (
                  <div className="space-y-2 rounded-2xl bg-amber-50 p-3">
                    <p className="text-sm font-extrabold text-amber-900">Safarni yakunlashga ishonchingiz komilmi?</p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => void onCompleteRide(request.id)}
                        disabled={isSubmitting}
                      >
                        Ha, yakunla
                      </Button>
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => onCompleteConfirm(undefined)}
                        disabled={isSubmitting}
                      >
                        Bekor qil
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full border-2 border-green-500 text-green-600"
                    variant="secondary"
                    onClick={() => onCompleteConfirm(request.id)}
                  >
                    ✓ Safar yakunlandi
                  </Button>
                )}
              </div>
            ) : null}

            {request.status === 'completed' && selectedDriver ? (
              <div>
                {ratingTarget === request.id ? (
                  <div className="mt-3 space-y-3 rounded-2xl bg-amber-50 p-3">
                    <p className="text-sm font-extrabold text-amber-900">
                      {selectedDriver.name} ni baholang (⭐ {stars})
                    </p>
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((count) => (
                        <button
                          key={count}
                          className={`text-2xl transition ${
                            count <= stars ? 'opacity-100' : 'opacity-30'
                          }`}
                          onClick={() => onStarsChange(count)}
                          type="button"
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => void onRateDriver(request.id, selectedDriver.id)}
                        disabled={isSubmitting}
                      >
                        Yuborish
                      </Button>
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => onRatingTarget(undefined)}
                        disabled={isSubmitting}
                      >
                        Bekor qil
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="mt-3 w-full" variant="secondary" onClick={() => onRatingTarget(request.id)}>
                    ⭐ Baholash →
                  </Button>
                )}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
};

const DriverOrdersList = ({
  orders,
  completeConfirm,
  isSubmitting,
  onCompleteConfirm,
  onCompleteRide,
}: {
  orders: DriverOrder[];
  completeConfirm: string | undefined;
  isSubmitting: boolean;
  onCompleteConfirm: (id: string | undefined) => void;
  onCompleteRide: (requestId: string) => Promise<void>;
}) => {
  if (orders.length === 0) {
    return <EmptyState title="Hali safarlar yo'q" text="Qabul qilingan so'rovlar shu yerda ko'rinadi." />;
  }

  return (
    <div className="space-y-3 pb-4">
      {orders.map(({ request, priceEarned }) => (
        <Card key={request.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-extrabold">{request.passengerName}</p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                {request.origin.labelUz} → {getRegionLabel(request.destinationRegionId)}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {request.dateISO} · {request.timeApprox}
              </p>
            </div>
            <Pill tone={statusTone[request.status]}>{statusLabel[request.status]}</Pill>
          </div>
          <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-700">
            Daromad: {money(priceEarned)}
          </p>

          {request.status === 'confirmed' ? (
            <div className="mt-3 grid gap-2">
              {completeConfirm === request.id ? (
                <div className="space-y-2 rounded-2xl bg-amber-50 p-3">
                  <p className="text-sm font-extrabold text-amber-900">Safarni yakunlashga ishonchingiz komilmi?</p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => void onCompleteRide(request.id)}
                      disabled={isSubmitting}
                    >
                      Ha, yakunla
                    </Button>
                    <Button
                      className="flex-1"
                      variant="secondary"
                      onClick={() => onCompleteConfirm(undefined)}
                      disabled={isSubmitting}
                    >
                      Bekor qil
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full border-2 border-green-500 text-green-600"
                  variant="secondary"
                  onClick={() => onCompleteConfirm(request.id)}
                >
                  ✓ Safar yakunlandi
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
};
