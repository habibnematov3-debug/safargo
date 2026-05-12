import { useEffect, useState } from 'react';
import { EntryScreen } from './screens/EntryScreen';
import { DriverScreen } from './screens/DriverScreen';
import { PassengerScreen } from './screens/PassengerScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { RatingScreen } from './screens/RatingScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { useSafargoStore } from './store/useSafargoStore';
import { hapticTap, initTelegram, getTelegramIdentity } from './lib/telegram';
import { getPendingRatings, saveUser } from './lib/api';
import { Spinner } from './components/ui';
import type { TabKey } from './types/safargo';

const tabs: { id: TabKey; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Bosh sahifa' },
  { id: 'orders', icon: '📋', label: 'Arizalarim' },
  { id: 'rating', icon: '⭐', label: 'Baholash' },
  { id: 'profile', icon: '👤', label: 'Profil' },
];

export default function App() {
  const role = useSafargoStore((state) => state.role);
  const confirmedLocation = useSafargoStore((state) => state.confirmedLocation);
  const isLoading = useSafargoStore((state) => state.isLoading);
  const error = useSafargoStore((state) => state.error);
  const initializeApp = useSafargoStore((state) => state.initializeApp);
  const clearRealtime = useSafargoStore((state) => state.clearRealtime);
  const [mainTab, setMainTab] = useState<TabKey>('home');
  const [pendingRatingCount, setPendingRatingCount] = useState(0);

  useEffect(() => {
    initTelegram();
    void initializeApp();

    return () => {
      clearRealtime();
    };
  }, [clearRealtime, initializeApp]);

  // Persist user on app mount to ensure they exist in DB before any requests
  useEffect(() => {
    const persistUser = async () => {
      try {
        const { id, name } = getTelegramIdentity();
        const stored = useSafargoStore.getState();

        if (stored.role && stored.confirmedLocation && stored.location) {
          await saveUser(
            id,
            name,
            stored.role,
            stored.location.regionId,
            stored.location.districtId,
            stored.location.labelUz,
          );
        }
      } catch (err) {
        console.warn('Failed to persist user on mount:', err);
      }
    };

    void persistUser();
  }, []);

  useEffect(() => {
    setMainTab('home');
  }, [role]);

  const isMainApp = Boolean(confirmedLocation && role);

  useEffect(() => {
    const loadPendingCount = async () => {
      if (!isMainApp || role !== 'passenger') {
        setPendingRatingCount(0);
        return;
      }

      try {
        const identity = getTelegramIdentity();
        const pending = await getPendingRatings(identity.id);
        setPendingRatingCount(pending.length);
      } catch (err) {
        console.warn('Failed to load pending ratings:', err);
      }
    };

    void loadPendingCount();
  }, [isMainApp, mainTab, role]);

  const content = !isMainApp ? (
    <EntryScreen />
  ) : mainTab === 'orders' ? (
    <OrdersScreen />
  ) : mainTab === 'rating' ? (
    <RatingScreen onPendingCountChange={setPendingRatingCount} />
  ) : mainTab === 'profile' ? (
    <ProfileScreen />
  ) : role === 'passenger' ? (
    <PassengerScreen />
  ) : (
    <DriverScreen />
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-[#f6f8fc] text-slate-900 shadow-2xl">
      <div className="sticky top-0 z-20 border-b border-blue-50 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-primary">Safargo</h1>
            <p className="text-xs font-bold text-slate-500">Shaharlararo yo'l hamrohi</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-extrabold text-primary">@Safargot_bot</span>
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-3">
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <Spinner />
            <p className="mt-2 text-center text-sm font-bold text-slate-600">Yuklanmoqda...</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="px-5 pb-1">
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>
        </div>
      ) : null}

      <div className="flex-1">{content}</div>

      {isMainApp ? <BottomNav activeTab={mainTab} onChange={setMainTab} pendingRatingCount={pendingRatingCount} /> : null}
    </main>
  );
}

const BottomNav = ({
  activeTab,
  onChange,
  pendingRatingCount,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  pendingRatingCount: number;
}) => (
  <nav className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-blue-50 bg-white/95 px-2 pb-3 pt-2 backdrop-blur">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={`rounded-2xl px-1 py-2 text-center text-[11px] font-extrabold transition active:scale-[0.98] ${
          activeTab === tab.id ? 'bg-blue-50 text-primary' : 'text-slate-500'
        }`}
        onClick={() => {
          hapticTap();
          onChange(tab.id);
        }}
      >
        <span className="relative mx-auto block w-fit text-lg leading-5">
          {tab.icon}
          {tab.id === 'rating' && pendingRatingCount > 0 ? (
            <span className="absolute -right-3 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] leading-4 text-white">
              {pendingRatingCount}
            </span>
          ) : null}
        </span>
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
);


