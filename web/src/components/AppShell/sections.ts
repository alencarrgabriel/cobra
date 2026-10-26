export type Section = {
  label: string;
  href: string;
  available: boolean;
  icon: "home" | "people" | "votes" | "works";
};

// Sections not delivered yet stay visible as "em breve" and are not links (spec identidade-visual).
export const SECTIONS: Section[] = [
  { label: "Início", href: "/", available: true, icon: "home" },
  {
    label: "Representantes",
    href: "/representantes",
    available: false,
    icon: "people",
  },
  { label: "Votações", href: "/votacoes", available: false, icon: "votes" },
  { label: "Obras", href: "/obras", available: true, icon: "works" },
];
