// Share links (change compartilhamento, design D6). Only the page's canonical address goes in
// them: never a CEP, an e-mail or followed politicians.

/** WhatsApp "click to chat" without a number: WhatsApp asks who to send it to. */
export function whatsappUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

/** X web intent (docs.x.com, "Web Intent", checked on 2026-10-27). */
export function xUrl(text: string, url: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

/** "/cartao/politico/42/feed" for the card of a page. */
export function cardPath(
  kind: "politico" | "representantes" | "obra",
  id: string | number,
  format: string,
): string {
  return `/cartao/${kind}/${encodeURIComponent(String(id))}/${format}`;
}
