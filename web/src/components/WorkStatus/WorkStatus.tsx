import type { CSSProperties } from "react";

import type { WorkStatus as Status } from "@/lib/works/filters";
import { monthsAgoLabel, monthsSince, STATUS_INFO } from "@/lib/works/format";

import styles from "./WorkStatus.module.css";

type Props = {
  status: Status;
  /** ISO date of the latest stoppage event; shown as "há N meses". */
  stoppedSince?: string | null;
  today?: Date;
};

/** Status of a work as informed by its managers, with the time since a stoppage. */
export function WorkStatus({
  status,
  stoppedSince,
  today = new Date(),
}: Props) {
  const info = STATUS_INFO[status];
  const since =
    stoppedSince && (status === "stopped" || status === "unfinished")
      ? monthsAgoLabel(monthsSince(stoppedSince, today))
      : null;
  return (
    <span
      className={styles.status}
      style={{ "--status": info.color } as CSSProperties}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span>
        {info.label}
        {since ? <span className={styles.since}>, {since}</span> : null}
      </span>
    </span>
  );
}
