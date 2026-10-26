import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Scenarios from openspec spec `identidade-visual`: Contraste e acessibilidade automática.
const PAGES = ["/", "/design"];
const THEMES = ["light", "dark"] as const;

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`${path} não tem violações WCAG 2.1 A/AA no tema ${theme === "light" ? "claro" : "escuro"}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
      expect(summary).toEqual([]);
    });
  }
}
