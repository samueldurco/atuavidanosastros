"""Build the self-hosted city search from GeoNames CC BY 4.0 (no runtime API)."""
import hashlib
import io
import json
from pathlib import Path
import unicodedata
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1] / 'apps/web/static/locations'
BASE = 'https://download.geonames.org/export/dump/'

def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c)).strip()

def shard_key(value):
    key = 0
    for c in normalize(value)[:2]:
        key = (key * 31 + ord(c)) % 1024
    return format(key, '03x')

def main():
    archive = urllib.request.urlopen(BASE + 'cities500.zip', timeout=120).read()
    admin_data = urllib.request.urlopen(BASE + 'admin1CodesASCII.txt', timeout=120).read()
    regions = {p[0]: p[1] for line in admin_data.decode('utf-8').splitlines() if len(p := line.split('\t')) >= 2}
    text = zipfile.ZipFile(io.BytesIO(archive)).read('cities500.txt').decode('utf-8')
    shards = {}
    count = 0
    for line in text.splitlines():
        p = line.split('\t')
        if len(p) != 19 or not p[8] or not p[17]:
            continue
        names = list(dict.fromkeys(normalize(n) for n in [p[1], p[2], *p[3].split(',')] if len(n.strip()) >= 2))
        row = [p[0], p[1], p[8], regions.get(p[8] + '.' + p[10], ''), float(p[4]), float(p[5]), p[17], int(p[14]), names]
        grouped = {}
        for name in names:
            grouped.setdefault(shard_key(name), []).append(name)
        for key, aliases in grouped.items():
            shards.setdefault(key, []).append([*row[:8], aliases])
        count += 1
    ROOT.mkdir(parents=True, exist_ok=True)
    for key, rows in shards.items():
        rows.sort(key=lambda r: (-r[7], r[0]))
        (ROOT / (key + '.json')).write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    manifest = {'source': BASE + 'cities500.zip', 'license': 'CC BY 4.0', 'archiveSha256': hashlib.sha256(archive).hexdigest(), 'adminSha256': hashlib.sha256(admin_data).hexdigest(), 'cities': count, 'shards': len(shards)}
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps(manifest))

if __name__ == '__main__':
    main()
