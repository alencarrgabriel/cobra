import type { MouseEventHandler, ReactNode } from "react";

import { PartyBadge } from "../PartyBadge/PartyBadge";
import { Portrait } from "../Portrait/Portrait";
import styles from "./RepresentativeCard.module.css";

export type RepresentativeCardProps = {
  name: string;
  party: { acronym: string; color: string; name?: string };
  uf: string;
  photoUrl?: string;
  flag?: ReactNode;
  selected?: boolean;
  /** Link to the profile. Without it the card is a button (e.g. to open the side panel). */
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
};

/** Same structure for every politician: photo with flag, name, party badge and state (RF-09, §9.1). */
export function RepresentativeCard({
  name,
  party,
  uf,
  photoUrl,
  flag,
  selected,
  href,
  onClick,
}: RepresentativeCardProps) {
  const body = (
    <>
      <Portrait
        name={name}
        photoUrl={photoUrl}
        partyColor={party.color}
        flag={flag}
      />
      <span className={styles.who}>
        <span className={styles.name}>{name}</span>
        <span className={styles.meta}>
          <PartyBadge
            acronym={party.acronym}
            color={party.color}
            name={party.name}
          />
          <span>{uf}</span>
        </span>
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      className={styles.card}
      aria-current={selected ? "true" : undefined}
      onClick={onClick}
    >
      {body}
    </a>
  ) : (
    <button
      type="button"
      className={styles.card}
      aria-pressed={selected ?? false}
      onClick={onClick}
    >
      {body}
    </button>
  );
}
