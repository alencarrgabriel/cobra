import { googleMapsLinks } from "@/lib/works/external-map";

import ficha from "./ficha.module.css";

/** Plain links: Google Maps is only reached if the citizen clicks (design D7 of mapa-de-obras). */
export function ExternalMapLinks({ lat, lon }: { lat: number; lon: number }) {
  const links = googleMapsLinks(lat, lon);
  return (
    <>
      <ul className={ficha.mapLinks} data-testid="mapa-externo">
        <li>
          <a href={links.view} rel="noopener noreferrer">
            Ver no Google Maps
          </a>
        </li>
        <li>
          <a href={links.directions} rel="noopener noreferrer">
            Como chegar
          </a>
        </li>
        <li>
          <a href={links.streetView} rel="noopener noreferrer">
            Street View
          </a>
        </li>
      </ul>
      <p className={ficha.mapNote}>
        Os links abrem o Google Maps, um serviço externo ao Cobra. Localização
        informada pelo gestor da obra.
      </p>
    </>
  );
}
