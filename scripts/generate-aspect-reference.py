"""QA only: independent vector-angle oracle over retained NASA/JPL positions.

Uses only Python's standard library; never imports the TypeScript candidate.
The QA orb policy is not a production/editorial default.
"""
import csv
import hashlib
import itertools
import json
import math
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'packages/astrology/fixtures/horizons'
DEST = ROOT / 'packages/astrology/fixtures/aspects'
BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
RULES = [('conjunction', 0, 8), ('sextile', 60, 4), ('square', 90, 6), ('trine', 120, 6), ('opposition', 180, 8)]
POLICY = {'id': 'qa-major', 'version': '1', 'aspects': [{'kind': kind, 'orbDegrees': orb} for kind, _, orb in RULES]}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def separation(first, second):
    # Independent from the candidate's wrapped absolute difference.
    a, b = math.radians(first), math.radians(second)
    dot = math.cos(a) * math.cos(b) + math.sin(a) * math.sin(b)
    return math.degrees(math.acos(max(-1.0, min(1.0, dot))))


for a, b, expected in [(0, 0, 0), (0, 180, 180), (359, 1, 2), (30, 90, 60), (0, 90, 90), (30, 150, 120)]:
    assert abs(separation(a, b) - expected) < 1e-9

source_manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
assert source_manifest['schemaVersion'] == 'atv-horizons/1'
assert len(source_manifest['epochs']) == 7 and len(source_manifest['instants']) == 21
assert [item['body'] for item in source_manifest['sources']] == BODIES
series = {}
for item in source_manifest['sources']:
    path = SOURCE / item['file']
    assert path.name == item['body'] + '.txt' and digest(path) == item['sha256']
    raw = path.read_text(encoding='utf-8')
    assert raw.count('$$SOE') == raw.count('$$EOE') == 1
    rows = list(csv.reader(raw.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines()))
    assert len(rows) == 21
    series[item['body']] = []
    for instant, row in zip(source_manifest['instants'], rows):
        expected_jd = datetime.fromisoformat(instant.replace('Z', '+00:00')).timestamp() / 86400 + 2440587.5
        assert abs(float(row[1]) - expected_jd) < 1e-8
        longitude = float(row[6])
        assert math.isfinite(longitude) and 0 <= longitude < 360
        series[item['body']].append(longitude)

cases = []
for epoch_index, epoch in enumerate(source_manifest['epochs']):
    index = epoch_index * 3 + 1
    assert source_manifest['instants'][index] == epoch
    positions = [{'body': body, 'longitude': series[body][index]} for body in BODIES]
    pairs = []
    for a, b in itertools.combinations(positions, 2):
        angle = separation(a['longitude'], b['longitude'])
        matches = [(kind, abs(angle - target)) for kind, target, orb in RULES if abs(angle - target) <= orb]
        assert len(matches) <= 1
        boundaries = [bound for _, target, orb in RULES for bound in (target - orb, target + orb) if 0 < bound < 180]
        pairs.append({'first': a['body'], 'second': b['body'], 'separationDegrees': angle,
                      'kind': matches[0][0] if matches else None,
                      'orbDegrees': matches[0][1] if matches else None,
                      'boundaryMarginDegrees': min(abs(angle - bound) for bound in boundaries)})
    assert len(pairs) == 45
    cases.append({'epoch': epoch, 'positions': positions, 'pairs': pairs})

DEST.mkdir(parents=True, exist_ok=True)
fixture = DEST / 'vector-reference.json'
fixture.write_text(json.dumps({'schemaVersion': 'atv-aspects-reference/1', 'policy': POLICY,
                              'productionPromotion': False, 'cases': cases}, indent=2) + '\n', encoding='utf-8', newline='\n')
manifest = {'schemaVersion': 'atv-aspects-manifest/1', 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'method': 'Python stdlib: ecliptic unit vectors, dot product and acos; independent from candidate arithmetic',
            'qaPolicyOnly': True, 'productionPromotion': False, 'caseCount': 7, 'pairCount': 315,
            'fixtureSha256': digest(fixture), 'generatorSha256': digest(Path(__file__)),
            'sourceManifestSha256': digest(SOURCE / 'manifest.json'),
            'sources': [{'body': item['body'], 'file': item['file'], 'sha256': item['sha256']} for item in source_manifest['sources']],
            'toleranceDegrees': {'samePositions': 1e-7, 'candidatePositions': 2 * 60 / 3600}}
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'cases': 7, 'pairs': 315, 'matches': sum(pair['kind'] is not None for case in cases for pair in case['pairs']),
                  'minBoundaryMarginDegrees': min(pair['boundaryMarginDegrees'] for case in cases for pair in case['pairs']),
                  'fixtureSha256': digest(fixture)}))
