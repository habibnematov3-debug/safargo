import { getTelegramApp, getTelegramIdentity } from './telegram';

export const isRunningInsideTelegram = (): boolean => Boolean(getTelegramApp());

export const isFallbackTelegramIdentity = (): boolean =>
  isRunningInsideTelegram() && getTelegramIdentity().id === 'dev-user-123';
