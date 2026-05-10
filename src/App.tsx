import { useEffect } from 'react';
import { EntryScreen } from './screens/EntryScreen';
import { DriverScreen } from './screens/DriverScreen';
import { PassengerScreen } from './screens/PassengerScreen';
import { useSafargoStore } from './store/useSafargoStore';
import { initTelegram } from './lib/telegram';

export default function App() {
  const role = useSafargoStore((state) => state.role);
  const confirmedLocation = useSafargoStore((state) => state.confirmedLocation);

  useEffect(() => {
    initTelegram();
  }, []);

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

      {!confirmedLocation || !role ? (
        <EntryScreen />
      ) : role === 'passenger' ? (
        <PassengerScreen />
      ) : (
        <DriverScreen />
      )}
    </main>
  );
}
