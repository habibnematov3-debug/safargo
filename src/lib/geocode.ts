import { inferLocationFromAddress } from '../data/locations';
import type { UserLocation } from '../types/safargo';

type NominatimResponse = {
  address?: {
    state?: string;
    province?: string;
    region?: string;
    county?: string;
    city_district?: string;
    suburb?: string;
    district?: string;
  };
  display_name?: string;
};

type RegionId = UserLocation['regionId'];

const NOMINATIM_TIMEOUT_MS = 10000;

void inferLocationFromAddress;

export const reverseGeocode = async (lat: number, lon: number): Promise<UserLocation> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('accept-language', 'uz');
  url.searchParams.set('zoom', '10');

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
      throw new Error('Server xatosi');
    }

    const data = (await response.json()) as NominatimResponse;
    const address = data.address ?? {};

    console.log('Nominatim raw address:', JSON.stringify(address));

    const stateRaw: string = address.state ?? address.province ?? address.region ?? '';
    const countyRaw: string =
      address.county ?? address.city_district ?? address.suburb ?? address.district ?? '';

    console.log('State:', stateRaw, '| County:', countyRaw);

    const regionId = mapStateToRegionId(stateRaw);
    const districtId =
      countyRaw
        .toLowerCase()
        .replace(/\s+tumani?$/i, '')
        .replace(/\s+district$/i, '')
        .trim()
        .replace(/\s+/g, '_') || 'markaz';
    const labelUz = countyRaw ? `${getRegionLabel(regionId)}, ${countyRaw}` : getRegionLabel(regionId);

    return {
      regionId,
      districtId,
      labelUz,
      source: 'gps',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error("GPS sekin ishladi. Qo'lda tanlang:");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

function mapStateToRegionId(state: string): RegionId {
  const s = state.toLowerCase();

  if (s.includes('toshkent') || s.includes('tashkent')) return 'toshkent';
  if (s.includes('samarqand') || s.includes('samarkand') || s.includes('самарканд')) return 'samarkand';
  if (s.includes('farg') || s.includes('fergana') || s.includes('farghona')) return 'fargona';
  if (s.includes('buxoro') || s.includes('bukhara') || s.includes('buхара')) return 'buxoro';
  if (s.includes('namangan')) return 'namangan';
  if (s.includes('andijon') || s.includes('andijan')) return 'andijon';
  if (s.includes('qashqa') || s.includes('kashka') || s.includes('surxon') || s.includes('surkhan')) {
    return 'qashqadaryo';
  }

  return 'toshkent';
}

function getRegionLabel(regionId: RegionId): string {
  const labels: Record<RegionId, string> = {
    toshkent: 'Toshkent',
    samarkand: 'Samarqand',
    fargona: "Farg'ona",
    buxoro: 'Buxoro',
    namangan: 'Namangan',
    andijon: 'Andijon',
    qashqadaryo: 'Qashqadaryo',
  };

  return labels[regionId] ?? regionId;
}
