export const GENERIC_ERROR_UZ = "Xatolik yuz berdi. Qayta urinib ko'ring.";

const errorMap: Record<string, string> = {
  'Network error': "Internet aloqasi yo'q",
  'Failed to fetch': "Ma'lumot yuklanmadi",
  'Permission denied': 'Ruxsat berilmadi',
  'Not found': 'Topilmadi',
  Unauthorized: 'Tizimga kirish kerak',
};

export const toUzbekErrorMessage = (error: unknown, fallback = GENERIC_ERROR_UZ): string => {
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');

  for (const [needle, message] of Object.entries(errorMap)) {
    if (rawMessage.toLowerCase().includes(needle.toLowerCase())) {
      return message;
    }
  }

  return fallback;
};
