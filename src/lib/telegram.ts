export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
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
  requestLocation?: (callback: (locationData: LocationData | null) => void) => void;
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

export const requestTelegramLocation = (): Promise<LocationData> =>
  new Promise((resolve, reject) => {
    const requestLocation = getTelegramApp()?.requestLocation;

    if (!requestLocation) {
      reject(new Error('Telegram GPS mavjud emas'));
      return;
    }

    requestLocation((locationData) => {
      if (!locationData) {
        reject(new Error('GPS rad etildi'));
        return;
      }

      resolve(locationData);
    });
  });
