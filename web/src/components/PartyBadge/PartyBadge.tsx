import { readableTextOn } from "@/lib/contrast";

import styles from "./PartyBadge.module.css";

type Props = { acronym: string; color: string; name?: string };

/**
 * Party identification (DDR §9.1, RF-32): identical shape, size and type for every party;
 * only the color and the acronym change. Text color is chosen to keep WCAG AA contrast.
 */
export function PartyBadge({ acronym, color, name }: Props) {
  const { background, text } = readableTextOn(color);
  return (
    <span
      className={styles.badge}
      style={{ backgroundColor: background, color: text }}
      title={name}
    >
      {acronym}
      {name ? <span className="sr-only"> ({name})</span> : null}
    </span>
  );
}
