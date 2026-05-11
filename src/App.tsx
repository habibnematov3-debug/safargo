import { useEffect, useState } from 'react';
import { EntryScreen } from './screens/EntryScreen';
import { DriverScreen } from './screens/DriverScreen';
import { PassengerScreen } from './screens/PassengerScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { useSafargoStore } from './store/useSafargoStore';
import { hapticTap, initTelegram } from './lib/telegram';
import { Card, Spinner } from './components/ui';

type MainTab = 'home' | 'new' | 'orders' | 'profile';

const tabs: { id: MainTab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Bosh sahifa' },
  { id: 'new', icon: '➕', label: 'Yangi' },
  { id: 'orders', icon: '📋', label: 'Arizalarim' },
  { id: 'profile', icon: '👤', label: 'Profil' },
];

export default function App() {
  const role = useSafargoStore((state) => state.role);
  const confirmedLocation = useSafargoStore((state) => state.confirmedLocation);
  const isLoading = useSafargoStore((state) => state.isLoading);
  const error = useSafargoStore((state) => state.error);
  const initializeApp = useSafargoStore((state) => state.initializeApp);
  const clearRealtime = useSafargoStore((state) => state.clearRealtime);
  const [mainTab, setMainTab] = useState<MainTab>('home');

  useEffect(() => {
    initTelegram();
    void initializeApp();

    return () => {
      clearRealtime();
    };
  }, [clearRealtime, initializeApp]);

  useEffect(() => {
    setMainTab('home');
  }, [role]);

  const isMainApp = Boolean(confirmedLocation && role);

  const content = !isMainApp ? (
    <EntryScreen />
  ) : mainTab === 'orders' ? (
    <OrdersScreen />
  ) : mainTab === 'profile' ? (
    <ProfileScreen />
  ) : role === 'passenger' ? (
    <PassengerScreen mode={mainTab === 'home' ? 'home' : 'new'} />
  ) : (
    <DriverScreen mode={mainTab === 'home' ? 'home' : 'new'} />
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

      {isMainApp ? <BottomNav activeTab={mainTab} onChange={setMainTab} /> : null}
    </main>
  );
}

const BottomNav = ({
  activeTab,
  onChange,
}: {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
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
        <span className="block text-lg leading-5">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
);

const ProfileScreen = () => {
  const role = useSafargoStore((state) => state.role);
  const location = useSafargoStore((state) => state.location);
  const currentUser = useSafargoStore((state) => state.currentUser);

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
      <div>
        <h2 className="text-xl font-extrabold">Profil</h2>
        <p className="text-sm font-bold text-slate-500">Safargo ma'lumotlari</p>
      </div>
      <Card>
        <div className="space-y-3 text-sm font-bold">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Ism</span>
            <span className="text-right text-slate-900">{currentUser?.name ?? 'Foydalanuvchi'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Rol</span>
            <span className="text-right text-slate-900">{role === 'driver' ? 'Haydovchi' : "Yo'lovchi"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Joylashuv</span>
            <span className="text-right text-slate-900">{location?.labelUz ?? 'Tanlanmagan'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
