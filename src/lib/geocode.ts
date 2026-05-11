import { inferLocationFromAddress } from '../data/locations';
import type { UserLocation } from '../types/safargo';

type NominatimResponse = {
  address?: Record<string, unknown>;
  display_name?: string;
};

const NOMINATIM_TIMEOUT_MS = 5000;

export const reverseGeocode = async (lat: number, lon: number): Promise<UserLocation> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('accept-language', 'uz');

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Safargo/1.0 (safargo-3qum.vercel.app)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Xatolik. Qayta urinib ko'ring.");
    }

    const data = (await response.json()) as NominatimResponse;

    if (!data.address) {
      throw new Error('GPS manzil topilmadi');
    }

    return inferLocationFromAddress(data.address);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error("GPS sekin ishladi. Qo'lda tanlang:");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};
