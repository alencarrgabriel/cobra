import type { Stat } from "@/components/StatStrip/StatStrip";
import { percent } from "@/lib/politicians/attendance";
import type { Declaration } from "@/lib/politicians/assets";
import type {
  AmendmentRow,
  AttendanceData,
  ExpensesData,
} from "@/lib/politicians/queries";
import { formatBRLCompact, formatDate } from "@/lib/works/format";

// The profile's number strip (change perfil-em-abas-e-jornada, design D2): same figures, in
// the same order, for every politician. A figure with no data is `null` with the reason.

const HOUSE_NAME = { camara: "Câmara dos Deputados", senado: "Senado Federal" };

export function summaryStats(input: {
  /** Tab addresses: `${base}/votos`, `${base}/presenca`... */
  base: string;
  house: "camara" | "senado" | "cldf" | undefined;
  attendance: AttendanceData | null;
  expenses: ExpensesData;
  amendments: AmendmentRow[];
  declarations: Declaration[];
  assetsCollectedAt: string | null;
}): Stat[] {
  const { base, house, attendance, expenses, amendments, declarations } = input;
  const senate = house === "senado";

  // Presence (or, in the Senate, attendance at nominal votes).
  const year = attendance?.years.reduce(
    (a, y) => (y.year > a.year ? y : a),
    attendance.years[0]!,
  );
  const presence: Stat = {
    label: senate ? "Comparecimento" : "Presença",
    href: `${base}/presenca`,
    value: year && year.total ? percent(year.present / year.total) : null,
    reference: year
      ? year.median !== null
        ? `Mediana ${senate ? "dos senadores" : "dos deputados"}: ${percent(year.median)} em ${year.year}`
        : `Em ${year.year}`
      : "",
    note: year
      ? `Fonte: ${HOUSE_NAME[attendance!.house]}${attendance!.collectedAt ? `, ${formatDate(attendance!.collectedAt)}` : ""}`
      : house === "cldf"
        ? "A presença dos distritais ainda não é coletada"
        : "Sem registro desde 2023",
  };

  const salary: Stat = {
    label: "Salário",
    href: "/metodologia#fontes",
    value: null,
    reference: "",
    note: "Ainda não coletado: vem com a fonte oficial dos subsídios",
  };

  const spent = expenses.years.reduce<(typeof expenses.years)[number] | null>(
    (a, y) => (a && a.year > y.year ? a : y),
    null,
  );
  const quota: Stat = {
    label: "Cota parlamentar",
    href: `${base}/gastos`,
    value: spent ? formatBRLCompact(spent.total) : null,
    reference: spent ? `Gasto em ${spent.year}` : "",
    note: spent
      ? `Fonte: ${house === "senado" ? "Senado Federal" : "Câmara dos Deputados"}${expenses.collectedAt ? `, ${formatDate(expenses.collectedAt)}` : ""}`
      : house === "cldf"
        ? "Os gastos dos distritais ainda não são coletados"
        : "Sem despesas desde 2023",
  };

  const committed = amendments.reduce((s, a) => s + a.committed, 0);
  const emendas: Stat = {
    label: "Emendas ao DF",
    href: `${base}/emendas`,
    value: amendments.length ? formatBRLCompact(committed) : null,
    reference: amendments.length
      ? `${amendments.length} ${amendments.length === 1 ? "emenda empenhada" : "emendas empenhadas"}`
      : "",
    note: amendments.length
      ? "Fonte: Portal da Transparência"
      : house === "cldf"
        ? "Emendas ao orçamento federal são de deputados federais e senadores"
        : "Nenhuma emenda com destino ao DF no Cobra",
  };

  const declared = declarations
    .filter((d) => d.total !== null)
    .reduce<Declaration | null>((a, d) => (a && a.year > d.year ? a : d), null);
  const assets: Stat = {
    label: "Patrimônio declarado",
    href: `${base}/patrimonio`,
    value: declared ? formatBRLCompact(declared.total!) : null,
    reference: declared ? `Declarado em ${declared.year}` : "",
    note: declared
      ? `Fonte: TSE${input.assetsCollectedAt ? `, ${formatDate(input.assetsCollectedAt)}` : ""}`
      : "Sem bens declarados ao TSE desde 2006",
  };

  return [presence, salary, quota, emendas, assets];
}
