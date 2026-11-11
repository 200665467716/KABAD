/** Time zones of the members' countries, plus the diaspora's main ones. */
export const ZONES = ["Africa/Abidjan", "Africa/Accra", "Africa/Bamako", "Africa/Dakar", "Africa/Douala", "Africa/Kinshasa", "Africa/Lagos", "Africa/Lome", "Africa/Niamey", "Africa/Ouagadougou", "Africa/Porto-Novo", "Africa/Nairobi", "Africa/Casablanca", "Europe/Paris", "Europe/Brussels", "Europe/London", "America/Toronto", "America/New_York"];

/** Cities whose name loses its accent in the name of their zone. */
const CITY_NAMES: Record<string, string> = { Lome: "Lomé" };

/** "Africa/Lome" → "Lomé", "America/New_York" → "New York". A zone without a city ("UTC") is shown as is. */
export function zoneCity(zone: string): string {
  const city = (zone.split("/").pop() || zone).replace(/_/g, " ");
  return CITY_NAMES[city] ?? city;
}

/** The zones offered in a list: the usual ones, plus the member's own when it is another one. */
export const zoneChoices = (current: string) => (ZONES.includes(current) ? ZONES : [current, ...ZONES]);
