"""Read-only extraction from owner's datasets; never edits source CSVs."""
from pathlib import Path
import csv, hashlib, json, re, sys, unicodedata

BASE = Path('C:/ATVNA/SEO/INTELIGENCIA-MERCADO')
OUT = Path(__file__).parent
FILES = [
    '04-fonte-bruta/keywords-merged-consolidado.csv',
    '01-seo-intelligence/KEYWORD_MASTER.csv',
    '01-seo-intelligence/KEYWORD_PLANNER_TAROT_2026-07-29.csv',
    '01-seo-intelligence/KEYWORD_URL_MAP.csv',
]
PATTERNS = {
    'wedding-date-map': r'casamento|casar|noiv',
    'ex-tarot': r'arrepend|saudade|\bex\b|ex namorado|ex amor',
    'love-restart-map': r'reconcili|voltar|volta\b|reatar|reaproxima|amoroso|amorosa',
    'sexuality-map': r'sexual|sexo|desejo|venus|marte',
    'intimacy-map': r'intim|sexual|sexo|desejo',
    'emotional-reactions-map': r'emoc|reac|raiva|sentimento|lua',
    'financial-blocks-tarot': r'dinheiro|financ|prosper|riqueza|bloque',
    'hidden-talent-map': r'talent|vocac|carreira|meio do ceu|profiss',
    'ascendant-style': r'ascendente|estilo|roupa|moda',
    'conversation-timing': r'convers|comunic|horoscopo.*amor|amor.*horoscopo',
    'cohabitation-map': r'morar|conviv|casal|sinastria|compatibilidade',
}
CURATED_TERMS = {
    'wedding-date-map': ['signos que combinam para casar', 'aquário e gêmeos no casamento'],
    'ex-tarot': ['signos que voltam com ex', 'taurino arrependido'],
    'love-restart-map': ['signos que voltam com ex', 'mapa astral amoroso'],
    'sexuality-map': ['áries no sexo', 'venus capricórnio'],
    'intimacy-map': ['libra no sexo', 'áries no sexo'],
    'emotional-reactions-map': ['lua em touro significado', 'capricórnio com raiva'],
    'financial-blocks-tarot': ['mapa astral financeiro', 'dinheiro para o signo de peixes hoje'],
    'hidden-talent-map': ['mapa astral vocacional', 'mapa astral profissional gratuito'],
    'ascendant-style': ['ascendente em áries', 'ascendente em touro'],
    'conversation-timing': ['horóscopo do amor hoje', 'horóscopo semanal amor'],
    'cohabitation-map': ['sinastria', 'mapa astral casal'],
}

def norm(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.lower()) if not unicodedata.combining(c))

result = {'extractedAt': '2026-11-04', 'scope': 'historical owner datasets; not fresh demand, not purchase conversion', 'sources': [], 'products': {key: [] for key in PATTERNS}}
for relative in FILES:
    path = BASE / relative
    data = path.read_bytes()
    with path.open(encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.DictReader(handle))
    result['sources'].append({'path': str(path), 'sha256': hashlib.sha256(data).hexdigest(), 'rows': len(rows), 'columns': list(rows[0]) if rows else []})
    for source_row, row in enumerate(rows, 2):
        keyword = row.get('keyword_raw') or row.get('keyword') or ''
        normalized = norm(keyword)
        for product_id, pattern in PATTERNS.items():
            if re.search(pattern, normalized) or normalized in [norm(term) for term in CURATED_TERMS[product_id]]:
                record = {'source': relative, 'sourceRow': source_row, 'keywordRaw': keyword}
                for field in ['avg_monthly_searches', 'intent_primary', 'volume_band', 'volume_band_label', 'volume_band_floor', 'volume_monthly_source', 'proposed_owner_url', 'evidence_date', 'confidence', 'decision']:
                    if row.get(field):
                        record[field] = row[field]
                result['products'][product_id].append(record)
dictionary = BASE / '01-seo-intelligence/KEYWORD_DATA_DICTIONARY.md'
result['sources'].append({'path': str(dictionary), 'sha256': hashlib.sha256(dictionary.read_bytes()).hexdigest(), 'kind': 'dictionary'})
counts = {k: len(v) for k, v in result['products'].items()}
if '--full' in sys.argv:
    (OUT / 'keyword-evidence-full.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
result['candidateCountsBeforeSemanticReview'] = counts
result['candidateCountWarning'] = 'Regex candidates contain false positives and repeated source records. Counts are not demand, keyword totals or product opportunities.'
result['products'] = {k: {'terms': CURATED_TERMS[k], 'evidence': [x for x in v if norm(x['keywordRaw']) in [norm(term) for term in CURATED_TERMS[k]]], 'commercialDemandMeasured': False} for k, v in result['products'].items()}
with (BASE / FILES[2]).open(encoding='utf-8-sig', newline='') as handle:
    tarot_rows = list(csv.DictReader(handle))
result['tarotSupplementContext'] = [dict(source=FILES[2], sourceRow=i+2, **row) for i, row in enumerate(tarot_rows) if row['keyword_raw'] in ['a carta da estrela no amor', 'carta a torre no amor']]
with (BASE / FILES[3]).open(encoding='utf-8-sig', newline='') as handle:
    map_rows = list(csv.DictReader(handle))
result['existingIntentOwners'] = [dict(source=FILES[3], sourceRow=i+2, **row) for i, row in enumerate(map_rows) if row['keyword_raw'] in ['ascendente', 'sinastria', 'horoscopo', 'mapa astral completo', 'mapa astral profissional gratuito', 'tarot online']]
(OUT / 'keyword-evidence.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'sources': [{'path': s['path'], 'rows': s.get('rows')} for s in result['sources']], 'curatedEvidenceCounts': {k: len(v['evidence']) for k, v in result['products'].items()}}, ensure_ascii=False))
