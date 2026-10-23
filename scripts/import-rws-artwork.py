"""Import the public-domain Pam-A scans; keep provenance beside first-party assets."""
import hashlib
import io
import json
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / 'apps/web/static/tarot/rws'
DEST.mkdir(parents=True, exist_ok=True)
HEADERS = {'User-Agent': 'ATVNA/1.0 (RWS editorial artwork; source attribution retained)'}

def get(url):
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 503) or attempt == 5:
                raise
            delay = max(float(error.headers.get('Retry-After', 15)), 15 * (attempt + 1))
            print(f'Waiting {delay}s after HTTP {error.code}', flush=True)
            time.sleep(delay)

def api(**params):
    return json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', **params})))

members = api(list='categorymembers', cmtitle='Category:Rider-Waite-Smith tarot deck (TaionWC)', cmtype='file', cmlimit=100)['query']['categorymembers']
assert len(members) == 78
pages = []
for offset in range(0, 78, 40):
    result = api(pageids='|'.join(str(row['pageid']) for row in members[offset:offset+40]), prop='imageinfo', iiprop='url|size|sha1|extmetadata')
    pages.extend(result['query']['pages'].values())

def process(page):
    title = page['title']
    major = re.match(r'File:RWS Tarot (\d+) ', title)
    minor = re.match(r'File:(Cups|Wands|Swords|Pents)(\d+)\.jpg', title)
    card_id = f'major-{int(major[1])}' if major else f"{dict(Cups='cups', Wands='wands', Swords='swords', Pents='pentacles')[minor[1]]}-{int(minor[2])}"
    info = page['imageinfo'][0]
    metadata = info['extmetadata']
    # Fail closed if a source no longer carries the expected public-domain declaration.
    license_name = metadata.get('LicenseShortName', {}).get('value', '')
    assert 'ublic domain' in license_name or 'PD' in license_name, (title, license_name)
    target = DEST / f'{card_id}.jpg'
    if target.exists():
        data = target.read_bytes()
        image = Image.open(io.BytesIO(data))
    else:
        original = get(info['url'])
        image = Image.open(io.BytesIO(original)).convert('RGB')
        image.thumbnail((600, 1080), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, 'JPEG', quality=83, optimize=True, progressive=True)
        data = output.getvalue()
        target.write_bytes(data)
        time.sleep(10)
    print(card_id, flush=True)
    return {'cardId': card_id, 'file': f'{card_id}.jpg', 'title': title, 'source': info['descriptionurl'], 'original': info['url'], 'sourceSha1': info['sha1'], 'license': license_name, 'licenseUrl': metadata.get('LicenseUrl', {}).get('value', ''), 'artist': 'Pamela Colman Smith', 'edition': 'Rider-Waite-Smith, Pam-A, 1910', 'width': image.width, 'height': image.height, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}

cards = sorted(map(process, pages), key=lambda item: item['cardId'])
assert len({card['cardId'] for card in cards}) == 78
(DEST / 'sources.json').write_text(json.dumps({'version': 'atv-rws-artwork/1.0.0', 'sourceCollection': 'https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)', 'transformation': 'Proportional downscale only; original artwork and inscriptions preserved. JPEG quality 83.', 'cards': cards}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'cards': len(cards), 'bytes': sum(card['bytes'] for card in cards), 'destination': str(DEST)}))
