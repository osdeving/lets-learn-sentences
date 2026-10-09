#!/usr/bin/env python3
"""Import an authorized local YouTube recording and Whisper word timestamps.
Downloading and transcription are separate steps. This script never uses API keys.
"""
import argparse, json, re, shutil, subprocess
from pathlib import Path

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--audio',type=Path,required=True)
p.add_argument('--transcript',type=Path,required=True)
p.add_argument('--metadata',type=Path,required=True)
p.add_argument('--permission-confirmed',action='store_true',required=True,help='The responsible user confirmed permission for audio and transcript publication.')
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
info=json.loads(a.metadata.read_text());raw=json.loads(a.transcript.read_text())
video=info['id']
if not re.fullmatch(r'[A-Za-z0-9_-]{11}',video):p.error('Invalid video ID')
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(a.audio)],text=True))
words=[];adjusted=0
for segment in raw['segments']:
 for item in segment.get('words',[]):
  text=item['word'].strip()
  if not text:continue
  start=max(0.0,min(float(item['start']),duration-.02))
  end=min(duration,max(float(item['end']),start+.02))
  if words and start<words[-1]['start']:start=words[-1]['start'];end=max(end,min(duration,start+.02))
  if start!=float(item['start']) or end!=float(item['end']):adjusted+=1
  words.append({'text':text,'start':round(start,3),'end':round(end,3)})
if len(words)<2 or not raw.get('text','').strip():p.error('No valid transcript')
target=root/'public/audio/youtube'/(video+'.mp3');target.parent.mkdir(parents=True,exist_ok=True)
shutil.copyfile(a.audio,target)
clip={'id':'YT-'+video,'title':info['title'],'english':raw['text'].strip(),'portuguese':'','level':'B1','audioUrl':'/audio/youtube/'+video+'.mp3','duration':round(duration,3),'practiceEligible':False,'tags':['YouTube','podcast','transcrição automática','nível sugerido B1'],'alignmentNote':'Transcrição e intervalos por palavra gerados automaticamente com Whisper small.en. Algumas palavras e bordas podem precisar de ajuste. Nível B1 sugerido; tradução não incluída.','words':words,'source':{'publisher':'YouTube','title':info['title'],'url':'https://www.youtube.com/watch?v='+video,'contributor':info['uploader'],'voiceType':'unverified','license':'Autorização declarada para uso no app','licenseUrl':'https://www.youtube.com/watch?v='+video,'permissionNote':'Áudio e transcrição publicados com base na autorização declarada pelo responsável do app. Nenhuma licença pública foi identificada nos metadados do vídeo.'}}
path=root/'public/data/audio-library.json';library=json.loads(path.read_text());library['clips']=[c for c in library['clips'] if c['id']!=clip['id']]+[clip];library['meta']['count']=len(library['clips']);library['meta']['title']='Biblioteca de áudio'
path.write_text(json.dumps(library,ensure_ascii=False,indent=2)+'\n')
transcript={'videoId':video,'source':clip['source'],'duration':duration,'model':'small.en','automatic':True,'adjustedIntervals':adjusted,'text':clip['english'],'words':words}
out=root/'public/data/youtube-transcripts'/(video+'.json');out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(transcript,ensure_ascii=False,indent=2)+'\n')
print('Imported %s: %.3f seconds, %s words, %s adjusted short intervals.'%(clip['id'],duration,len(words),adjusted))
