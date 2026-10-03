import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const read = async path => JSON.parse(await readFile(path,'utf8'));
const library = await read('public/data/audio-library.json');
const sources = {
  'past': { title:'Summer break — perguntas com did you', url:'https://elllo.org/english/grammar/A1-23-Past-Tense.htm', contributor:'Todd Beuckens e Abidemi', kind:'conversation', download:'https://elllo.org/Audio/AGTK/A1-23-Abidemi-Past-Tense-SEA.mp3' },
  '081': { title:'Teens and Computers', url:'https://elllo.org/english/0051/081-Jeanna-Computers.htm', contributor:'Todd Beuckens e Jeanna', kind:'conversation', download:'https://elllo.org/Audio/A0051/081-Jeanna-Computers.mp3' },
  '063': { title:'Driving', url:'https://elllo.org/english/0051/063-Jeanna-Driving.htm', contributor:'Todd Beuckens e Jeanna', kind:'conversation', download:'https://elllo.org/Audio/A0051/063-Jeanna-Driving.mp3' },
  'conditionals': { title:'Do Over — Past Conditional', url:'https://elllo.org/english/grammar/B1-20-Past-Conditional.htm', contributor:'Sarah e Adam', kind:'conversation', download:'https://elllo.org/Audio/AGTK/B1-20-Past-Conditional-Adam-DoOver.mp3' },
  'going-to': { title:'Going to — quatro conversas', url:'https://elllo.org/book/A2/A2-05-Going-To.html', contributor:'ELLLO · elenco de Going to', kind:'demonstration', download:'https://elllo.org/Audio/SoundGrammar/A2-Audio/A2-05-Going-To.mp3' },
  '1416-have-to': { title:'Have to — demonstração em contexto', url:'https://elllo.org/english/1401/1416-MegTodd-Chores-Laundry.htm', contributor:'Todd Beuckens · demonstração', kind:'demonstration', download:'https://elllo.org/ANA/AN/1401AN/1416-1-have-to.mp3' },
  '1426-kind-of': { title:'Kind of like — demonstração em contexto', url:'https://elllo.org/english/1401/1426-MegTodd-Animals-Zoo.htm', contributor:'Todd Beuckens · demonstração', kind:'demonstration', download:'https://elllo.org/ANA/AN/1401AN/1426-6-kind-of-like.mp3' },
  '1366-would-have': { title:'Otherwise — would you have', url:'https://elllo.org/english/1351/T1366-AdamSarah-02-DoOver.htm', contributor:'Todd Beuckens · demonstração', kind:'demonstration', download:'https://elllo.org/ANA/AN/1351AN/1366-2-otherwise.mp3' },
};
// Exact excerpts, selected against the published transcripts and local ASR output.
// Word boundaries are automatically estimated; the player exposes fine adjustments.
const selected = [
  ['E39','past',0,7.79,'Todd Beuckens','Abidemi, what did you do for summer break?','Abidemi, o que você fez nas férias?',['linking','boundary'],'Abidemi é o nome da interlocutora. O alvo é did you como um grupo: a transição pode se compactar, mas did continua marcando o passado.'],
  ['E40','past',25.04,28.10,'Todd Beuckens','What did you do in each country?','O que você fez em cada país?',['linking','boundary'],'Did you do passa rapidamente. Faça um loop desse grupo e volte à pergunta inteira.'],
  ['E41','past',42.56,45.90,'Todd Beuckens','What foods did you eat?','Que comidas você comeu?',['linking','phoneme'],'Escute as consoantes de foods did you e a passagem para eat sem inserir uma vogal extra.'],
  ['E42','past',55.44,60.47,'Todd Beuckens','Did you go anywhere in Thailand, like the beach or the forest?','Você foi a algum lugar na Tailândia, como a praia ou a floresta?',['linking','weak-form'],'Did you inicia a pergunta; the, or e the ficam fracos entre beach e forest.'],
  ['E01','081',8.0,14.98,'Jeanna','Well, I go on the computer a lot and I talk with friends through AOL instant messenger.','Uso bastante o computador e converso com amigos pelo mensageiro do AOL.',['boundary','linking'],'Ouça “go on”, “a lot” e “talk with friends” como grupos. As palavras funcionais recebem menos destaque.'],
  ['E02','081',16.0,21.98,'Jeanna',"And I just moved from my hometown to Sacramento, so it's a good way to keep in touch with old friends.",'Acabei de me mudar da minha cidade para Sacramento, então é um bom jeito de manter contato com amigos antigos.',['boundary','weak-form'],'Separe o fluxo em “moved from my hometown” e “keep in touch with old friends”; não espere uma pausa a cada palavra.'],
  ['E03','081',22.0,24.98,'Todd Beuckens','Yeah. Do you learn about computers at school or on your own?','Você aprende sobre computadores na escola ou por conta própria?',['boundary','weak-form'],'Observe “do you” e “at school or on your own”. Escute a ligação e o ritmo da pergunta.'],
  ['E04','081',39.0,41.98,'Todd Beuckens','Yeah. Do you like your computer or do you want a new one?','Você gosta do seu computador ou quer um novo?',['reduction','weak-form'],'O desafio são as palavras pequenas entre computer e new one. Compare “do you” nas duas perguntas.'],
  ['E05','081',46.0,47.98,'Todd Beuckens','Okay. How long have you had your computer?','Há quanto tempo você tem seu computador?',['weak-form','contraction'],'Encontre “have you had”. O have pode perder força; had ainda precisa aparecer no seu ditado.'],
  ['E06','081',48.0,49.98,'Jeanna',"I've had it for about three or four years.",'Tenho ele há cerca de três ou quatro anos.',['contraction','weak-form'],"Escute “I've had it”, sem separar artificialmente I / have / had / it. For e or não recebem a mesma força que years."],
  ['E07','081',53.13,55.98,'Todd Beuckens','So you talk with your friends every night by email?','Então você conversa com seus amigos toda noite por e-mail?',['boundary','speed'],'Reconheça “with your friends” rapidamente para ainda acompanhar “every night by email”.'],
  ['E08','081',63.13,67.98,'Todd Beuckens','So nowadays, do high school kids talk by email more than phone?','Hoje em dia os estudantes conversam mais por e-mail do que por telefone?',['speed','phoneme'],'Não fique preso em nowadays. Escute a sílaba forte e volte ao fluxo. Compare high school e kids talk.'],
  ['E09','081',68.18,72.97,'Jeanna','Um, most people either talk by email or by a cellular phone.','A maioria conversa por e-mail ou pelo celular.',['boundary','recognition'],'Reconheça o chunk “either ... or ...” antes de tentar traduzir cellular.'],
  ['E10','063',22.0,25.98,'Jeanna','No, you have to have your permit for six months before you can get a license.','Você precisa ter a permissão por seis meses antes de tirar a carteira.',['reduction','weak-form'],'Observe o ritmo de “have to have” e de “before you can”. O can no meio da frase pode ser fraco.'],
  ['E11','063',29.04,33.98,'Jeanna','You have to take driving school and then you have to go to the DMV and take a test.','Você precisa fazer autoescola e depois ir ao DMV e fazer uma prova.',['reduction','linking'],'Duas ocorrências de “have to” no mesmo contexto: volte de cada chunk para a frase toda. DMV é o órgão de trânsito.'],
  ['E12','063',41.0,43.98,'Jeanna','And they give you your license or permit so you can drive.','Eles dão sua carteira ou permissão para você poder dirigir.',['linking','weak-form'],'“Give you your” pode soar como um único grupo. Escute a transição antes de license.'],
  ['E13','063',45.0,47.98,'Todd Beuckens',"When you have a driver's license, what places do you want to go to?",'Quando tiver carteira, a quais lugares você quer ir?',['reduction','boundary'],'Encontre o chunk “do you want to”. Want to pode reduzir; a forma escrita continua sendo want to.'],
  ['E14','063',48.0,51.98,'Jeanna','To see my friends and to hang out, just to school and back.','Ver meus amigos e sair com eles, ir à escola e voltar.',['weak-form','linking'],'Ouça to e and dentro da frase, com menos força do que friends, school e back.'],
  ['E15','going-to',0,2.88,'ELLLO · voz feminina','What are you going to do tonight?','O que você vai fazer hoje à noite?',['reduction','boundary'],'Observe “what are you” e “going to” como chunks. Gonna é uma representação informal de uma redução possível, não uma grafia obrigatória.'],
  ['E16','going-to',2.96,7.98,'ELLLO · voz masculina',"I'm just going to stay home. What about you?",'Vou ficar em casa. E você?',['reduction','linking'],'Going to pode perder a divisão entre as duas palavras. Depois encontre “what about you” sem traduzir cada token.'],
  ['E17','going-to',14.60,19.98,'ELLLO · voz feminina',"We're going to see the new Marvel movie. Do you want to come?",'Vamos ver o novo filme da Marvel. Quer vir?',['reduction','contraction'],'Duas vozes no contexto: localize “we are going to” e o convite “do you want to come”.'],
  ['E18','going-to',20.0,24.35,'ELLLO · voz masculina',"No, I'll pass, but thanks for asking.",'Vou passar, mas obrigado pelo convite.',['contraction','weak-form'],"I'll perde a fronteira entre I e will. Escute também for em “thanks for asking”."],
  ['E19','going-to',30.36,32.35,'ELLLO · voz masculina',"I'm just going to take it easy tonight.",'Vou apenas relaxar hoje à noite.',['reduction','linking'],'Compare “take it easy” com palavras isoladas. O fim de take se conecta ao início de it.'],
  ['E20','going-to',53.36,57.35,'ELLLO · voz feminina',"We're going to stay at a campground near their house.",'Vamos ficar em um camping perto da casa deles.',['weak-form','boundary'],'At a é pequeno no fluxo. Encontre campground antes de near their house.'],
  ['E21','going-to',95.36,99.35,'ELLLO · voz masculina',"I'd love to go. When should I come over?",'Adoraria ir. Quando devo chegar?',['contraction','linking'],"I'd love to é um chunk de convite; aqui I'd significa I would. Come over é uma unidade de sentido."],
  ['E22','going-to',99.36,104.35,'ELLLO · voz feminina',"We're not going to start until seven. So around then.",'Não vamos começar antes das sete. Então por volta desse horário.',['reduction','phoneme'],'Não perca not. Compare start until, a ligação t + vogal, e o TH de then.'],
  ['E23','going-to',167.36,175.35,'ELLLO · voz feminina',"No. I'm just going with my husband. My kids are going to stay with their grandparents.",'Não. Vou apenas com meu marido. Meus filhos vão ficar com os avós.',['phoneme','linking'],'Ouça o grupo kids are, as consoantes de grandparents e o TH em their.'],
  ['E24','1416-have-to',2.03,4.27,'Todd Beuckens · demonstração','What do you have to do tomorrow?','O que você precisa fazer amanhã?',['reduction','boundary'],'Isole “have to do” e compare o começo da pergunta com o ritmo completo.'],
  ['E25','1416-have-to',11.90,14.27,'Todd Beuckens · demonstração','I have to get up early for school.','Tenho que levantar cedo para a escola.',['reduction','linking'],'Get up liga o t ao início da próxima palavra. For school recebe menos força do que get up e early.'],
  ['E26','1416-have-to',15.93,17.63,'Todd Beuckens · demonstração','Do you have to work tomorrow?','Você precisa trabalhar amanhã?',['reduction','weak-form'],'Procure “do you have to” no fluxo. Depois devolva o chunk à frase toda.'],
  ['E27','1426-kind-of',3.24,5.95,'Todd Beuckens · demonstração','Llamas are kind of like camels.','Lhamas são parecidas com camelos.',['reduction','weak-form'],'Kind of pode reduzir. Não espere que of soe como uma palavra isolada e forte.'],
  ['E28','1426-kind-of',16.06,18.96,'Todd Beuckens · demonstração','Seattle is sort of like San Francisco.','Seattle é meio parecida com San Francisco.',['reduction','linking'],'Sort of like é um chunk de comparação. Escute o fim de sort e a passagem para of.'],
  ['E29','1366-would-have',5.28,9.31,'Todd Beuckens · demonstração','What would you have studied otherwise?','O que você teria estudado, em vez disso?',['contraction','weak-form'],'Localize “would you have”. Em fala natural, have pode ficar muito fraco; procure a sequência inteira.'],
  ['E30','conditionals',15.0,19.59,'Adam','I might have changed my major.','Eu talvez tivesse mudado de curso.',['contraction','weak-form'],'Might have é o alvo; não basta escrever “I changed”. Procure o som pequeno entre might e changed.'],
  ['E31','conditionals',51.61,62.07,'Adam','I think that those topics are really interesting and on the cutting edge of science and just fascinating to explore.','Acho esses temas interessantes, na fronteira da ciência, e fascinantes de explorar.',['speed','recognition'],'O chunk cutting edge of science exige acesso rápido ao vocabulário. Este trecho é um pouco maior para treino de continuidade.'],
  ['E32','conditionals',63.08,65.31,'Sarah','Anything else you wish you would have done?','Mais alguma coisa que você gostaria de ter feito?',['contraction','weak-form'],'No meio da pergunta, “you wish you would have” se junta. Não confunda have com a ausência de uma palavra.'],
  ['E33','conditionals',65.32,71.60,'Adam','I might have been more involved in the sports clubs at my school.','Eu poderia ter participado mais dos clubes esportivos da escola.',['contraction','phoneme'],'Might have been é um chunk. Depois escute sports clubs sem inserir vogais entre as consoantes.'],
  ['E34','conditionals',95.25,101.70,'Adam','I went to one training day and kind of tried out.','Fui a um dia de treino e meio que fiz um teste.',['reduction','linking'],'Ouça kind of e tried out. As fronteiras podem sumir enquanto a frase continua perfeitamente compreensível.'],
  ['E35','conditionals',107.72,113.51,'Adam','I think it would have been fun to be part of that culture and that environment.','Acho que teria sido divertido fazer parte dessa cultura e desse ambiente.',['contraction','weak-form'],'Would have been vira uma sequência curta. Compare com o trecho mais lento da demonstração e volte à conversa.'],
  ['E36','conditionals',113.52,121.83,'Sarah',"How about something that you did do that maybe now you wish you hadn't?",'E algo que você fez mas agora gostaria de não ter feito?',['contraction','speed'],"Did do tem ênfase no que aconteceu; hadn't encerra a pergunta. Reconheça as duas partes sem ficar preso na primeira."],
  ['E37','conditionals',153.48,156.05,'Sarah','Anything else you would have changed?','Mais alguma coisa que você teria mudado?',['contraction','weak-form'],'Encontre “would have changed”. Use esta voz diferente para verificar transferência.'],
  ['E38','conditionals',168.12,173.23,'Adam','I had a really good girlfriend in the beginning of college.','Eu tinha uma namorada muito legal no começo da faculdade.',['boundary','speed'],'No começo e no fim há grupos naturais: “I had a really good girlfriend” e “in the beginning of college”.'],
];
const clean = value => value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9']/g,'');
let storedAlignment;
try { storedAlignment = await read('scripts/elllo-alignments.json'); } catch {}
const alignment = {};
for(const name of Object.keys(sources)){
  if(storedAlignment?.[name]) { alignment[name] = storedAlignment[name]; continue; }
  const raw=await read(`/tmp/decoding-dtw/${name}.json`);
  const words=[];
  for(const token of raw.transcription.flatMap(s=>s.tokens??[])){
    if(!clean(token.text)||/^\[|^</.test(token.text.trim()))continue;
    const w={text:token.text.trim(),start:token.offsets.from/1000,end:Math.max(token.offsets.to/1000,token.offsets.from/1000+.04)};
    if(words.length&&!/^\s/.test(token.text)){words.at(-1).text+=w.text;words.at(-1).end=Math.max(words.at(-1).end,w.end);}else words.push(w);
  }
  alignment[name]=words;
}
const clips = selected.map(([id,name,start,end,speaker,english,portuguese,focus,note])=>{
  const src=sources[name];const spoken=alignment[name].filter(w=>w.start>=start-.25&&w.start<end);
  const written=english.split(/\s+/);
  // Keep the source spelling, and align only matching words, never fabricate a phonetic rendering.
  let cursor=0;
  const words=written.map((text,i)=>{
    let found=-1;
    for(let j=cursor;j<spoken.length;j++)if(clean(spoken[j].text)===clean(text)){found=j;break;}
    const estimated=start+(end-start)*i/written.length;
    const w=found>=0?spoken[found]:{start:estimated,end:estimated+(end-start)/written.length};
    if(found>=0)cursor=found+1;
    const alignedStart=Math.max(start,Math.min(w.start,end-.05));
    return {text,start:alignedStart,end:Math.min(end,Math.max(w.end,alignedStart+.04))};
  });
  // Enforce monotonic bounds so selecting any contiguous chunk yields a valid audio interval.
  for(let i=1;i<words.length;i++){words[i].start=Math.max(words[i].start,words[i-1].start);words[i].end=Math.max(words[i].end,words[i].start+.025);words[i].end=Math.min(end,words[i].end);}
  return {id,english,portuguese,audioUrl:`/audio/elllo/${name}.mp3`,start,end,speaker,kind:src.kind,words,focus,note,
    source:{publisher:'ELLLO',title:src.title,url:src.url,contributor:src.contributor,license:'Uso educacional não comercial · download offline',licenseUrl:'https://elllo.org/about/teacher_tips.htm'}};
});
const tatoebaNotes = [
  'Localize wanted to e couldn’t: conhecer as palavras não garante ouvi-las juntas.', 'Escute not what I said como um chunk e confira se not apareceu no seu ditado.',
  'Worked termina com /t/; selling books preserva as consoantes finais sem acrescentar uma vogal.', 'Escute used gloves e still burned; finais de palavras podem ser discretos.',
  'Ouça o ritmo de definitely e like it here, sem tentar recuperar cada palavra lentamente.', '“Either him or her” recebe ligações; as palavras pequenas se apoiam nas vizinhas.',
  '“Don’t know how to tell her” ocupa pouco tempo. Isole tell her e volte à frase.', '“At her party” pode soar ligado. Ouça o começo de cada chunk.',
  '“Got into” liga consoante e vogal; astronomy pode exigir acesso lexical mais rápido.', '“Wish you would” aproxima sons. Confira would mesmo se o sentido estiver claro.',
  'Wouldn’t, it’s e not really: escreva as contrações que realmente ouviu.', 'Ouça and it will como um grupo de palavras fracas.',
  '“Have we got left” é curto. Escute a fronteira antes de left.', 'Há muitos “at it”, “to do it” e “the best I can”; segmente por chunks.',
  'Compare os dois can no mesmo contexto e escute whether.', 'Could be e to start são grupos; não espere que to soe isoladamente como /tuː/.',
  'Cannot e have said mudam o sentido; localize os auxiliares antes de revelar.', '“Don’t ask” e “don’t get” ligam as palavras e preservam a negação.',
  '“Haven’t heard from her” combina contração, ligação e palavra fraca.', 'Escute can hardly understand sem perder o fluxo enquanto reconhece understand.',
  'O chunk “do you want to” pode soar reduzido. Compare com a pergunta em conversa.', 'Em “can’t leave until he”, procure a negação e as transições, não uma explosão forte de t.',
  'Fifteen tem destaque no final; diferencie o ritmo de fifty mesmo sem um par aqui.', '“Tell it’s good just by” liga fronteiras. Escute o ritmo, depois escreva.',
  'Could you e to me recebem pouca força entre explain e meaning.', '“If you don’t like that, I’ll stop” depende das contrações para preservar o sentido.',
  '“Would have knocked” pode reduzir. O alvo é recuperar os auxiliares no tempo da frase.', 'Ouça “whatever works best for you” como unidade para ganhar continuidade.',
];
const tatoebaFocus = [
 ['boundary','reduction','contraction'],['boundary','linking'],['phoneme','linking'],['phoneme','linking'],
 ['recognition','speed'],['weak-form','linking'],['weak-form','contraction'],['weak-form','linking'],
 ['linking','recognition','vocabulary'],['linking','contraction'],['contraction','weak-form'],['weak-form','recognition','vocabulary'],
 ['boundary','weak-form'],['weak-form','reduction'],['weak-form','phoneme'],['weak-form','linking'],
 ['contraction','weak-form'],['contraction','linking'],['contraction','weak-form'],['speed','recognition'],
 ['reduction','boundary'],['contraction','phoneme'],['phoneme','speed'],['linking','boundary'],
 ['linking','weak-form'],['contraction','linking'],['contraction','weak-form'],['recognition','speed'],
];
for(let i=0;i<library.clips.length;i++){
  const c=library.clips[i];clips.push({id:c.id,english:c.english,portuguese:c.portuguese,audioUrl:c.audioUrl,start:0,end:c.duration,speaker:c.source.contributor,kind:'sentence',words:c.words.map(w=>({...w,start:Math.max(0,Math.min(w.start,c.duration-.04)),end:Math.min(c.duration,Math.max(w.end,w.start+.03))})),focus:tatoebaFocus[i],note:tatoebaNotes[i],source:c.source});
}
const lessonRows = [
 [1,'Seu parser de som','Descobrir se o problema está no som, no vocabulário ou no acesso rápido.','Escrever antes de ler revela o que você realmente reconheceu. Não traduza cada palavra; use uma hipótese provisória.','Depois de revelar, separe “não conhecia” de “conhecia, mas não ouvi”.',['boundary','recognition'],['E01','E03','TAT-001'],['E09'],[]],
 [1,'Onde uma palavra termina?','Encontrar fronteiras no fluxo, usando o contexto acústico.','Não há espaços audíveis entre todas as palavras. Consoantes e vogais vizinhas se juntam; o ritmo ajuda a localizar grupos.','Faça um loop de duas palavras vizinhas, depois amplie para três ou quatro.',['boundary','linking'],['E02','E07','TAT-008'],['E12'],[]],
 [1,'Uma voz, várias situações','Começar narrow listening com a mesma pessoa.','Repetir uma voz diminui as variáveis: sotaque, ritmo e hábitos reaparecem. Depois é necessário testar outra voz.','Compare Jeanna falando de computador e de dirigir. Use o filtro por falante na revisão.',['recognition','boundary'],['E01','E10','E14'],['E38'],[]],
 [2,'Going to em vez de palavra por palavra','Ouvir going to como uma configuração acústica familiar.','Going to pode reduzir para algo próximo de gonna em planos futuros. Uma ida literal a um lugar nem sempre aceita a mesma troca; o contexto importa.','Escute going to + verbo, repita o chunk e depois a frase em 1×.',['reduction'],['E15','E16','E19'],['E20'],[]],
 [2,'Want to, have to, kind of','Reconhecer reduções em chunks cotidianos.','Want to, have to e kind of podem soar compactos. As grafias wanna, hafta e kinda são pistas informais, não transcrições universais.','Compare a demonstração have to com a mesma construção em conversa espontânea.',['reduction','weak-form'],['E24','E10','E27'],['E28'],[]],
 [2,'Perguntas compactas','Escutar do you e what are you sem esperar pausas.','Perguntas naturais frequentemente unem palavras pequenas. Did you pode assimilar para um som próximo de didja; a forma depende do falante e da situação.','Localize os auxiliares do e have nos trechos. Anote a forma escrita, sem decorar uma grafia fonética.',['boundary','reduction'],['E39','E40','TAT-025'],['E41','E42'],[]],
 [3,'To, for, at e o schwa','Ouvir palavras fracas ao redor das sílabas fortes.','Palavras funcionais podem usar /ə/ ou outra vogal reduzida. Não espere o som de uma palavra dita sozinha.','Faça loop de “for about” ou “for school”, depois compare com a frase inteira.',['weak-form'],['E06','E25','TAT-016'],['E23'],[]],
 [3,'Can e negação','Recuperar can, cannot e can’t pelo som e pelo contexto.','Can pode ser fraco. A negação pode ser curta e o t nem sempre tem soltura audível; volume ou uma única regra não bastam.','Transcreva os auxiliares: um not perdido muda todo o sentido.',['weak-form','phoneme'],['TAT-015','TAT-022','E22'],['TAT-017'],[]],
 [3,'Pronomes que parecem desaparecer','Reconhecer her, him, you e and no fluxo.','Pronomes e and podem perder força. Em fala conectada, a transição é parte da pista, mesmo quando uma consoante perde destaque.','Selecione o verbo junto ao pronome, nunca só uma consoante isolada.',['weak-form','linking'],['TAT-006','TAT-007','TAT-019'],['TAT-012'],[]],
 [4,'Consoante encontra vogal','Seguir ligações como get up, take it e got into.','O fim de uma palavra se conecta ao início da próxima; a nova fronteira percebida pode parecer diferente da escrita.','Escute duas palavras com a ligação, depois amplie para o chunk.',['linking','boundary'],['E25','E19','TAT-009'],['TAT-024'],[]],
 [4,'Contrações que mudam o ditado','Recuperar I’ve, I’ll e I’d com os verbos vizinhos.','Uma contração não precisa aparecer em forma contraída na resposta para estar correta, mas o auxiliar deve ser recuperado. I’d pode ser I had ou I would conforme o contexto.','Confira “I have had” e “I would love”. Evite tirar o auxiliar só porque o sentido parece igual.',['contraction'],['E06','E18','E21'],['TAT-026'],[]],
 [4,'Would have e might have','Encontrar have quando ele recebe pouca força.','Would have, might have e would have been cabem em pouco tempo. Observe a sequência, sem adicionar pausas artificiais.','Vá da demonstração de would you have para as falas de Adam.',['contraction','weak-form'],['E29','E30','E35'],['E32'],[]],
 [5,'Vogais altas: ship / sheep','Diferenciar /ɪ/ e /iː/ e voltar às frases.','Essas vogais podem ser assimiladas à mesma categoria do português. A qualidade da vogal, além da duração, ajuda a distinguir.','Compare ship/sheep no laboratório e depois escute as vogais em frases.',['phoneme'],['TAT-003','TAT-005','E25'],['TAT-020'],['high-front']],
 [5,'Full / fool e bed / bad','Refinar /ʊ, uː/ e /ɛ, æ/ em escuta.','Os pares isolados tornam a diferença mais visível ao ouvido. As gravações podem ter vozes diferentes; depois volte ao contexto.','Compare as gravações e procure a vogal de good e bad dentro da frase.',['phoneme'],['TAT-011','TAT-014','E38'],['E08'],['high-back','front-low']],
 [5,'Cat / cut e ritmo de palavras','Distinguir /æ/ de /ʌ/ sem depender da escrita.','Essas vogais não se encaixam perfeitamente nas categorias do português. O contraste é um alvo de treino, não uma medida de inteligência ou nível geral.','Faça o teste cat/cut e ouça as palavras de conteúdo das frases em 1×.',['phoneme','recognition'],['TAT-013','TAT-023','E22'],['E09'],['low-vowels']],
 [6,'TH no fluxo','Perceber /θ/ e /ð/ junto das palavras vizinhas.','TH pode ser substituído mentalmente por t, d, f ou s. Em contexto, procure o início da palavra e a passagem para a vogal.','Compare thin/tin e then/den. Depois encontre think, then e their nas frases.',['phoneme','linking'],['E11','E23','TAT-002'],['E31'],['th-voiceless','th-voiced']],
 [6,'Finais e encontros consonantais','Ouvir worked, gloves e sports clubs sem vogais extras.','O português restringe mais as consoantes finais. Não espere uma vogal depois de toda consoante; a soltura de uma oclusiva pode ser discreta.','Faça loops com a palavra e a seguinte: worked for, used gloves, sports clubs.',['phoneme','boundary'],['TAT-003','TAT-004','E33'],['TAT-018'],['final-voicing']],
 [6,'T e D nas transições','Reconhecer t/d em ligação, redução e fala americana.','T ou d podem mudar de realização entre sons; não há uma correspondência rígida com a letra. O flap americano pode lembrar um toque breve.','Compare get up, take it e got into. Não force um flap se o falante não o usar.',['linking','phoneme'],['E25','E19','TAT-009'],['E34'],[]],
 [7,'Conhecer não é reconhecer','Separar palavra desconhecida de palavra conhecida que escapou.','Se a palavra era óbvia ao ler, registre reconhecimento. Se você não sabia seu sentido, registre vocabulário. As duas causas pedem prática diferente.','Depois do ditado, marque a causa e deixe o reforço priorizar seus registros.',['recognition','vocabulary'],['TAT-012','TAT-025','E30'],['TAT-028'],[]],
 [7,'Chunks e acesso rápido','Reconhecer unidades de sentido antes de traduzir.','Acesso lento a uma palavra conhecida pode fazer você perder o restante. Repetições em contexto ajudam a testar se o reconhecimento fica mais rápido.','Reconheça would have been e keep in touch de uma vez; depois acompanhe o restante.',['speed','recognition'],['E35','E02','TAT-027'],['E36'],[]],
 [7,'Mais fluxo, menos cliques','Sustentar a escuta ao mudar de trecho.','A fila automática inicia o áudio seguinte depois de salvar seu teste. O novo trecho começa sem legenda; você ainda escolhe quando revelar.','Ative o fluxo contínuo e registre o que ficou difícil quando a próxima frase começou.',['speed','boundary'],['E04','E07','TAT-028'],['E38'],[]],
 [8,'Revisão surpresa de verdade','Medir reconhecimento sem texto em outro dia.','Acertar depois de ler é útil, mas não prova retenção. As revisões entram na fila e o resultado tardio é separado do teste imediato.','Abra as revisões vencidas antes de reler qualquer frase. Se não houver, faça esta prática e volte amanhã.',['recognition','contraction'],['E06','E30','TAT-019'],['E37'],[]],
 [8,'Outra voz, outro contexto','Verificar se o padrão aprendido aparece em trechos novos.','O treino com uma voz precisa de transferência. Os testes usam recortes reservados; depois que você os estudou, deixam de ser inéditos.','Use “Teste em trecho novo”. Registre o ditado antes de revelar, mesmo se você entender só parte.',['speed','weak-form'],['E10','E24','TAT-015'],['E32','E36','E37'],[]],
 [8,'Sua rotina daqui em diante','Combinar reforço adaptativo, narrow listening e prazer.','Use seus registros para escolher os alvos. Mantenha áudio curto para análise e conversas completas para exposição e continuidade.','Faça reforço dos seus erros, revise sem texto e ouça uma conversa inteira com a mesma pessoa.',['recognition','speed'],['E01','E35','TAT-027'],['E31','E34','E38'],[]],
];
const lessons=lessonRows.map(([week,title,objective,explanation,task,focus,clipIds,transferIds,pairIds],i)=>({id:`L${String(i+1).padStart(2,'0')}`,week,title,objective,explanation,task,focus,clipIds,transferIds,pairIds}));
const trained = new Set(lessons.flatMap(l=>l.clipIds));
const reserved = clips.filter(c=>!trained.has(c.id));
for(const lesson of lessons) {
  lesson.transferIds = lesson.transferIds.filter(id=>!trained.has(id));
  if(!lesson.transferIds.length) lesson.transferIds = reserved.filter(c=>c.focus.some(f=>lesson.focus.includes(f))).slice(0,2).map(c=>c.id);
}
const commons=await read('scripts/sound-pairs-sources.json');
const pairRows=[
 ['high-front','ship / sheep · /ɪ/ ↔ /iː/','A vogal de ship costuma ser mais relaxada; em sheep, a língua fica mais alta e a vogal pode durar mais. Compare a qualidade, não só o tempo.',['ship','sheep']],
 ['high-back','full / fool · /ʊ/ ↔ /uː/','Full e fool usam vogais diferentes. As duas gravações são de vozes diferentes; concentre-se na vogal e depois procure esse contraste em frases.',['full','fool']],
 ['front-low','bed / bad · /ɛ/ ↔ /æ/','Bad pede uma abertura diferente de bed. Ouça a vogal em vez de decidir pela grafia.',['bed','bad']],
 ['low-vowels','cat / cut · /æ/ ↔ /ʌ/','As duas vogais podem parecer um “a” do português. Compare posição e qualidade nas gravações.',['cat','cut']],
 ['th-voiceless','thin / tin · /θ/ ↔ /t/','Thin começa com fricção entre língua e dentes; tin começa com uma oclusiva. Ouça com a vogal seguinte.',['thin','tin']],
 ['th-voiced','then / den · /ð/ ↔ /d/','No início de then há fricção sonora; den começa com uma oclusiva. Observe a passagem para a vogal.',['then','den']],
 ['final-voicing','bag / back · /ɡ/ ↔ /k/','Não dependa só de uma soltura forte no final. Ouça a vogal anterior e as pistas da consoante final.',['bag','back']],
];
const pairs=pairRows.map(([id,label,tip,words])=>({id,label,tip,words:words.map(text=>({text,audioUrl:commons[text].localAudioUrl??`/audio/commons/${text}.ogg`,source:commons[text]}))}));
const meta={title:'8 semanas de decoding · listening para falantes de português',schemaVersion:1,sources:[
 {title:'Estudo: aquisição de sons do inglês por brasileiros',url:'https://www.scielo.br/j/tla/a/JW5yXxjrmJnDh6nZ6nNPxjs/?lang=en',note:'Orienta a seleção de vogais, TH, finais e contraste de vozeamento. Não fornece um ranking de clipes mais difíceis.'},
 {title:'British Council: fala conectada',url:'https://www.teachingenglish.org.uk/professional-development/teachers/teaching-knowledge-database/c/connected-speech',note:'Referência sobre ligação, elisão, assimilação e formas fracas; as explicações das lições são autorais.'},
 {title:'ELLLO: estudo offline',url:'https://elllo.org/about/teacher_tips.htm',note:'Permite baixar áudios e lições para uso offline e educacional.'},
 {title:'ELLLO: condições de uso educacional',url:'https://www.elllo.org/english/Mixers/?D=A',note:'Permissão publicada para copiar e distribuir MP3 e texto em educação, sem transferência para fins comerciais.'},
 {title:'Wikimedia Commons: gravações individuais',url:'https://commons.wikimedia.org/wiki/File:En-us-ship.ogg',note:'Licença e autor de cada arquivo preservados nos pares de sons.'},
]};
await writeFile('public/data/decoding.json',JSON.stringify({meta,clips,lessons,pairs},null,2)+'\n');
await writeFile('scripts/elllo-downloads.json',JSON.stringify(Object.entries(sources).map(([name,s])=>({file:`/audio/elllo/${name}.mp3`,url:s.download,page:s.url})),null,2)+'\n');
await writeFile('scripts/elllo-alignments.json',JSON.stringify(alignment,null,2)+'\n');
for(const name of Object.keys(sources))execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',`public/audio/elllo/${name}.mp3`,'-f','null','-']);
console.log(`${lessons.length} lições, ${clips.length} microclipes, ${pairs.length} contrastes humanos.`);
