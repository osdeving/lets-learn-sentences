# Ouvir Inglês

Aplicativo React orientado a dados para estudar as 3.000 expressões de
`Guia_3000_Expressoes_Ingles_PTBR.pdf` e avançar do A1 ao C2 com voz humana, short stories,
diálogos, expressões, gramática, ditado e prática contínua de listening.

## Método de listening — atualização atual

A aba inicial **Método listening** aplica o método anexado em **24 lições de oito semanas**, com
**70 microclipes humanos**, **sete contrastes de sons (14 gravações)**, ditado sem pistas,
comparação por palavras/caracteres, microloops de 5–10 repetições, shadowing e revisão surpresa.
A trilha usa as oito gravações ELLLO baixadas nesta sessão, as palavras Commons e os 28 clipes
Tatoeba existentes. Ela também oferece narrow listening por falante, reforço baseado nos erros,
agenda diária, conversas completas, backup e preparo offline de todos os arquivos.

O primeiro teste e a retenção em outro dia são medidos separadamente. Testes de transferência
usam trechos reservados fora das lições. As revisões avançam por 1, 3, 7, 14 e 30 dias;
repetições no mesmo dia não contam como retenção.

O [guia do método e da sessão anterior](docs/listening-method.md) explica o que foi recuperado,
como cada sugestão virou recurso, as fontes e os limites das estimativas de alinhamento.

Para usar a versão completa em casa:

```bash
pnpm build
pnpm preview --host 127.0.0.1
```

Abra `http://127.0.0.1:4173` e clique em **Preparar modo offline** na trilha. Isso salva todos os
áudios, inclusive os ainda não ouvidos. Depois, a rede pode ser desligada. O progresso continua
no navegador; exporte o backup pela trilha para guardá-lo.

O pacote pronto está em `output/ouvir-ingles-listening-offline.zip`. Extraia-o e siga
`COMO-USAR.txt`; todos os áudios já estão incluídos. Para gerar uma nova cópia, execute
`pnpm package:offline`.

## Tecnologia

- React 19 + TypeScript.
- Vite para desenvolvimento e build estático.
- pnpm para dependências e scripts.
- Web Speech API para síntese de voz.
- MediaRecorder API para gravação local.
- `localStorage` para favoritas, progresso, voz e velocidade.
- Service Worker com manifesto de build e download completo dos arquivos para uso offline.

## O que existe no app

- 3.274 sentenças, incluindo 120 expressões idiomáticas com tradução literal e sentido real.
- 82 diálogos em níveis A1–C2 e temas como amizades, relacionamento, trabalho, entrevistas,
  tecnologia, ética, negociação, mídia e situações cotidianas.
- 3 diálogos com voz humana da VOA Learning English, transcrição dividida por fala e reprodução
  do trecho exato de cada linha.
- 28 clipes de voz humana do Tatoeba em CC BY 4.0, com 255 palavras alinhadas ao áudio: clique
  em uma palavra para ouvir o intervalo original, não uma voz sintetizada.
- 12 short stories com navegação por trechos; duas têm narração humana da VOA e dez usam a
  melhor voz inglesa disponível no aparelho.
- 36 lições de gramática voltadas ao que se ouve na fala, incluindo inversão, hedging, elipse,
  condicionais mistos e registro avançado.
- Trilha progressiva em seis etapas: Fundamentos, Cotidiano, Autonomia, Naturalidade, Nuance e
  Domínio.
- Treino de ditado, compreensão de sentido e resposta de conversa.
- Ajudas desligadas por padrão: tradução, pronúncia aproximada, áudio lento e banco de palavras.
  A transcrição completa aparece como último recurso após duas tentativas.
- Fluxo contínuo configurável: ao acertar, o app avança e reproduz o próximo áudio sozinho. A
  biblioteca humana e as histórias também continuam sem exigir novos cliques.

## Rodar localmente

```bash
pnpm install
pnpm dev
```

O Vite mostra a URL local, normalmente `http://localhost:5173`. A gravação exige permissão do
microfone. O áudio gravado não sai do navegador.

## Validar e compilar

```bash
pnpm validate
pnpm test:listening
pnpm build
pnpm preview
```

O build final fica em `dist/` e pode ser hospedado como site estático.

## Estrutura

```text
src/
  components/       interface de estudo e diálogos
  hooks/            voz, gravação e integração WebMCP
  lib/              carregamento de conteúdo, armazenamento e texto clicável
  App.tsx            estado e fluxos do produto
public/
  audio/elllo/       conversas e demonstrações humanas para estudo offline
  audio/commons/    palavras para contrastes de sons, com créditos individuais
  audio/tatoeba/     frases humanas com licença individual CC BY 4.0
  audio/voa/         conversas humanas em domínio público
  audio/stories/     trechos narrados de contos da VOA
  data/              todo o conteúdo consumido pela interface em JSON
scripts/
  build-expanded-content.mjs  gera as bases A1–B2
  build-next-content.mjs      gera C1/C2, diálogos, expressões, gramática e histórias
  import-tatoeba-audio.mjs    converte o alinhamento do Whisper em intervalos por palavra
  download-human-audio.sh     baixa novamente os MP3s públicos da VOA
  extract_guide.py   extrai novamente as 3.000 entradas do PDF
  validate-content.mjs
  ui-smoke.mjs       teste funcional e capturas via Chrome DevTools
```

## Adicionar uma sentença

Inclua um objeto em `public/data/extras.json`:

```json
{
  "id": "E031",
  "english": "The sentence in English.",
  "pronunciation": "da SÉN-tans in ÍNG-glich.",
  "portuguese": "A sentença em português.",
  "categoryId": "18",
  "situationId": "extra-18",
  "situationTitle": "Variações novas: aprendizagem",
  "origin": "extra",
  "audioUrl": null
}
```

Para usar áudio humano ou TTS pré-gerado, coloque o arquivo em `public/audio/` e informe
`/audio/E031.mp3` em `audioUrl`. O app usa esse arquivo primeiro e mantém a voz do navegador como
fallback.

Diálogos ficam em `public/data/dialogues.json`, expressões em `public/data/idioms.json`, gramática
em `public/data/grammar.json`, histórias em `public/data/stories.json` e a biblioteca humana em
`public/data/audio-library.json`. O app lê esses arquivos na inicialização; alterar os dados já muda
a interface e os exercícios sem editar componentes React. Após uma mudança, execute
`pnpm validate` e `pnpm build`. O build calcula uma versão do cache a partir dos arquivos;
instalações existentes recebem o novo conteúdo no próximo acesso conectado.

Para reconstruir as três bases expandidas ou baixar novamente os áudios humanos:

```bash
pnpm content:build
pnpm audio:download
```

Os arquivos da VOA foram selecionados apenas de páginas em que o áudio e a transcrição são de
produção própria da VOA. No Tatoeba, somente gravações marcadas explicitamente como CC BY 4.0
foram incluídas. Cada item guarda autor, título, URL e licença no próprio JSON e exibe o crédito na
interface.

## Recriar os dados do guia

Com `pdftotext` (Poppler) instalado:

```bash
python3 scripts/extract_guide.py
```

O extrator só conclui se encontrar todos os IDs de `0001` a `3000`, 30 categorias e 300 situações.

## Publicar no GitHub Pages

O workflow `.github/workflows/pages.yml` valida, compila e publica a cada push em
`main`. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
O caminho do site é detectado automaticamente. JSON, gravações, instalação e modo
offline funcionam também no endereço de projeto `/lets-learn-sentences/`.

Para conferir esse mesmo caminho localmente:

```bash
VITE_BASE_PATH=/lets-learn-sentences/ pnpm build
VITE_BASE_PATH=/lets-learn-sentences/ pnpm preview
```

Abra `http://localhost:4173/lets-learn-sentences/`. Os 57 áudios locais são incluídos
no build. Exportações em `output/`, dependências e metadados locais de hospedagem
são excluídos do Git. As fontes e os créditos dos áudios continuam nos dados e na interface.
