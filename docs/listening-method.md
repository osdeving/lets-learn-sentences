# Método de listening e contexto recuperado

## De onde o app partiu

Recuperei o histórico local da sessão `01a101d3-6ce4-7321-87ff-fd49cdfc1974`, iniciada em 3 de outubro de 2026 neste projeto. A última conversa relacionada ao app passou por estas etapas:

1. Extração das 3.000 sentenças do PDF, criação de novas sentenças e oito diálogos, reprodução de palavras/frases e gravação local.
2. Migração, a seu pedido, de JavaScript puro para React 19, TypeScript, Vite e pnpm.
3. Ampliação para diálogos por tema, expressões idiomáticas, gramática e exercícios de listening com pistas opcionais.
4. Inclusão de C1/C2, áudio humano Tatoeba com palavras alinhadas pelo Whisper.cpp, histórias VOA e avanço automático.

O estado atual dos JSONs confirmou o último resumo: 3.274 sentenças, 82 diálogos, 120 expressões, 36 lições de gramática, 28 clipes Tatoeba e 12 histórias. A sessão anterior relatou publicação no Site e commit `0b0481d8`; este diretório local não tem `.git`, portanto não foi possível verificar esse commit aqui. A atualização desta sessão é local e offline, conforme seu pedido.

Whisper.cpp transcreve e estima intervalos: ele não produz a voz dos exercícios. A nova trilha usa arquivos de gravações humanas; a voz do navegador continua disponível nas outras seções.

## Cada sugestão virou um fluxo do app

| Sugestão do texto | Como foi aplicada |
| --- | --- |
| Diagnosticar som vs. vocabulário | Primeiro ditado antes de revelar; categorias separadas para palavra desconhecida e conhecida mas não reconhecida |
| Clipes curtos reais | 70 recortes/áudios referenciados; muitos entre 3 e 10 segundos, alguns chunks menores e um trecho maior para continuidade |
| Ouvir 2–3 vezes | Primeiro botão executa duas reproduções em 1×; é possível repetir |
| Microditado | Campo sem corretor e sem banco de palavras |
| Revelar e comparar | Comparação por palavras, auxiliares omitidos e palavras extras; comparação por caracteres opcional |
| Identificar o erro | Nove categorias marcadas pelo estudante; nenhuma causa é inventada automaticamente |
| Microloop | Seleção da primeira e última palavra, ajustes de borda, 5 ou 10 repetições e pausa configurável |
| Imitar com atraso e junto | Duas opções de shadowing, pausa para repetir e gravação local opcional |
| Reprodução surpresa | Fase sem texto ao terminar e fila de revisão que já abre diretamente sem pistas |
| Velocidade real | 1× por padrão; 0,9× apenas como diagnóstico após revelar |
| Chunks e reduções | Lições com going to, want to, have to, kind of, do/did/could you e auxiliares |
| Weak forms, linking e fonemas | Lições próprias, exemplos contextualizados e sete contrastes com gravações humanas |
| Acesso lexical rápido | Lições com reconhecimento de chunks e continuidade sem traduzir palavra por palavra |
| Narrow listening | Filtro persistente por falante para novas lições, reforço e revisões |
| Rotina diária | Agenda de 20, 45, 75 ou 90 minutos, com os cinco blocos do texto e listening por prazer no plano de 90 min |
| Ambiente relaxado | Preparação curta, pausas e instruções para manter a voz clara; música de fundo opcional apenas na preparação |
| Exposição contextualizada | Reprodução das conversas completas já armazenadas localmente |
| Perfil adaptativo | Distribuição das dificuldades registradas e fila que prioriza os padrões mais frequentes |
| Aprendizado vs. memorização | Pontuação imediata separada de retenção; testes em recortes reservados fora das lições |

As 24 lições estão organizadas em oito semanas, três por semana. Os outros dias servem para revisões, prática com a mesma voz e exposição prazerosa. A duração é uma sugestão; não existe obrigação de terminar uma frase em um tempo fixo nem promessa de fluência em oito semanas.

## Revisões e métricas

O primeiro teste agenda uma revisão em um dia. Após uma revisão bem sucedida em outro dia, o intervalo progride para 3, 7, 14 e 30 dias. Dificuldade ou pontuação abaixo de 95% retorna a um dia; erro importante ou “preciso repetir” retorna a dez minutos. Repetir no mesmo dia não aumenta o intervalo nem conta como retenção. Só uma revisão sem pistas feita ao menos 20 horas após o último estudo alimenta a métrica tardia.

A comparação aceita formas como `couldn't / could not`, `gonna / going to` e `would've / would have`, preservando a necessidade de reconhecer os auxiliares. A pontuação é textual e não avalia a pronúncia ou faz diagnóstico clínico. `I'd` e outras formas ambíguas dependem do contexto; reveja divergências no texto original.

Os percentuais do mapa são a distribuição das categorias que você marcou, não uma classificação automática do motivo de cada erro. Uma tentativa pode ter mais de uma categoria.

## Fontes e seleção de áudio

A pesquisa orientou a seleção por alvos fonéticos; não existe evidência de que um determinado MP3 seja universalmente “o mais difícil” para todo brasileiro. Seus registros permitem ajustar o treino ao seu caso.

- [Estudo sobre percepção dos sons do inglês por brasileiros](https://www.scielo.br/j/tla/a/JW5yXxjrmJnDh6nZ6nNPxjs/?lang=en): referência para contrastes de vogais, TH e consoantes finais.
- [British Council: connected speech](https://www.teachingenglish.org.uk/professional-development/teachers/teaching-knowledge-database/c/connected-speech): referência para formas fracas, ligação, assimilação e elisão.
- [ELLLO: guia de uso offline](https://elllo.org/about/teacher_tips.htm) e [permissão educacional sem uso comercial](https://www.elllo.org/english/Mixers/?D=A): oito arquivos com conversas e demonstrações, como computadores, dirigir, planos, férias e hipóteses sobre o passado.
- [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:En-us-ship.ogg): autor e licença individual preservados para 14 gravações de palavras. O par full/fool tem vozes diferentes; compare também em contexto.
- Tatoeba: reutilização dos 28 arquivos CC BY 4.0 já incorporados ao projeto.

O ELLLO combina conversas espontâneas e demonstrações didáticas; o JSON distingue os dois tipos. Nem toda gravação tem o mesmo grau de redução. Grafias como “didja” são pistas de possibilidades fonéticas, não afirmações de que todos os falantes pronunciam sempre dessa forma. Créditos aparecem no exercício, e os MP3 completos ficam disponíveis no bloco de listening por prazer.

Os intervalos de palavras são estimativas automáticas. O recorte pode ser ajustado no próprio microloop. O sistema guarda a transcrição escrita, sem substituir gravações humanas por fala sintetizada quando algum arquivo estiver ausente.

## Usar em casa

Execute `pnpm build` e `pnpm preview --host 127.0.0.1`. Abra `http://127.0.0.1:4173`, vá a **Método listening** e clique em **Preparar modo offline**. O app salva todos os arquivos do manifesto, inclusive os áudios que você ainda não tocou. Depois ele funciona com a rede desligada nesse navegador. Também pode ser servido por `python3 -m http.server 4173 --directory dist`.

O manifesto inclui o JavaScript/CSS compilado e todos os dados/áudios. O service worker atende pedidos de intervalos do player a partir dos arquivos completos em cache. O botão confirma o preparo real; uma falha parcial permite repetir a operação aproveitando os arquivos já salvos. O modo de desenvolvimento não instala esse cache.

Atualizações preservam as gravações já baixadas quando seu hash SHA-256 corresponde ao arquivo atual. O player solicita a reprodução no próprio clique, reutiliza o elemento de áudio e distingue bloqueio do navegador de falhas no arquivo; a opção de tentar novamente mantém o exercício aberto.

O progresso fica no navegador. Exporte um backup pela trilha; para restaurar, selecione o JSON e confirme a substituição após conferir o resumo. Gravações de imitação são temporárias e não entram no backup.

O pacote `output/ouvir-ingles-listening-offline.zip` inclui o app compilado, todos os áudios, este guia e instruções de abertura. Para recriá-lo com as alterações mais recentes, execute `pnpm package:offline`.

## Manutenção

- Conteúdo consumido: `public/data/decoding.json`.
- Gerador reproduzível: `scripts/build-decoding-content.mjs`, com alinhamentos em `scripts/elllo-alignments.json`.
- Originais ELLLO e páginas de origem: `scripts/elllo-downloads.json`.
- Metadados por arquivo Commons: `scripts/sound-pairs-sources.json`; downloader: `scripts/download-sound-pairs.py`.
- Regras de comparação, revisões e priorização: `src/lib/decoding.ts`.
- Player de intervalos: `src/hooks/useClipPlayer.ts`.
- `pnpm validate`, `pnpm test:listening`, `pnpm build` e os testes de interface verificam dados, regras, comportamento e modo offline.
