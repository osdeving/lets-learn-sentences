# Contribuir com áudio

Você pode apoiar o Ouvir Inglês usando créditos da sua própria conta do ElevenLabs.
Escolha uma frase, gere o áudio pelo site e envie o MP3 em uma issue. Não é preciso
programar, instalar ferramentas ou fornecer sua chave de API.

O [catálogo de áudio e contribuições](https://osdeving.github.io/lets-learn-sentences/contribuir.html)
mostra os IDs, o texto exato, a fonte atual e as frases que ainda precisam de gravação.

## O que já está no app

| Conteúdo | Áudio atual | Como contribuir |
| --- | --- | --- |
| 358 das 3.274 sentenças | Chris, do ElevenLabs; síntese de voz | Corrigir uma gravação com problema identificado |
| 2.916 sentenças | Síntese do navegador, sem MP3 próprio | Prioridade para gerar novos MP3s |
| Biblioteca de 28 clipes Tatoeba | Voz humana gravada, com palavras alinhadas | Sugerir uma alternativa, preservando o original |
| 3 dos 82 diálogos | Voz humana da VOA | Troca exige rever os intervalos de cada fala |
| Outros 79 diálogos | Síntese do navegador | Enviar proposta por fala, com identificação do diálogo |
| 2 das 12 histórias | Narração humana da VOA | Troca exige rever os intervalos de cada trecho |
| Outras 10 histórias | Síntese do navegador | Enviar proposta por trecho, com identificação da história |
| Trilha de listening | 70 microclipes humanos, vindos de ELLLO e Tatoeba | Troca exige realinhar as palavras |
| Contrastes de sons | 14 gravações humanas do Wikimedia Commons | Preservar a palavra e o contraste treinado |

Os conteúdos com voz humana compartilham **55 arquivos locais**. Microclipes,
falas e palavras podem usar partes de um mesmo arquivo; essas contagens não devem
ser somadas como se fossem gravações independentes. O catálogo é reconstruído no
build e mostra os valores atuais. Vocabulário, exemplos de gramática e palavras
isoladas também podem usar a voz do aparelho; o catálogo de sentenças não representa
cada ocorrência de texto desses recursos.

A aba **Fontes humanas** também oferece players e links externos de ELLLO,
British Council e ESLPod. Esses recursos externos não entram na contagem de
arquivos locais e não são convertidos por este fluxo de sentenças.

No CSV, `browser` indica voz do navegador; `elevenlabs`, síntese do ElevenLabs;
`human`, gravação humana; e `recorded`, outra gravação local.

**ElevenLabs é voz sintetizada**, mesmo quando soa natural. “Voz humana” neste
projeto identifica uma gravação de uma pessoa. Whisper.cpp foi usado para estimar
intervalos por palavra; não gera a voz das sentenças.

## Escolher e reservar uma frase

1. Abra o catálogo e filtre por **Voz do navegador**. Copie o ID e o texto em inglês.
2. Pesquise esse ID nas [issues abertas](https://github.com/osdeving/lets-learn-sentences/issues).
3. Abra [Substituir áudio de frase existente](https://github.com/osdeving/lets-learn-sentences/issues/new?template=audio-existente.yml).
   Escolha **Reservar antes de gerar**, informe os IDs e a previsão de entrega.
4. Espere a confirmação de que as frases estão livres antes de gastar seus créditos.
   Isso evita que duas pessoas gerem o mesmo lote. Preferimos lotes de 5 a 20 frases.

A reserva é um comentário público na issue, confirmado por um mantenedor. Ela não
muda o catálogo automaticamente. Se não puder concluir, avise na mesma issue para
liberar as frases. Sem entrega ou atualização por sete dias após a confirmação,
a reserva pode ser liberada pelo mantenedor.

## Gerar pelo site do ElevenLabs

Entre na sua própria conta em [ElevenLabs](https://elevenlabs.io/app). Abra o editor
de **Text to Speech**, escolha a voz **Chris — Charming, Down-to-Earth** e o modelo
**Eleven Multilingual v2**. O identificador da voz é `iP95p4xoKVk53GoZ742B`.

Use os parâmetros do primeiro lote quando estiverem disponíveis no editor:

| Parâmetro | Valor |
| --- | --- |
| Stability | 50% |
| Similarity | 75% |
| Style exaggeration | 0% |
| Speaker boost | Ativado |
| Speed | 1× |

Gere **uma frase por arquivo**, copiando apenas o inglês do catálogo. Preserve
pontuação, contrações e palavras. Não inclua tradução, pronúncia aproximada,
ID, apresentação ou instruções para o narrador no texto falado. Se algum controle
não estiver disponível, registre isso no envio. Outra voz ou modelo deve ser
combinado na reserva antes de gastar créditos, para manter a consistência do lote.

Baixe em MP3, preferencialmente 44,1 kHz / 128 kbps, se o editor oferecer essa opção.
Ouça o arquivo inteiro e confira palavras, início e fim, pausas e volume. Não inclua
música. Renomeie com o ID, por exemplo `0013.mp3`, preservando zeros iniciais.
Os créditos são usados na geração; o MP3 baixado pode ser ouvido sem gerar de novo.

## Enviar os arquivos sem código

Volte à issue da reserva e adicione um comentário com os arquivos. Arraste os MP3s
para o campo de texto do GitHub, ou use o controle para anexar arquivos. MP3 e WAV
são aceitos; o limite informado pelo GitHub é 25 MB por arquivo. Para um lote,
você também pode enviar um ZIP com os MP3s e um `envio.csv`.
[Como anexar arquivos no GitHub](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).

Informe a voz e o modelo efetivamente usados, os parâmetros, a data de geração,
o plano da conta **na data da geração**, seu nome público para o crédito e qualquer
limitação. Não envie chave de API, senha ou captura de tela com credenciais.

Exemplo de `envio.csv` para uma substituição:

```csv
tipo,id,arquivo,english,portuguese
substituir,0013,0013.mp3,"I need to clean the bathroom.","Preciso limpar o banheiro."
```

O exemplo usa a frase 0013 do catálogo. Para outro ID, copie o texto correspondente
sem alterar as palavras.

O envio fica **recebido**, aguardando revisão. Anexar um arquivo não o publica no
app, não reserva automaticamente o ID e não substitui o áudio atual.

## Sugerir uma frase nova

Abra [Nova frase com áudio](https://github.com/osdeving/lets-learn-sentences/issues/new?template=nova-frase-audio.yml).
Informe inglês, tradução em português, situação de uso, nível sugerido e origem do
texto. Antes de gerar, prefira enviar a ideia para verificar se ela já existe.

Quando houver áudio, anexe-o como `nova-frase-01.mp3`. O mantenedor atribuirá um ID
permanente após aprovar o texto e a tradução. Não use o ID de uma frase existente
para uma sugestão nova. Sugestões de texto sem áudio também são aceitas.

## Testar um MP3 temporariamente

No catálogo, selecione uma frase e escolha um MP3 no campo **Testar arquivo local**.
Você pode alternar entre o áudio atual e sua proposta para comparar. O teste usa
um arquivo do seu aparelho, sem upload nem geração no ElevenLabs.

Essa prévia fica somente na página do catálogo. Ao fechar ou recarregar a página,
a seleção é descartada. O treino principal, o progresso e os arquivos públicos
continuam usando o áudio aprovado. Para compartilhar a proposta, anexe-a à issue.

## Crédito e permissão de publicação

Cada pessoa usa sua própria conta e contribui voluntariamente. Aceitamos áudio
ElevenLabs do plano free para este projeto de uso não comercial, com atribuição a
**elevenlabs.io**. Conteúdo gerado no plano gratuito continua sujeito a essa condição
mesmo que a pessoa assine um plano pago depois. Registre o plano que estava ativo
quando o arquivo foi gerado.
[Condições de publicação do ElevenLabs](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform).

Ao enviar, confirme que pode autorizar a publicação do arquivo e do texto enviado
no repositório público e no app, respeitando as condições da origem. Para gravação
própria, informe uma licença de uso que conceda essa permissão. Não envie uma voz
clonada de terceiros sem autorização nem remova os créditos de material existente.
O crédito do colaborador registra quem enviou o arquivo; não atribui a ele direitos
sobre a voz do serviço ou sobre gravações de outras pessoas.

## Revisar e integrar

O processo público na issue segue estes estados: **proposto → reservado → recebido
→ em revisão → aprovado → integrado**, ou **ajustes solicitados / recusado**.
São estados registrados por comentários do mantenedor; ainda não existe uma fila
automática nem leitura das issues pelo catálogo.

O mantenedor confere o ID, o texto falado, a tradução quando aplicável, a voz,
a qualidade, a origem e a permissão de publicação. Uma substituição conserva o
ID e o progresso de estudo. Uma frase nova recebe um ID sem colisões e entra no
catálogo após a aprovação.

A [parte técnica da incorporação](docs/contribuicoes-audio.md) fica com quem mantém
o app. O objetivo é que o colaborador entregue o arquivo e os dados, sem editar
código. O app só passa a usar o áudio após a incorporação e a publicação.
