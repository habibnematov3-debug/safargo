import { inferLocationFromAddress } from '../data/locations';
import type { UserLocation } from '../types/safargo';

type NominatimResponse = {
  address?: Record<string, unknown>;
  display_name?: string;
};

export const reverseGeocode = async (lat: number, lon: number): Promise<UserLocation> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('accept-language', 'uz');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Xatolik. Qayta urinib ko'ring.");
  }

  const data = (await response.json()) as NominatimResponse;
  return inferLocationFromAddress(data.address ?? {});
};
