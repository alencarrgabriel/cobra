// Fictional examples for the component catalog only. Party colors here are arbitrary on
// purpose: the real table arrives with change `identidade-de-partidos-e-ufs`.
export const FAKE_PARTIES = {
  roxo: { acronym: "PEX", color: "#7c3aed", name: "Partido Exemplo" },
  amarelo: { acronym: "PFIC", color: "#ffd400", name: "Partido Fictício" },
  rosa: {
    acronym: "EXEMPLO",
    color: "#be185d",
    name: "Partido de Exemplo Longo",
  },
};

export const FAKE_PEOPLE = [
  { name: "Ana Exemplo", party: FAKE_PARTIES.roxo, presence: 92 },
  { name: "Bruno Fictício", party: FAKE_PARTIES.amarelo, presence: 78 },
  { name: "Carla Modelo", party: FAKE_PARTIES.rosa, presence: 88 },
  { name: "Diego Amostra", party: FAKE_PARTIES.roxo, presence: 95 },
];

export const FAKE_FLAG = (
  <svg viewBox="0 0 30 20" role="img" aria-label="Bandeira fictícia">
    <rect width="30" height="20" fill="var(--surface-2)" />
    <rect y="7" width="30" height="6" fill="var(--muted)" />
  </svg>
);
