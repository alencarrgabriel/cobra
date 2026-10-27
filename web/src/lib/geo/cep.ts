// CEP → place, without a CEP database (change busca-geografica, design D1).
// Ranges by UF (first 5 digits) from the Correios structure, as listed in the Wikipedia table
// "Código de Endereçamento Postal", which cites the Correios pages "Estrutura do CEP" and
// "Alteração de faixas de CEP" (checked on 2026-10-26). The Correios range tool needs a captcha.

/** [first, last] 5-digit prefixes per UF IBGE code. */
const RANGES: [number, number, string][] = [
  [1000, 19999, "35"], // SP
  [20000, 28999, "33"], // RJ
  [29000, 29999, "32"], // ES
  [30000, 39999, "31"], // MG
  [40000, 48999, "29"], // BA
  [49000, 49999, "28"], // SE
  [50000, 56999, "26"], // PE
  [57000, 57999, "27"], // AL
  [58000, 58999, "25"], // PB
  [59000, 59999, "24"], // RN
  [60000, 63999, "23"], // CE
  [64000, 64999, "22"], // PI
  [65000, 65999, "21"], // MA
  [66000, 68899, "15"], // PA
  [68900, 68999, "16"], // AP
  [69000, 69299, "13"], // AM
  [69300, 69399, "14"], // RR
  [69400, 69899, "13"], // AM
  [69900, 69999, "12"], // AC
  [70000, 72799, "53"], // DF
  [72800, 72999, "52"], // GO (Entorno)
  [73000, 73699, "53"], // DF
  [73700, 76799, "52"], // GO
  [76800, 76999, "11"], // RO
  [77000, 77999, "17"], // TO
  [78000, 78899, "51"], // MT
  // 78900–78999 is attributed differently by the sources (MT or RO): no UF, the person picks.
  [79000, 79999, "50"], // MS
  [80000, 87999, "41"], // PR
  [88000, 89999, "42"], // SC
  [90000, 99999, "43"], // RS
];

export const DF_UF = "53";
export const BRASILIA = "5300108";

/** "72210-000", "72210000" or " 72.210-000 " → "72210000"; null if not a CEP. */
export function normalizeCep(text: string): string | null {
  const digits = text.replace(/[\s.-]/g, "");
  return /^\d{8}$/.test(digits) && digits !== "00000000" ? digits : null;
}

export function ufFromCep(cep: string): string | null {
  const prefix = Number(cep.slice(0, 5));
  const range = RANGES.find(
    ([first, last]) => prefix >= first && prefix <= last,
  );
  return range ? range[2] : null;
}

/**
 * IBGE code of the place for a CEP: Brasília for the DF (its only municipality), the UF
 * elsewhere (enough for federal representatives), or null when the range is unknown.
 */
export function placeFromCep(cep: string): string | null {
  const uf = ufFromCep(cep);
  if (uf === null) return null;
  return uf === DF_UF ? BRASILIA : uf;
}
