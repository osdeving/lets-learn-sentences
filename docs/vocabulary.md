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

## Histórias do cotidiano

O campo opcional `stories` do mesmo catálogo conecta o vocabulário a diálogos originais. Cada história tem `id`, `en`, `pt`, `description`, `image`, `characters` (nomes dos participantes) e `scenes`. Cada cena contém:

```json
{
  "id": "breakfast",
  "en": "Breakfast together",
  "pt": "Café da manhã juntos",
  "setting": {"en": "Peter and Sam are in the kitchen.", "pt": "Peter e Sam estão na cozinha."},
  "words": ["mug", "toast"],
  "lines": [
    {"speaker": "Peter", "en": "Where’s my mug?", "pt": "Cadê minha caneca?"},
    {"speaker": "Sam", "en": "It’s next to your toast.", "pt": "Está ao lado da sua torrada."}
  ]
}
```

Os IDs em `words` ligam a cena ao catálogo e geram os destaques no texto. São reconhecidas palavras inteiras, plurais registrados, plurais simples com -s e variantes do verbete; prefira incluir a forma plural explícita para irregularidades. Não é um analisador linguístico: a lista de palavras da cena deve ser revisada editorialmente. O leitor permite consultar o verbete sem sair da conversa, ouvir cada fala, ocultar a tradução e ouvir a cena ou todas as cenas em sequência. Cenário, título e falas aceitam `audioUrl`, com voz sintética como alternativa. A fila repete cada fala conforme a configuração; os personagens alternam entre duas vozes disponíveis, sem prometer uma voz exclusiva para cada pessoa.

Use diálogos naturais com continuidade, perguntas e respostas; não transforme todas as falas em listas de objetos. Preços ou situações em diálogos são exemplos ficcionais, não informações sobre serviços reais. A validação rejeita palavras inexistentes, falantes não declarados, cenas duplicadas e traduções ausentes. Novas histórias e cenas exigem somente JSON e, se desejado, novos arquivos de imagem/áudio.
