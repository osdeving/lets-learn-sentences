"""Download original US pronunciation files and preserve individual license metadata."""
import urllib.request, urllib.parse, json, pathlib, re, html, time
words = ['ship','sheep','full','fool','bed','bad','cut','cat','thin','tin','then','den','bag','back']
root = pathlib.Path('public/audio/commons'); root.mkdir(parents=True,exist_ok=True)
manifest = pathlib.Path('scripts/sound-pairs-sources.json')
metadata = json.loads(manifest.read_text()) if manifest.exists() else {}
def request(req):
    for attempt in range(5):
        try: return urllib.request.urlopen(req,timeout=30)
        except urllib.error.HTTPError as error:
            if error.code != 429: raise
            remaining = int(error.headers.get('Retry-After',5*(attempt+1)))
            while remaining > 0:
                pause=min(60,remaining); print('Respeitando limite do servidor:',remaining,'segundos',flush=True); time.sleep(pause); remaining-=pause
    raise RuntimeError('rate limited')
for word in words:
    if word in metadata and (root/(word+('.wav' if word=='fool' else '.ogg'))).exists(): continue
    q = {'action':'query','format':'json','titles':('File:LL-Q1860 (eng)-Vealhurl-fool.wav' if word=='fool' else 'File:En-us-'+word+'.ogg'),'prop':'imageinfo','iiprop':'url|extmetadata|user'}
    url = 'https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={'User-Agent':'OuvirIngles/1.0 (personal offline listening study)'})
    data = json.load(request(req))
    page = next(iter(data['query']['pages'].values()))
    if 'imageinfo' not in page: raise ValueError('No original audio for '+word)
    info = page['imageinfo'][0]; ext = info['extmetadata']; license = ext['LicenseShortName']['value']
    if not re.search(r'CC BY|Public domain|CC0',license): raise ValueError('License not supported: '+license)
    artist = html.unescape(re.sub('<[^>]*>', '',ext.get('Artist',{'value':info.get('user','Autor indicado na página do arquivo')+' (upload)'})['value']))
    media = info['url'].split('?')[0]
    req = urllib.request.Request(media,headers={'User-Agent':'OuvirIngles/1.0 (personal offline listening study)'})
    extension = '.wav' if word=='fool' else '.ogg'
    (root/(word+extension)).write_bytes(request(req).read())
    metadata[word] = {'publisher':'Wikimedia Commons','title':word,'url':info['descriptionurl'],'contributor':artist,'license':license,'licenseUrl':ext.get('LicenseUrl',{'value':info['descriptionurl']+'#Licensing'})['value'],'originalUrl':media,'localAudioUrl':'/audio/commons/'+word+extension}
    print(word,artist,license,flush=True)
    manifest.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    time.sleep(3)
pathlib.Path('scripts/sound-pairs-sources.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
