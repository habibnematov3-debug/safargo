import type { DriverBadge, PassengerPreference, PassengerRequest } from '../types/safargo';
import { getRegionLabel } from '../data/locations';

export const money = (value: number): string => `${new Intl.NumberFormat('uz-UZ').format(value)} so'm`;

export const requestRoute = (request: PassengerRequest): string =>
  `${request.origin.labelUz} → ${getRegionLabel(request.destinationRegionId)}`;

export const preferenceLabel = (preference: PassengerPreference): string => {
  const labels: Record<PassengerPreference, string> = {
    front_seat: "Old o'rindiq",
    non_smoking: 'Chekmaslik',
    clean_car: 'Toza mashina',
    women_only: 'Ayollar uchun',
  };

  return labels[preference];
};

export const badgeLabel = (badge: DriverBadge): string => {
  const labels: Record<DriverBadge, string> = {
    verified: '✓ Tasdiqlangan',
    clean: '✦ Toza',
    on_time: '⏱ Vaqtida',
  };

  return labels[badge];
};
