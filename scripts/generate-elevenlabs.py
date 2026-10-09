#!/usr/bin/env python3
"""Generate sentence audio within the current free quota; never extend the plan.
One request per distinct English text. Completed requests are saved immediately.
Run from repository root with --env-file pointing to private configuration.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'public/audio/elevenlabs'
MANIFEST = ROOT / 'public/data/elevenlabs-generation.json'
VOICE = 'iP95p4xoKVk53GoZ742B'
MODEL = 'eleven_multilingual_v2'
FORMAT = 'mp3_44100_128'
SETTINGS = dict(stability=0.5, similarity_boost=0.75, style=0.0, use_speaker_boost=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--env-file', type=Path)
parser.add_argument('--generate', action='store_true', help='Consume remaining free credits; default only reports quota.')
args = parser.parse_args()
key = os.environ.get('ELEVENLABS_API_KEY', '')
if args.env_file:
    for line in args.env_file.read_text().splitlines():
        clean = line.strip()
        if clean.startswith('export '): clean = clean[7:]
        name, sep, value = clean.partition('=')
        if sep and name.strip() == 'ELEVENLABS_API_KEY': key = value.strip().strip('\"\'')
if not key: sys.exit('Missing ELEVENLABS_API_KEY. No requests made.')

def api(route, payload=None):
    req = urllib.request.Request('https://api.elevenlabs.io/v1/' + route + ('?refresh=' + str(time.time_ns()) if payload is None else ''),
        data=None if payload is None else json.dumps(payload).encode(),
        headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Cache-Control':'no-cache'},
        method='GET' if payload is None else 'POST')
    try:
        return urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as error:
        # Do not print provider bodies or credentials; no automatic paid retries.
        sys.exit('ElevenLabs HTTP %s; stopped. Check quota/request history before resuming.' % error.code)
    except (TimeoutError, urllib.error.URLError):
        sys.exit('Network failure; outcome may be unknown. Check request history before resuming.')

def quota():
    with api('user/subscription') as response: subscription = json.load(response)
    if subscription['tier'] != 'free': sys.exit('This workflow only consumes free-plan credits.')
    return subscription, max(0, subscription['character_limit'] - subscription['character_count'])

def save(path, data):
    temporary = path.with_suffix(path.suffix + '.part')
    serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':')) if path.name == 'sentences.json' else json.dumps(data, ensure_ascii=False, indent=2)
    temporary.write_text(serialized + '\n')
    temporary.replace(path)

catalog_path = ROOT / 'public/data/sentences.json'
catalog = json.loads(catalog_path.read_text())
manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {'provider':'ElevenLabs','voiceName':'Chris','voice_id':VOICE,'model_id':MODEL,'plan':'free','attribution':'elevenlabs.io','licenseUrl':'https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform','entries':{}}
entries = manifest['entries']
by_text = {}
for sid, entry in entries.items():
    file = AUDIO / (sid + '.mp3')
    if entry['voice_id'] != VOICE or entry['model_id'] != MODEL or entry['voice_settings'] != SETTINGS: sys.exit('Manifest settings differ: ' + sid)
    if not file.exists() or hashlib.sha256(file.read_bytes()).hexdigest() != entry['sha256']: sys.exit('Missing or altered recording: ' + sid)
    by_text[entry['text']] = sid
subscription, remaining = quota()
print('Free credits remaining: %s; existing recordings: %s' % (remaining, len(entries)), flush=True)
if not args.generate: sys.exit()
# The subscription endpoint can lag behind completed TTS requests. Keep a
# conservative ledger for the current billing period as well as the API quota.
period = subscription['next_character_count_reset_unix']
for entry in entries.values():
    entry.setdefault('billingPeriodResetUnix', period)
recorded = sum(int(entry.get('character_cost') or len(entry['text'])) for entry in entries.values() if entry.get('billingPeriodResetUnix') == period)
remaining = min(remaining, max(0, subscription['character_limit'] - recorded))
print('Conservative credits remaining: %s' % remaining, flush=True)
save(MANIFEST, manifest)
AUDIO.mkdir(parents=True, exist_ok=True)
# Round-robin the 30 categories for coverage; first phrases are easy to find in the UI.
groups = [[s for s in catalog['sentences'] if s['categoryId'] == category['id']] for category in catalog['categories']]
ordered = [group[i] for i in range(max(map(len, groups))) for group in groups if i < len(group)]
new = 0
for sentence in ordered:
    sid, text = sentence['id'], sentence['english']
    if text in by_text:
        sentence['audioUrl'] = '/audio/elevenlabs/' + by_text[text] + '.mp3'
        continue
    if len(text) > remaining: continue
    target = AUDIO / (sid + '.mp3')
    if target.exists(): sys.exit('Untracked recording; inspect request history before continuing: ' + sid)
    payload = {'text':text, 'model_id':MODEL, 'voice_settings':SETTINGS, 'seed':42}
    with api('text-to-speech/' + VOICE + '?output_format=' + FORMAT, payload) as response:
        audio = response.read()
        if not response.headers.get('Content-Type', '').startswith('audio/') or len(audio) < 100: sys.exit('Unexpected response: ' + sid)
        request_id = response.headers.get('request-id')
        billed = response.headers.get('character-cost')
    temporary = target.with_suffix('.mp3.part')
    temporary.write_bytes(audio)
    temporary.replace(target)
    duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(target)], text=True))
    entries[sid] = {'text':text, 'voice_id':VOICE, 'model_id':MODEL, 'voice_settings':SETTINGS, 'output_format':FORMAT,'seed':42,'sha256':hashlib.sha256(audio).hexdigest(),'bytes':len(audio),'duration':duration,'request_id':request_id,'character_cost':billed,'billingPeriodResetUnix':period,'audioUrl':'/audio/elevenlabs/' + sid + '.mp3'}
    save(MANIFEST, manifest)
    sentence['audioUrl'] = entries[sid]['audioUrl']
    save(catalog_path, catalog)
    by_text[text] = sid
    remaining -= int(billed) if billed is not None else len(text)
    new += 1
    print('%s saved; new=%s, credits remaining=%s' % (sid, new, remaining), flush=True)
    if new % 20 == 0:
        subscription, refreshed = quota()
        remaining = min(remaining, refreshed)
    time.sleep(0.1)
# Apply reused recordings even if encountered before the generation of their matching text.
for sentence in catalog['sentences']:
    if sentence['english'] in by_text: sentence['audioUrl'] = '/audio/elevenlabs/' + by_text[sentence['english']] + '.mp3'
subscription, api_remaining = quota()
recorded = sum(int(entry.get('character_cost') or len(entry['text'])) for entry in entries.values() if entry.get('billingPeriodResetUnix') == period)
remaining = min(api_remaining, max(0, subscription['character_limit'] - recorded))
manifest['quotaAtCompletion'] = {'character_count':subscription['character_count'],'recordedCreditsThisPeriod':recorded,'character_limit':subscription['character_limit'],'remaining':remaining,'nextResetUnix':subscription['next_character_count_reset_unix']}
manifest['recordingCount'] = len(entries)
manifest['sentenceCount'] = sum(bool(s.get('audioUrl')) for s in catalog['sentences'])
save(MANIFEST, manifest)
save(catalog_path, catalog)
print('Complete: %s recordings, %s sentences covered, %s free credits remain.' % (len(entries), manifest['sentenceCount'], remaining), flush=True)
