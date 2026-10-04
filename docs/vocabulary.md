# Vocabulário orientado a dados

Edite `public/data/vocabulary/catalog.json`. A interface descobre categorias, grupos e verbetes pelo arquivo; não há cadastro de categorias no código. O contrato versionado está em `public/data/vocabulary/schema.json` (JSON Schema 2020-12). `pnpm validate` valida tipos, campos, IDs, relações, gramática e arquivos locais; a publicação também executa os testes de vocabulário.

## Novo verbete

```json
{
  "id": "teaspoon",
  "category": "kitchen",
  "group": "table",
  "frequency": "common",
  "partOfSpeech": "noun",
  "en": "teaspoon",
  "pt": "colher de chá",
  "pronunciation": {"ipa": "/ˈtiːspuːn/", "guide": "TÍ-spuun"},
  "emoji": "🥄",
  "examples": [{"en": "Add a teaspoon of sugar.", "pt": "Adicione uma colher de chá de açúcar."}],
  "notes": [{"kind": "usage", "text": "Também é uma medida de volume em receitas; abreviação: tsp."}],
  "related": ["spoon"]
}
```

Obrigatórios: identidade/categoria/grupo, inglês/português, classe, frequência, pronúncia, emoji e pelo menos um exemplo. Escolha exemplos naturais e diferentes entre si; explique armadilhas reais, não preencha notas por obrigação. IPA principalmente americano; guia português aproximado, com sílaba forte em maiúsculas. Específico não significa inútil; técnico identifica terminologia especializada, não uma frequência estatística.

Opcionais: `plural`, `pronunciation.tip`, `image: {src, alt}`, `variants` (en, pt, kind: synonym/regional/informal/technical, note, pronunciation), `chunks` (en/pt), `notes` (kind: usage/culture/pitfall/grammar, text), `related` (IDs), `grammar` (IDs das lições), `tags` e `sources` (URLs). Não trate palavras relacionadas como sinônimos exatos: explique diferenças no campo note.

## Áudio e imagens

`audioUrl` opcional funciona em verbetes, exemplos, variantes, combinações, categorias e grupos. Sem URL, usa síntese de voz inglesa do aparelho; isso é identificado na interface. Não depende de uma API paga nem promete voz humana. Com URL, usa o player de gravações. Caminhos como `/audio/vocabulary/teaspoon.mp3` apontam para `public/audio/vocabulary/teaspoon.mp3` e recebem automaticamente o prefixo do GitHub Pages. URLs HTTPS externas exigem disponibilidade, permissão e compatibilidade do servidor. Prefira arquivos próprios ou com licença para redistribuição; registre atribuição em sources/notas. Nunca inclua tokens em URLs.

Imagens locais seguem a mesma regra. SVGs deste catálogo são desenhos originais; outros verbetes usam emoji do dispositivo. Categorias têm `image`, `color` e `groups: [{id,en,pt}]`; opcionalmente `hotspots: [{group,x,y}]`, com posições percentuais sobre a imagem. Crie uma nova categoria e seus grupos no JSON, associe os verbetes e adicione a imagem: a tela passa a exibi-la automaticamente.

## Navegação e prática

Links `#vocabulary/<id>` abrem um verbete. Busca considera inglês, português, sinônimos, exemplos e tags, sem acentos. Salvos ficam no navegador. A escuta segue a seleção e inclui opcionalmente o primeiro exemplo; padrão 3 repetições e pausa de 500 ms. Mudar seleção para a fila. O desafio usa traduções distintas, priorizando alternativas da mesma categoria. Conteúdo local entra no manifesto offline; vozes remotas do sistema podem continuar exigindo internet.

Execute `pnpm validate`, `pnpm test:vocabulary`, `pnpm test:listening`, `pnpm test:playback` e `VITE_BASE_PATH=/lets-learn-sentences/ pnpm build` antes de publicar. O catálogo é a fonte principal: scripts antigos de geração de sentenças não o sobrescrevem.
