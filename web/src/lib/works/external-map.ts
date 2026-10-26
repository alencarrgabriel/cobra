// Links that open a work's location in Google Maps, only when the citizen clicks (design D7 of
// mapa-de-obras). Official "Maps URLs" format: no API key; `api=1` is required and the comma
// between latitude and longitude is encoded as %2C.

export type ExternalMapLinks = {
  view: string;
  directions: string;
  streetView: string;
};

const coords = (lat: number, lon: number) =>
  encodeURIComponent(`${lat},${lon}`);

export function googleMapsLinks(lat: number, lon: number): ExternalMapLinks {
  const point = coords(lat, lon);
  return {
    view: `https://www.google.com/maps/search/?api=1&query=${point}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${point}`,
    streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${point}`,
  };
}
