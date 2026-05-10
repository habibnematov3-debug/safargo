import type { DistrictId, RegionId, UserLocation } from '../types/safargo';

export type District = {
  id: DistrictId;
  regionId: RegionId;
  labelUz: string;
};

export const regions: { id: RegionId; labelUz: string }[] = [
  { id: 'toshkent', labelUz: 'Toshkent' },
  { id: 'samarkand', labelUz: 'Samarqand' },
  { id: 'fargona', labelUz: "Farg'ona" },
  { id: 'buxoro', labelUz: 'Buxoro' },
  { id: 'namangan', labelUz: 'Namangan' },
  { id: 'andijon', labelUz: 'Andijon' },
  { id: 'qashqadaryo', labelUz: 'Qashqadaryo' },
];

export const districts: District[] = [
  { id: 'toshkent-chilonzor', regionId: 'toshkent', labelUz: 'Chilonzor tumani' },
  { id: 'toshkent-sergeli', regionId: 'toshkent', labelUz: 'Sergeli tumani' },
  { id: 'samarkand-juma', regionId: 'samarkand', labelUz: 'Juma tumani' },
  { id: 'samarkand-urgut', regionId: 'samarkand', labelUz: 'Urgut tumani' },
  { id: 'fargona-yaypan', regionId: 'fargona', labelUz: 'Yaypan tumani' },
  { id: 'fargona-qoqon', regionId: 'fargona', labelUz: "Qo'qon shahri" },
  { id: 'buxoro-gijduvon', regionId: 'buxoro', labelUz: "G'ijduvon tumani" },
  { id: 'namangan-chust', regionId: 'namangan', labelUz: 'Chust tumani' },
  { id: 'andijon-asaka', regionId: 'andijon', labelUz: 'Asaka tumani' },
  { id: 'qashqadaryo-qarshi', regionId: 'qashqadaryo', labelUz: 'Qarshi shahri' },
];

export const defaultLocation: UserLocation = {
  regionId: 'samarkand',
  districtId: 'samarkand-juma',
  labelUz: 'Samarqand, Juma tumani',
  source: 'manual',
};

export const getRegionLabel = (regionId: RegionId): string =>
  regions.find((region) => region.id === regionId)?.labelUz ?? regionId;

export const getDistrictsByRegion = (regionId: RegionId): District[] =>
  districts.filter((district) => district.regionId === regionId);

export const buildLocation = (regionId: RegionId, districtId: DistrictId): UserLocation => {
  const region = regions.find((item) => item.id === regionId);
  const district = districts.find((item) => item.id === districtId);

  return {
    regionId,
    districtId,
    labelUz: `${region?.labelUz ?? regionId}, ${district?.labelUz ?? districtId}`,
    source: 'manual',
  };
};

export const inferLocationFromAddress = (address: Record<string, unknown>): UserLocation => {
  const city = String(address.city ?? address.town ?? address.state ?? '').toLowerCase();
  const district = String(address.county ?? address.suburb ?? address.city_district ?? '').toLowerCase();
  const full = `${city} ${district}`;

  if (full.includes('toshkent') || full.includes('tashkent')) {
    return { regionId: 'toshkent', districtId: 'toshkent-sergeli', labelUz: 'Toshkent, Sergeli tumani', source: 'gps' };
  }

  if (full.includes('farg') || full.includes('kokand') || full.includes('qo')) {
    return { regionId: 'fargona', districtId: 'fargona-yaypan', labelUz: "Farg'ona, Yaypan tumani", source: 'gps' };
  }

  if (full.includes('samarkand') || full.includes('samarqand') || full.includes('juma')) {
    return { regionId: 'samarkand', districtId: 'samarkand-juma', labelUz: 'Samarqand, Juma tumani', source: 'gps' };
  }

  return { ...defaultLocation, source: 'gps' };
};
