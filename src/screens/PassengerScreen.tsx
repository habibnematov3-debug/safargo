import { useMemo, useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { regions } from '../data/locations';
import { hapticSuccess } from '../lib/telegram';
import { regionDefaults, useSafargoStore } from '../store/useSafargoStore';
import type { DriverProfile, PassengerPreference, PassengerRequest, RegionId } from '../types/safargo';
import { Button, Card, EmptyState, FieldLabel, Pill, Select } from '../components/ui';
import { badgeLabel, money, preferenceLabel, requestRoute } from '../utils/format';

const preferenceOptions: { id: PassengerPreference; label: string }[] = [
  { id: 'front_seat', label: "💺 Old o'rindiq" },
  { id: 'non_smoking', label: '🚭 Chekmaslik' },
  { id: 'clean_car', label: '⭐ Toza mashina' },
  { id: 'women_only', label: '👩 Ayollar uchun' },
];

type PassengerView =
  | { name: 'list' }
  | { name: 'applicants'; requestId: string }
  | { name: 'confirmation'; requestId: string; driverId: string };

export const PassengerScreen = () => {
  const location = useSafargoStore((state) => state.location);
  const passengerRequests = useSafargoStore((state) => state.passengerRequests);
  const driverProfiles = useSafargoStore((state) => state.driverProfiles);
  const addPassengerRequest = useSafargoStore((state) => state.addPassengerRequest);
  const selectDriver = useSafargoStore((state) => state.selectDriver);
  const completeRequest = useSafargoStore((state) => state.completeRequest);
  const ratingTargetRequestId = useSafargoStore((state) => state.ratingTargetRequestId);
  const rateDriver = useSafargoStore((state) => state.rateDriver);

  const [view, setView] = useState<PassengerView>({ name: 'list' });
  const [destinationRegionId, setDestinationRegionId] = useState<RegionId>(regionDefaults.destinationRegionId);
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'pick'>('today');
  const [pickedDate, setPickedDate] = useState(regionDefaults.dateISO);
  const [timeApprox, setTimeApprox] = useState(regionDefaults.timeApprox);
  const [seats, setSeats] = useState(regionDefaults.seats);
  const [preferences, setPreferences] = useState<PassengerPreference[]>(regionDefaults.preferences);
  const [stars, setStars] = useState(5);

  const activeRequests = passengerRequests.filter((request) => request.status !== 'cancelled');
  const selectedRequest = view.name !== 'list' ? passengerRequests.find((request) => request.id === view.requestId) : undefined;
  const selectedDriver =
    view.name === 'confirmation' ? driverProfiles.find((driver) => driver.id === view.driverId) : undefined;
  const ratingRequest = useMemo(
    () => passengerRequests.find((request) => request.id === ratingTargetRequestId),
    [passengerRequests, ratingTargetRequestId],
  );

  const submitRequest = () => {
    if (!location) return;

    const dateISO =
      dateMode === 'today'
        ? new Date().toISOString().slice(0, 10)
        : dateMode === 'tomorrow'
          ? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
          : pickedDate;

    addPassengerRequest({
      passengerName: 'Siz',
      origin: location,
      destinationRegionId,
      dateISO,
      timeApprox,
      seats,
      preferences,
    });
    hapticSuccess();
  };

  const togglePreference = (preference: PassengerPreference) => {
    setPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference],
    );
  };

  if (view.name === 'applicants' && selectedRequest) {
    return (
      <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
        <Button className="w-fit px-3" variant="secondary" onClick={() => setView({ name: 'list' })}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="text-xl font-extrabold">Haydovchilar</h2>
          <p className="text-sm font-bold text-slate-500">{requestRoute(selectedRequest)}</p>
        </div>
        {selectedRequest.applicants.length === 0 ? (
          <EmptyState title="Hali ariza yo'q" text="Mos haydovchi chiqsa shu yerda ko'rinadi." />
        ) : (
          selectedRequest.applicants.map((application) => {
            const driver = driverProfiles.find((profile) => profile.id === application.driverId);
            return driver ? (
              <DriverApplicantCard
                key={application.id}
                driver={driver}
                request={selectedRequest}
                pricePerSeat={application.pricePerSeat}
                departureWindow={application.departureWindow}
                onSelect={() => {
                  selectDriver(selectedRequest.id, driver.id);
                  setView({ name: 'confirmation', requestId: selectedRequest.id, driverId: driver.id });
                }}
              />
            ) : null;
          })
        )}
      </div>
    );
  }

  if (view.name === 'confirmation' && selectedRequest && selectedDriver) {
    return (
      <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
        <Button className="w-fit px-3" variant="secondary" onClick={() => setView({ name: 'list' })}>
          <ArrowLeft size={16} />
        </Button>
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-extrabold text-white">
              {selectedDriver.initials}
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{selectedDriver.name}</h2>
              <p className="text-sm font-bold text-slate-500">
                {selectedDriver.carModel}, {selectedDriver.carYear}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-extrabold uppercase text-primary">Telefon</p>
            <p className="mt-1 text-xl font-extrabold text-slate-950">{selectedDriver.phone}</p>
          </div>
          <Button className="mt-4 w-full" onClick={() => completeRequest(selectedRequest.id)}>
            Safar yakunlandi ✓
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
      <Card>
        <h2 className="text-lg font-extrabold">So'rov yuborish</h2>
        <div className="mt-4 space-y-3">
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
            <FieldLabel>Sana</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['today', 'Bugun'],
                ['tomorrow', 'Ertaga'],
                ['pick', 'Sana'],
              ].map(([id, label]) => (
                <Button
                  key={id}
                  variant={dateMode === id ? 'primary' : 'secondary'}
                  onClick={() => setDateMode(id as 'today' | 'tomorrow' | 'pick')}
                >
                  {label}
                </Button>
              ))}
            </div>
            {dateMode === 'pick' ? (
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold"
                type="date"
                value={pickedDate}
                onChange={(event) => setPickedDate(event.target.value)}
              />
            ) : null}
          </div>

          <div>
            <FieldLabel>Vaqt</FieldLabel>
            <Select value={timeApprox} onChange={(event) => setTimeApprox(event.target.value)}>
              <option>07:00–09:00</option>
              <option>09:00–12:00</option>
              <option>12:00+</option>
            </Select>
          </div>

          <div>
            <FieldLabel>O'rindiq</FieldLabel>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <Button key={count} variant={seats === count ? 'primary' : 'secondary'} onClick={() => setSeats(count)}>
                  {count}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Tanlovlar</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {preferenceOptions.map((option) => (
                <Button
                  key={option.id}
                  variant={preferences.includes(option.id) ? 'ghost' : 'secondary'}
                  onClick={() => togglePreference(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={submitRequest}>
            So'rov yuborish →
          </Button>
        </div>
      </Card>

      {ratingRequest?.selectedDriverId ? (
        <Card>
          <h2 className="text-lg font-extrabold">Haydovchini baholang</h2>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((item) => (
              <button key={item} className="p-1" onClick={() => setStars(item)} aria-label={`${item} yulduz`}>
                <Star className={item <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} size={30} />
              </button>
            ))}
          </div>
          <Button className="mt-3 w-full" onClick={() => rateDriver(ratingRequest.selectedDriverId ?? '', stars)}>
            Baholash
          </Button>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-extrabold">Mening faol so'rovlarim</h2>
        <div className="space-y-3">
          {activeRequests.length === 0 ? (
            <EmptyState title="So'rov yo'q" text="Yangi safar uchun so'rov yuboring." />
          ) : (
            activeRequests.map((request) => (
              <PassengerRequestCard key={request.id} request={request} onOpen={() => setView({ name: 'applicants', requestId: request.id })} />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const DriverApplicantCard = ({
  driver,
  request,
  pricePerSeat,
  departureWindow,
  onSelect,
}: {
  driver: DriverProfile;
  request: PassengerRequest;
  pricePerSeat: number;
  departureWindow: string;
  onSelect: () => void;
}) => (
  <Card>
    <div className="flex gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary font-extrabold text-white">
        {driver.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-extrabold">{driver.name}</p>
            <p className="text-xs font-bold text-slate-500">
              {driver.carModel}, {driver.carYear}
            </p>
          </div>
          <Pill tone="green">⭐ {driver.rating.avg} · {driver.rating.trips}</Pill>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {driver.badges.map((badge) => (
            <Pill key={badge} tone="gray">
              {badgeLabel(badge)}
            </Pill>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-extrabold">
          <div className="rounded-2xl bg-slate-50 p-3">{money(pricePerSeat)}</div>
          <div className="rounded-2xl bg-slate-50 p-3">{departureWindow}</div>
        </div>
        <p className="mt-3 text-xs font-bold text-slate-500">{request.seats} kishi uchun mos</p>
        <Button className="mt-3 w-full" onClick={onSelect}>
          Tanlash →
        </Button>
      </div>
    </div>
  </Card>
);

const PassengerRequestCard = ({ request, onOpen }: { request: PassengerRequest; onOpen: () => void }) => (
  <button className="w-full text-left" onClick={onOpen}>
    <Card className="transition active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-extrabold">{requestRoute(request)}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {request.dateISO} · {request.timeApprox} · {request.seats} joy
          </p>
        </div>
        <Pill tone={request.status === 'active' ? 'green' : 'gray'}>
          {request.status === 'active' ? 'Faol' : request.status === 'completed' ? 'Yakunlandi' : 'Tasdiqlandi'}
        </Pill>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {request.preferences.map((preference) => (
          <Pill key={preference} tone="gray">
            {preferenceLabel(preference)}
          </Pill>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2">
        <span className="text-sm font-extrabold text-primary">{request.applicants.length} ta haydovchi ariza berdi</span>
        {request.applicants.length > 0 ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-extrabold text-white">NEW</span> : null}
      </div>
    </Card>
  </button>
);
