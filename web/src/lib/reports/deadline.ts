import { formatDate } from "@/lib/works/format";

/** "no prazo até dd/mm/aaaa" or, past the deadline and still open, "prazo vencido em …"
 *  (design D2: a late answer is never hidden). Null once closed. */
export function deadlineText(
  r: { closedAt: string | null; dueOn: string },
  today: string,
): string | null {
  if (r.closedAt) return null;
  return r.dueOn < today
    ? `prazo vencido em ${formatDate(r.dueOn)}`
    : `no prazo até ${formatDate(r.dueOn)}`;
}
