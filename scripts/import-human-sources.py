"""Catalog official lesson metadata; keep recordings on their original servers."""
import concurrent.futures, html, json, re, subprocess
from pathlib import Path
from urllib.parse import urljoin


def get(url):
    p = subprocess.run(['curl', '-fLsS', '--retry', '1', '--max-time', '20', url], capture_output=True)
    if p.returncode: raise RuntimeError(url)
    return p.stdout.decode('utf-8', errors='replace')


def text(value):
    return ' '.join(html.unescape(re.sub('<[^>]*>', '', value)).split())


def links(body):
    return [(html.unescape(h), text(t)) for h,t in re.findall(r'<a[^>]+href=["\x27]([^"\x27]+)["\x27][^>]*>(.*?)</a>', body, re.S|re.I)]


def lesson(row):
    url, title, level = row
    try:
        body = get(url)
        urls = [urljoin(url, html.unescape(s)) for s in re.findall(r'(?:src|href)=["\x27]([^"\x27]+\.mp3)["\x27]', body, re.I)]
        audio = next((s for s in urls if '/Audio/' in s), None)
        if not audio: return None
        # Verify that this is media, not a missing-file HTML response.
        probe = subprocess.run(['curl','-fLsS','--max-time','20','--range','0-1023',audio],capture_output=True)
        if probe.returncode or len(probe.stdout)<100 or probe.stdout.lstrip().startswith(b'<'): return None
        return dict(id='elllo-'+url.rsplit('/',1)[-1].split('.')[0], title=title, provider='ELLLO', level=level, pageUrl=url)
    except Exception: return None


rows=[]
for level in ['A1','A2','B1']:
    url=f'https://elllo.org/english/grammar/{level}-00-Grammar-Lessons.htm'
    for href,title in links(get(url)):
        if re.match(fr'{level}-\d\d-', href) and title and '<' not in title:
            row=(urljoin(url,href),title,level)
            if row not in rows: rows.append(row)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    entries=[x for x in pool.map(lesson,rows) if x]
# Natural conversations expose the official SoundCloud embed (no MP3 hotlinking).
def embedded(row):
    url,title,level=row
    try:
        body=get(url)
        match=re.search(r'<iframe[^>]+src=["\x27](https://w\.soundcloud\.com/player/[^"\x27]+)',body,re.I)
        if not match: return None
        return dict(id='elllo-'+url.rsplit('/',1)[-1].split('.')[0],title=title,provider='ELLLO',level=level,pageUrl=url,embedUrl=html.unescape(match.group(1)))
    except Exception: return None
natural=[]
for level,slug in [('A2','level3-beginners-high.htm'),('B1','level4-intermediate-low-New.htm'),('B2','level5-intermediate-true-new.htm')]:
    url='https://elllo.org/english/levels/'+slug
    for href,title in links(get(url)):
        if re.match(r'../\d',href) and title:
            row=(urljoin(url,href),title,level)
            if row not in natural: natural.append(row)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    entries.extend(x for x in pool.map(embedded,natural) if x)
# Exact official links curated from the A1 index. Other levels link to their complete catalog.
bc=[('A request from your boss','request-your-boss'),('A voicemail message','voicemail-message'),('Booking a table','booking-table'),('Business cards','business-cards'),('Finding the library','finding-library'),('Meeting a new team member','meeting-new-team-member'),('Meeting other students','meeting-other-students'),('Meeting people at a dinner','meeting-people-dinner'),('Ordering in a café','ordering-cafe'),('Organising a group project','organising-group-project'),('Shopping for clothes','shopping-clothes'),('The first English class','first-english-class')]
for title,slug in bc:
    entries.append(dict(id='bc-'+slug,title=title,provider='British Council',level='A1',pageUrl='https://learnenglish.britishcouncil.org/free-resources/listening/a1/'+slug))
for level in ['A2','B1','B2','C1']:
    entries.append(dict(id='bc-'+level,title='Catálogo de listening '+level,provider='British Council',level=level,pageUrl='https://learnenglish.britishcouncil.org/free-resources/listening/'+level.lower()))
for slug,title in [('listen','Aula gratuita da semana'),('podcast','Podcast: três aulas por semana')]:
    entries.append(dict(id='eslpod-'+slug,title=title,provider='ESLPod',level='Livre',pageUrl='https://www.eslpod.com/'+slug+'/'))
Path('public/data/human-sources.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
print('Catalog:',len(entries),'resources;',sum(bool(x.get('embedUrl')) for x in entries),'official ELLLO players')
