/**
 * Sierra Leone administrative geography.
 *
 * Client-safe: this module must NOT import from `@prisma/client` (it is bundled
 * into the browser for the profile and bounty-create forms). The string values
 * here are the single source of truth and MUST stay byte-for-byte identical to
 * the `Province` / `District` enums in `prisma/schema.prisma`.
 */

export const PROVINCE_VALUES = [
	'EASTERN',
	'NORTHERN',
	'NORTH_WEST',
	'SOUTHERN',
	'WESTERN_AREA'
] as const;
export type Province = (typeof PROVINCE_VALUES)[number];

export const DISTRICT_VALUES = [
	// Eastern
	'KAILAHUN',
	'KENEMA',
	'KONO',
	// Northern
	'BOMBALI',
	'FALABA',
	'KOINADUGU',
	'TONKOLILI',
	// North West
	'KAMBIA',
	'KARENE',
	'PORT_LOKO',
	// Southern
	'BO',
	'BONTHE',
	'MOYAMBA',
	'PUJEHUN',
	// Western Area
	'WESTERN_AREA_URBAN',
	'WESTERN_AREA_RURAL'
] as const;
export type District = (typeof DISTRICT_VALUES)[number];

export const PROVINCE_LABEL: Record<Province, string> = {
	EASTERN: 'Eastern',
	NORTHERN: 'Northern',
	NORTH_WEST: 'North West',
	SOUTHERN: 'Southern',
	WESTERN_AREA: 'Western Area'
};

export const DISTRICT_LABEL: Record<District, string> = {
	KAILAHUN: 'Kailahun',
	KENEMA: 'Kenema',
	KONO: 'Kono',
	BOMBALI: 'Bombali',
	FALABA: 'Falaba',
	KOINADUGU: 'Koinadugu',
	TONKOLILI: 'Tonkolili',
	KAMBIA: 'Kambia',
	KARENE: 'Karene',
	PORT_LOKO: 'Port Loko',
	BO: 'Bo',
	BONTHE: 'Bonthe',
	MOYAMBA: 'Moyamba',
	PUJEHUN: 'Pujehun',
	WESTERN_AREA_URBAN: 'Western Area Urban (Freetown)',
	WESTERN_AREA_RURAL: 'Western Area Rural'
};

/** Which province each district belongs to. */
export const DISTRICT_PROVINCE: Record<District, Province> = {
	KAILAHUN: 'EASTERN',
	KENEMA: 'EASTERN',
	KONO: 'EASTERN',
	BOMBALI: 'NORTHERN',
	FALABA: 'NORTHERN',
	KOINADUGU: 'NORTHERN',
	TONKOLILI: 'NORTHERN',
	KAMBIA: 'NORTH_WEST',
	KARENE: 'NORTH_WEST',
	PORT_LOKO: 'NORTH_WEST',
	BO: 'SOUTHERN',
	BONTHE: 'SOUTHERN',
	MOYAMBA: 'SOUTHERN',
	PUJEHUN: 'SOUTHERN',
	WESTERN_AREA_URBAN: 'WESTERN_AREA',
	WESTERN_AREA_RURAL: 'WESTERN_AREA'
};

export const PROVINCES: ReadonlyArray<{ value: Province; label: string }> = PROVINCE_VALUES.map(
	(value) => ({ value, label: PROVINCE_LABEL[value] })
);

/** Districts belonging to a province, in declaration order. */
export function districtsForProvince(province: Province): District[] {
	return DISTRICT_VALUES.filter((d) => DISTRICT_PROVINCE[d] === province);
}

/** True when `district` is one of `province`'s districts. */
export function districtBelongsToProvince(district: District, province: Province): boolean {
	return DISTRICT_PROVINCE[district] === province;
}

/** Human-readable list, e.g. "Eastern, Western Area". `[]` → "Nationwide". */
export function provincesLabel(provinces: readonly Province[]): string {
	if (provinces.length === 0) return 'Nationwide';
	return provinces.map((p) => PROVINCE_LABEL[p]).join(', ');
}

/** Human-readable list, e.g. "Bombali, Kono". `[]` → "Nationwide". */
export function districtsLabel(districts: readonly District[]): string {
	if (districts.length === 0) return 'Nationwide';
	return districts.map((d) => DISTRICT_LABEL[d]).join(', ');
}
