import styles from "./Vote.module.css";

export type VoteOption =
  "yes" | "no" | "abstention" | "obstruction" | "absent" | "other";

export const VOTE_LABEL: Record<VoteOption, string> = {
  yes: "Sim",
  no: "Não",
  abstention: "Abstenção",
  obstruction: "Obstrução",
  absent: "Ausente",
  other: "Outro",
};

const tone = (o: VoteOption) =>
  o === "yes" ? styles.yes : o === "no" ? styles.no : styles.other;

/** A single vote: always the option's text, colored with the vote tokens (never party colors). */
export function VoteBadge({ option }: { option: VoteOption }) {
  return (
    <span className={`${styles.badge} ${tone(option)}`}>
      {VOTE_LABEL[option]}
    </span>
  );
}

/** A vote as the house recorded it, in the vote tokens: "Sim" and "Não" colored, the rest neutral. */
export function VoteChip({
  tone,
  children,
}: {
  tone: "yes" | "no" | "other";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`${styles.badge} ${tone === "yes" ? styles.yes : tone === "no" ? styles.no : styles.other}`}
      data-testid="voto"
    >
      {children}
    </span>
  );
}

type SplitProps = {
  yes: number;
  no: number;
  other: number;
  size?: "md" | "lg";
};

/** Yes × No tally bar with a midpoint marker. The label carries all counts for screen readers. */
export function VoteSplitBar({ yes, no, other, size = "md" }: SplitProps) {
  const total = yes + no + other || 1;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div
      role="img"
      aria-label={`${yes} Sim, ${no} Não, ${other} outros`}
      className={`${styles.split} ${size === "lg" ? styles.lg : ""}`}
    >
      <span className={styles.segYes} style={{ width: w(yes) }} />
      <span className={styles.segOther} style={{ width: w(other) }} />
      <span className={styles.segNo} style={{ width: w(no) }} />
      <i className={styles.mid} />
    </div>
  );
}
