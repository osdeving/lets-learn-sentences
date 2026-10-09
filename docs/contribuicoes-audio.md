# Incorporar contribuições de áudio

Este procedimento é para mantenedores. O colaborador usa o [guia de contribuição](../CONTRIBUTING.md), envia uma issue e anexa os arquivos; não precisa abrir um pull request.

## Antes de alterar o catálogo

Registre a decisão na issue e confirme o texto falado, o ID, a tradução quando aplicável, a origem da gravação, os parâmetros de geração, o plano ativo na geração e a permissão de publicação. Escute o arquivo inteiro. Verifique se abre sem erro, se não contém palavras extras ou cortes e se o volume permite comparar com os áudios existentes.

A reserva e os estados do envio são mantidos em comentários. O catálogo mostra somente a versão incorporada. Não copie anexos para o app automaticamente nem conclua que uma issue com MP3 foi aprovada.

## Substituir uma sentença existente

1. Baixe o anexo aprovado e confira seu conteúdo. Use MP3; WAV pode ser convertido sem gerar voz novamente.
2. Coloque o arquivo em `public/audio/contributions/ID.mp3`. Preserve o arquivo anterior durante a revisão. Não use uma URL de anexo como endereço permanente do áudio no app: a cópia local é necessária para o cache offline.
3. Localize o ID no arquivo indicado pelo campo `dataset` do catálogo. Os dados de sentenças ficam em `public/data/sentences.json`, `extras.json`, `idioms.json` ou `advanced.json`.
4. Atualize somente `audioUrl` para `/audio/contributions/ID.mp3`. Preserve o ID, o texto e os outros campos. Uma correção do texto precisa ser revisada explicitamente.
5. Acrescente o registro da contribuição a `public/data/audio-contributions.json`, conforme o formato abaixo.
6. Valide, compile e publique. Registre na issue o commit e o endereço do app. Só então marque o envio como integrado.

O processo atual exige edição dos dados pelo mantenedor. Não há importador automático de anexos, aprovação automática nem substituição no treino principal a partir da prévia local.

## Registro de origem

`public/data/audio-contributions.json` começa com uma lista vazia. Cada arquivo incorporado precisa de um registro. Os valores abaixo explicam os campos; preencha com os dados reais do envio.

```json
{
  "sentenceId": "ID existente ou atribuído na revisão",
  "audioUrl": "/audio/contributions/ID.mp3",
  "kind": "replacement",
  "provider": "ElevenLabs",
  "voice": "Chris",
  "voiceId": "iP95p4xoKVk53GoZ742B",
  "model": "eleven_multilingual_v2",
  "settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0,
    "use_speaker_boost": true,
    "speed": 1
  },
  "generatedOn": "data informada pelo colaborador",
  "planAtGeneration": "free",
  "contributor": "nome público escolhido pelo colaborador",
  "issueUrl": "URL da issue do envio",
  "licenseUrl": "https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform",
  "publicationPermissionConfirmed": true,
  "sha256": "hash do arquivo incorporado"
}
```

Use `planAtGeneration: "paid"` quando o colaborador informar plano pago. Registre `generatedOn` como data no formato `AAAA-MM-DD`.

Use `kind: "new-sentence"` para uma frase nova. Para voz humana, use `provider: "human"`, informe a licença efetiva, o colaborador ou autor autorizado e a origem; modelo e configurações de síntese não se aplicam. Não transfira para a nova gravação uma licença pertencente ao áudio antigo.

O catálogo lê esse registro para distinguir ElevenLabs de gravação humana e exibir o crédito. O manifesto `elevenlabs-generation.json` continua sendo o histórico do lote gerado pela conta do projeto; uma contribuição feita pela conta de outra pessoa tem seu próprio registro.

## Acrescentar uma frase nova

Revise texto, tradução, contexto e possíveis duplicatas. Para uma sentença geral, atribua o próximo ID `E` disponível em `public/data/extras.json`, seguindo o formato das entradas existentes. Atualize `meta.count` e preencha categoria, situação, origem e `audioUrl`. Não reutilize um ID nem altere a numeração do guia de 3.000 frases.

O registro de áudio deve usar o ID definitivo e `kind: "new-sentence"`. Uma sugestão pode ser aprovada só como texto e continuar usando a voz do navegador enquanto aguarda gravação.

## Gravações humanas com intervalos

Diálogos, histórias, microclipes e a biblioteca humana usam intervalos dentro dos arquivos. Trocar um MP3 mantendo os tempos antigos faz o app reproduzir as palavras ou falas erradas.

Preserve o original e trate a síntese proposta como uma variante até reconstruir e validar os intervalos correspondentes: `audioStart`/`audioEnd` nas falas e segmentos, `start`/`end` nos microclipes e palavras. Confira as referências compartilhadas no inventário do catálogo. Mantenha o crédito humano ligado ao original e atribua a fonte correta à variante sintetizada.

O registro simples de contribuições de sentenças não integra automaticamente essas variantes. Para esses recursos, a revisão e os respectivos dados precisam de uma mudança específica.

## Verificações e publicação

Para conferir um arquivo local, sem enviar nada a um serviço:

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 public/audio/contributions/ID.mp3
ffmpeg -v error -i public/audio/contributions/ID.mp3 -f null -
sha256sum public/audio/contributions/ID.mp3
```

Depois da incorporação:

```bash
pnpm validate
pnpm test:playback
pnpm build
```

O build reconstrói o catálogo e o manifesto offline. Confira o cartão da frase, a reprodução no ditado, o endereço com o prefixo `/lets-learn-sentences/` e a presença do MP3 no manifesto. Um push aprovado em `main` publica pelo GitHub Pages. Não envie chaves, `.env` ou credenciais junto com os arquivos.
