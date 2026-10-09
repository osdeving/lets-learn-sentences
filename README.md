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

## Mr. English

O episódio **Smart English Learning Tips**, do canal **Mr. English Channel**, tem
uma [aba dedicada](https://osdeving.github.io/lets-learn-sentences/#mr-english).
São cerca de 12min28s de áudio, 1.877 ocorrências de palavras, 538 palavras únicas
e 189 sentenças. Os três modos usam intervalos do mesmo MP3 original:

- **Áudio completo**: pausar, continuar, buscar no episódio e acompanhar a palavra
  ativa no centro da parte visível da transcrição. Clique em uma palavra para
  continuar o podcast daquele ponto.
- **Palavras**: filtrar por grupos de vocabulário, buscar, ordenar ou embaralhar.
  Palavras repetidas ficam em um card com todas as ocorrências disponíveis;
  escolha a ocorrência para ouvir sua pronúncia naquele contexto.
- **Sentenças**: ouvir cada frase separadamente, com filtros de perguntas e tamanho.

Em Palavras e Sentenças, **Escuta** permite repetir e avançar automaticamente.
**Shadowing** toca o trecho as vezes escolhidas, reproduz o aviso fixo “Repeat
please” e espera sua resposta. A pausa padrão é `max(2s, duração / velocidade ×
1,5 + 1s)`. Configure o multiplicador, tempo extra, mínimo e repetições; um ajuste
em segundos pode substituir o cálculo só para o item atual. Esses ajustes ficam
no navegador, separados por episódio e modo. Limpar o campo do item restaura o
cálculo automático. Parar, trocar filtro ou aba cancela a sequência pendente.
O aviso é voz sintética gerada localmente com FFmpeg/CMU Flite `slt`, sem créditos
ou API paga; ele também entra no pacote offline.

**Falar e comparar** oferece gravação local, reprodução da sua voz e, em
navegadores compatíveis, reconhecimento de fala em inglês. A comparação verifica
as palavras reconhecidas, normalizando pontuação e contrações comuns; não mede
pronúncia nem semelhança acústica. O reconhecimento só inicia pelo botão próprio,
com aviso de que o navegador pode enviar áudio ao seu serviço e depender de rede.
A gravação local continua disponível quando não há reconhecimento compatível.

As categorias de palavras são listas de vocabulário, não análise gramatical de
cada ocorrência. Sentenças são divididas pela pontuação da transcrição, preservando
abreviações como “Mr.”. Todos os tokens originais permanecem cobertos. Os intervalos
foram gerados localmente pelo Whisper `small.en` e podem precisar de correção.
O link antigo `#audio=YT-ysxR8IYe4Jo` também abre a aba Mr. English.

A gravação foi publicada após a declaração de autorização do responsável pelo
app. Não foi identificada licença pública nos metadados do vídeo, nem verificado
se as vozes são humanas ou sintetizadas. A fonte permanece identificada como
YouTube. A transcrição é automática, não inclui tradução e pode precisar de
correções; o podcast completo não entra no sorteio de ditados curtos.

O importador `scripts/import-youtube-audio.py` recebe o MP3 local, o JSON do Whisper
com `word_timestamps` e os metadados do vídeo. Ele exige confirmação de permissão,
preserva os clipes existentes e salva a transcrição em
`public/data/youtube-transcripts/ysxR8IYe4Jo.json`. Reimportar os clipes Tatoeba
também preserva as gravações de outras fontes.

## Contribuir com gravações

Use seus próprios créditos do ElevenLabs pelo site e envie MP3s, sem código nem
chave de API. O [guia de contribuição](CONTRIBUTING.md) explica a reserva de IDs,
os envios de áudio e as sugestões de frases novas. O
[catálogo público](https://osdeving.github.io/lets-learn-sentences/contribuir.html)
mostra a fonte atual de cada sentença, as gravações humanas e uma prévia local
para comparar arquivos antes do envio.

## Voz ElevenLabs nas sentenças

As sentenças com MP3 pré-gerado usam a voz **Chris**, em inglês americano, do
ElevenLabs (`eleven_multilingual_v2`). O cartão identifica a voz e o rodapé mostra
quantas sentenças já têm gravação. As demais continuam usando a voz do aparelho.
A escuta contínua, a velocidade e o treino de ditado usam os mesmos MP3s.

O lote inicial contém **358 sentenças**, com **9.997 créditos** consumidos dos
10.000 disponíveis no plano free. Distribui as gravações pelas 30 categorias do guia, reutiliza as
cinco amostras aprovadas e evita gerar novamente textos idênticos. A geração para
quando nenhuma frase restante cabe nos créditos gratuitos disponíveis.
`public/data/elevenlabs-generation.json` registra voz, parâmetros, duração, custo
informado pela API e hash de cada arquivo. Todos os MP3s entram no cache offline.

Para consultar o saldo ou continuar a geração após a renovação dos créditos:

```bash
python3 scripts/generate-elevenlabs.py --env-file /caminho/privado/.env.elevenlabs
python3 scripts/generate-elevenlabs.py --env-file /caminho/privado/.env.elevenlabs --generate
pnpm validate
pnpm test:playback
pnpm build
```

O arquivo privado deve conter `ELEVENLABS_API_KEY`. A chave não participa do build
nem é enviada ao navegador. O script exige plano free e não ativa cobrança extra.
Se houver uma falha de rede com resultado desconhecido, confira o histórico do
ElevenLabs antes de repetir a requisição.

Os áudios deste lote foram gerados no plano gratuito e destinam-se a uso não
comercial, com atribuição a **elevenlabs.io**, conforme as
[condições de publicação do ElevenLabs](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform).
As gravações humanas da trilha mantêm seus intervalos por palavra e créditos.

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
microfone. A gravação local não sai do navegador; o reconhecimento opcional pode usar o
serviço de fala do navegador, como descrito na aba Mr. English.

## Validar e compilar

```bash
pnpm validate
pnpm test:listening
pnpm test:playback
pnpm test:vocabulary
pnpm test:mr-english
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

## Escuta automática

Em Sentenças (inclusive Favoritas), escolha os filtros e clique em **Iniciar escuta
automática**. Cada frase toca três vezes, com uma pausa de 500 ms entre reproduções
e itens. Repetições (1–20), pausa (0–10.000 ms), avanço automático e reinício da
seleção são configuráveis e ficam salvos no navegador. A fila para no fim por
padrão. Sentenças sem MP3 usam a voz inglesa escolhida nos filtros.

Áudio humano, Histórias e Diálogos oferecem os mesmos controles. Nas histórias a
fila percorre os trechos da história escolhida; nos diálogos ela percorre as falas
dos diálogos filtrados. Trocar filtros, navegar manualmente, gravar ou mudar de aba
interrompe a fila. As atividades de ditado continuam exigindo sua resposta.

`pnpm test:playback` verifica a recuperação do AbortError na primeira tentativa e
a fila de repetições, pausas, avanço, cancelamento e configurações salvas.

### Mais vozes humanas

A aba **Mais vozes humanas** inclui 51 conversas completas do ELLLO (A2–B2) nos players oficiais do SoundCloud. A fila usa a API oficial do player para repetir ao término real da gravação, respeitar a pausa e avançar. Padrão: 3 repetições e 500 ms. Há filtros por fonte, nível e assunto. O player incorporado também tem seu próprio play para escuta manual.

Há mais 50 aulas ELLLO (A1–B1) com acesso à página original, 12 aulas A1 e os catálogos A2–C1 do British Council, além da aula gratuita semanal e do podcast do ESLPod. Esses acessos abrem as páginas oficiais: seus áudios não são republicados. ELLLO bloqueia hotlinks de seus MP3s a partir de outros sites; por isso usamos os embeds oficiais onde disponíveis. Os recursos externos precisam de internet e não entram no pacote offline. As transcrições e os exercícios ficam junto das aulas originais.

Metadados: `public/data/human-sources.json`. Para atualizar a seleção: `python3 scripts/import-human-sources.py`. O importador guarda apenas URLs e títulos; não copia áudios ou transcrições para o repositório.

Fontes e condições de uso:
- https://www.elllo.org/about/faq.htm
- https://www.britishcouncil.org/terms
- https://tv.eslpod.com/p/terms
- https://developers.soundcloud.com/docs/api/html5-widget

### Fundamentos de gramática

A aba Gramática começa com oito lições teóricas em português: start/starts,
auxiliares do/does/did, in/on/at para tempo e lugar, artigos, plurais,
presente simples versus contínuo e complementos com to/verbo base/-ing.
Cada lição inclui regras, tabela comparativa e exemplos com reprodução de voz.
As 36 lições anteriores permanecem disponíveis, assim como o filtro por nível.

A fonte editável é `scripts/content/grammar-theory.json`; `pnpm content:build`
integra esses fundamentos em `public/data/grammar.json` sem duplicar seus IDs.
