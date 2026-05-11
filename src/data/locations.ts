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
  { id: 'yunusobod', regionId: 'toshkent', labelUz: 'Yunusobod' },
  { id: 'chilonzor', regionId: 'toshkent', labelUz: 'Chilonzor' },
  { id: 'sergeli', regionId: 'toshkent', labelUz: 'Sergeli' },
  { id: 'mirzo-ulugbek', regionId: 'toshkent', labelUz: "Mirzo Ulug'bek" },
  { id: 'shayxontohur', regionId: 'toshkent', labelUz: 'Shayxontohur' },
  { id: 'uchtepa', regionId: 'toshkent', labelUz: 'Uchtepa' },
  { id: 'yakkasaroy', regionId: 'toshkent', labelUz: 'Yakkasaroy' },
  { id: 'olmazar', regionId: 'toshkent', labelUz: 'Olmazar' },
  { id: 'bektemir', regionId: 'toshkent', labelUz: 'Bektemir' },
  { id: 'markaz', regionId: 'samarkand', labelUz: 'Markaz' },
  { id: 'juma', regionId: 'samarkand', labelUz: 'Juma' },
  { id: 'urgut', regionId: 'samarkand', labelUz: 'Urgut' },
  { id: 'kattaqorgon', regionId: 'samarkand', labelUz: "Kattaqo'rg'on" },
  { id: 'payariq', regionId: 'samarkand', labelUz: 'Payariq' },
  { id: 'pastdargom', regionId: 'samarkand', labelUz: "Pastdarg'om" },
  { id: 'markaz', regionId: 'fargona', labelUz: 'Markaz' },
  { id: 'qoqon', regionId: 'fargona', labelUz: "Qo'qon" },
  { id: 'margilon', regionId: 'fargona', labelUz: "Marg'ilon" },
  { id: 'rishton', regionId: 'fargona', labelUz: 'Rishton' },
  { id: 'beshariq', regionId: 'fargona', labelUz: 'Beshariq' },
  { id: 'dangara', regionId: 'fargona', labelUz: "Dang'ara" },
  { id: 'markaz', regionId: 'buxoro', labelUz: 'Markaz' },
  { id: 'kogon', regionId: 'buxoro', labelUz: 'Kogon' },
  { id: 'romitan', regionId: 'buxoro', labelUz: 'Romitan' },
  { id: 'vobkent', regionId: 'buxoro', labelUz: 'Vobkent' },
  { id: 'markaz', regionId: 'namangan', labelUz: 'Markaz' },
  { id: 'chortoq', regionId: 'namangan', labelUz: 'Chortoq' },
  { id: 'chust', regionId: 'namangan', labelUz: 'Chust' },
  { id: 'pop', regionId: 'namangan', labelUz: 'Pop' },
  { id: 'markaz', regionId: 'andijon', labelUz: 'Markaz' },
  { id: 'asaka', regionId: 'andijon', labelUz: 'Asaka' },
  { id: 'shahrixon', regionId: 'andijon', labelUz: 'Shahrixon' },
  { id: 'xojaobod', regionId: 'andijon', labelUz: "Xo'jaobod" },
  { id: 'qarshi', regionId: 'qashqadaryo', labelUz: 'Qarshi' },
  { id: 'shahrisabz', regionId: 'qashqadaryo', labelUz: 'Shahrisabz' },
  { id: 'kitob', regionId: 'qashqadaryo', labelUz: 'Kitob' },
  { id: 'guzor', regionId: 'qashqadaryo', labelUz: "G'uzor" },
];

export const defaultLocation: UserLocation = {
  regionId: 'samarkand',
  districtId: 'juma',
  labelUz: 'Samarqand, Juma',
  source: 'manual',
};

export const getRegionLabel = (regionId: RegionId): string =>
  regions.find((region) => region.id === regionId)?.labelUz ?? regionId;

export const getDistrictsByRegion = (regionId: RegionId): District[] =>
  districts.filter((district) => district.regionId === regionId);

export const buildLocation = (regionId: RegionId, districtId: DistrictId): UserLocation => {
  const region = regions.find((item) => item.id === regionId);
  const district = districts.find((item) => item.regionId === regionId && item.id === districtId);

  return {
    regionId,
    districtId,
    labelUz: `${region?.labelUz ?? regionId}, ${district?.labelUz ?? districtId}`,
    source: 'manual',
  };
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll('ʻ', "'")
    .replaceAll('`', "'")
    .replaceAll('’', "'")
    .replaceAll('‘', "'")
    .replaceAll('ʼ', "'")
    .trim();

export const slugifyDistrict = (value: string): DistrictId => {
  const cleaned = normalizeText(value)
    .replace(/\b(tumani|tuman|shahri|shahar|city|district|район|город)\b/g, '')
    .replace(/[^a-z0-9\s'-]/g, '')
    .replaceAll("'", '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'markaz';
};

export const mapStateToRegionId = (state: string): RegionId | undefined => {
  const normalized = normalizeText(state)
    .replace(/\b(viloyati|viloyat|shahri|respublikasi|province|region)\b/g, '')
    .replace(/[^a-z0-9\s'-]/g, '')
    .replaceAll("'", '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.includes('toshkent') || normalized.includes('tashkent')) {
    return 'toshkent';
  }

  if (normalized.includes('samarqand') || normalized.includes('samarkand')) {
    return 'samarkand';
  }

  if (normalized.includes('fargona') || normalized.includes('fergana')) {
    return 'fargona';
  }

  if (normalized.includes('buxoro') || normalized.includes('bukhara')) {
    return 'buxoro';
  }

  if (normalized.includes('namangan')) {
    return 'namangan';
  }

  if (normalized.includes('andijon') || normalized.includes('andijan')) {
    return 'andijon';
  }

  if (normalized.includes('qashqadaryo') || normalized.includes('kashkadarya')) {
    return 'qashqadaryo';
  }

  return undefined;
};

export const inferLocationFromAddress = (address: Record<string, unknown>): UserLocation => {
  const state = String(address.state ?? address.province ?? '');
  const county = String(
    address.county ??
      address.city_district ??
      address.suburb ??
      address.town ??
      address.city ??
      address.village ??
      'Markaz',
  );
  const regionId = mapStateToRegionId(state);

  if (!regionId) {
    throw new Error("GPS manzili qo'llab-quvvatlanmaydi");
  }

  const regionLabel = getRegionLabel(regionId);
  const districtLabel = county.replace(/\s+/g, ' ').trim() || 'Markaz';

  return {
    regionId,
    districtId: slugifyDistrict(districtLabel),
    labelUz: `${regionLabel}, ${districtLabel}`,
    source: 'gps',
  };
};
