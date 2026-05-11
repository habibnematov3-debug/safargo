import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDriverOrders, getMyRequests, type DriverOrder } from '../lib/api';
import { getTelegramIdentity } from '../lib/telegram';
import { useSafargoStore } from '../store/useSafargoStore';
import type { DriverProfile, PassengerRequest } from '../types/safargo';
import { Button, Card, EmptyState, Pill, Spinner } from '../components/ui';
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
  const [error, setError] = useState('');

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
      setError("Xatolik. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  }, [identity.id, role]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const content =
    role === 'driver' ? (
      <DriverOrdersList orders={driverOrders} />
    ) : (
      <PassengerOrdersList requests={requests} drivers={drivers} />
    );

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
      <div>
        <h2 className="text-xl font-extrabold">Arizalarim</h2>
        <p className="text-sm font-bold text-slate-500">Safarlar tarixi va holati</p>
      </div>

      {isLoading ? (
        <Card>
          <Spinner />
          <p className="mt-2 text-center text-sm font-bold text-slate-600">Yuklanmoqda...</p>
        </Card>
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
}: {
  requests: PassengerRequest[];
  drivers: DriverProfile[];
}) => {
  if (requests.length === 0) {
    return <EmptyState title="Hali safarlar yo'q" text="Safar yaratilganda shu yerda ko'rinadi." />;
  }

  return (
    <div className="space-y-3">
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
                Haydovchi: {selectedDriver.name}
              </p>
            ) : null}

            {request.status === 'completed' ? (
              <Button className="mt-3 w-full" variant="secondary">
                Baholash →
              </Button>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
};

const DriverOrdersList = ({ orders }: { orders: DriverOrder[] }) => {
  if (orders.length === 0) {
    return <EmptyState title="Hali safarlar yo'q" text="Qabul qilingan so'rovlar shu yerda ko'rinadi." />;
  }

  return (
    <div className="space-y-3">
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
        </Card>
      ))}
    </div>
  );
};
