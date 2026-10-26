# Protótipo visual

`cobra-prototipo.html` é o protótipo navegável aprovado em 2026-10-26 como referência da identidade visual (DDR cap. 13). É a fonte dos tokens e componentes da change `identidade-visual`.

- **Dados fictícios:** nomes, fotos, votos, gastos e obras são inventados. As cores de partido são provisórias.
- **Como abrir:** o arquivo não tem a estrutura `<html>`/`<head>` porque foi feito para a plataforma de artefatos. Para ver localmente, abra-o direto no navegador (funciona em modo de compatibilidade) ou envolva-o num `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>…</body></html>`.
- **Mapa:** os contornos das UFs vêm da API de malhas do IBGE (`servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=intermediaria`), obtidos em 2026-10-26, simplificados e projetados para SVG.
- **Referências de interação:** seuimposto.com (Pandora) para mapa, gaveta e painel de compartilhar; 12axes.vercel.app para o card vertical de compartilhamento.

Este arquivo não é usado pelo site. Ele não deve ser editado para evoluir o visual: mudanças de identidade passam por uma change do OpenSpec.
