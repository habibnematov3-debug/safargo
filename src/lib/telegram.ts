export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type HapticFeedback = {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
};

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
  ready: () => void;
  expand: () => void;
  HapticFeedback?: HapticFeedback;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export const getTelegramApp = (): TelegramWebApp | undefined => window.Telegram?.WebApp;

export const initTelegram = (): void => {
  const app = getTelegramApp();
  app?.ready();
  app?.expand();
};

export const getTelegramUserName = (): string => {
  const user = getTelegramApp()?.initDataUnsafe?.user;
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return name || user?.username || 'Safargo foydalanuvchisi';
};

export const getTelegramIdentity = (): { id: string; name: string; user?: TelegramUser } => {
  const user = getTelegramApp()?.initDataUnsafe?.user;
  const id = String(user?.id ?? 'dev-user-123');
  const name = user?.first_name || user?.username || 'Foydalanuvchi';

  return { id, name, user };
};

export const hapticTap = (): void => {
  getTelegramApp()?.HapticFeedback?.impactOccurred('light');
};

export const hapticSuccess = (): void => {
  getTelegramApp()?.HapticFeedback?.notificationOccurred('success');
};

export const requestTelegramLocation = (): Promise<{
  latitude: number;
  longitude: number;
}> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS mavjud emas'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        reject(new Error('GPS rad etildi: ' + err.message));
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
        maximumAge: 0,
      },
    );
  });
