"""Reviewed draft for the root executor. Source fonts remain immutable.
Creates web-only WOFF2 subsets, per-font OFL/copyright sidecars and provenance.
Requires fontTools[woff] and an official OFL 1.1 text file; performs no network I/O.
"""
import argparse, hashlib, io, json, pathlib
import fontTools
from fontTools.ttLib import TTFont
from fontTools import subset

UNICODES = (set(range(0x100)) | set(range(0x300, 0x370)) |
            set(range(0x2000, 0x2070)) | set(range(0x2190, 0x2200)) |
            {0x20AC, 0x2122, 0x2212, 0x2605, 0x2713, 0x2736})
UNICODE_RANGE = 'U+0000-00FF,U+0300-036F,U+2000-206F,U+2190-21FF,U+20AC,U+2122,U+2212,U+2605,U+2713,U+2736'
FILES = ['bodoni-moda-variable.woff2', 'newsreader-variable.woff2', 'onest-variable.woff2']

def names(font, number):
    return list(dict.fromkeys(n.toUnicode() for n in font['name'].names if n.nameID == number))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def axes(font):
    return [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in font['fvar'].axes]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--ofl-text', required=True)
    args = parser.parse_args()
    source = pathlib.Path(args.source_dir).resolve()
    output = pathlib.Path(args.output_dir).resolve()
    if output == source or output.is_relative_to(source):
        raise SystemExit('Output must be outside the approved master font directory.')
    targets = [output / name for name in FILES]
    targets += [output / (pathlib.Path(name).stem + '-OFL.txt') for name in FILES]
    targets += [output / 'WEB_FONT_SUBSETS.json']
    if any(path.exists() for path in targets):
        raise SystemExit('Refusing to overwrite an existing font, license or provenance file.')
    license_text = pathlib.Path(args.ofl_text).read_text(encoding='utf-8')
    marker = 'SIL OPEN FONT LICENSE Version 1.1'
    if marker not in license_text:
        raise SystemExit('Expected official OFL 1.1 text.')
    ofl = license_text[license_text.index(marker):].strip() + '\n'
    # Prepare and validate all derivatives before any output is written.
    prepared = []
    for name in FILES:
        path = source / name
        data = path.read_bytes()
        original = TTFont(io.BytesIO(data))
        if not any('SIL' in value and ('OFL' in value or 'Open Font License' in value) for value in names(original, 13)):
            raise SystemExit(f'{name}: missing expected embedded SIL OFL metadata.')
        trial = TTFont(io.BytesIO(data))
        trial.recalcTimestamp = False
        options = subset.Options()
        options.name_IDs = ['*']
        options.name_languages = ['*']
        options.name_legacy = True
        options.layout_features = ['*']
        options.glyph_names = True
        options.notdef_outline = True
        worker = subset.Subsetter(options=options)
        worker.populate(unicodes=UNICODES)
        worker.subset(trial)
        if axes(original) != axes(trial):
            raise SystemExit(f'{name}: variable axes changed.')
        if (set(original.getBestCmap()) & UNICODES) - set(trial.getBestCmap()):
            raise SystemExit(f'{name}: subset lost requested supported characters.')
        for number in (0, 1, 2, 6, 13, 14):
            if names(original, number) != names(trial, number):
                raise SystemExit(f'{name}: name/license metadata changed.')
        stream = io.BytesIO()
        trial.flavor = 'woff2'
        trial.save(stream)
        payload = stream.getvalue()
        sidecar = '\n'.join(names(original, 0)) + '\n\n' + ofl
        provenance = {'file': name, 'source': str(path), 'source_sha256': sha(data),
                      'source_bytes': len(data), 'derived_sha256': sha(payload),
                      'derived_bytes': len(payload), 'axes': axes(trial),
                      'unicode_range': UNICODE_RANGE, 'source_missing_ui': [
                          f'U+{ord(c):04X}' for c in sorted(set('“”‘’–—…•→€✶'))
                          if ord(c) not in original.getBestCmap()]}
        prepared.append((name, payload, sidecar, provenance))
    # The generator itself is for the root executor; this audit did not run it.
    output.mkdir(parents=True, exist_ok=True)
    for name, payload, sidecar, provenance in prepared:
        (output / name).write_bytes(payload)
        (output / (pathlib.Path(name).stem + '-OFL.txt')).write_text(sidecar, encoding='utf-8')
    report = {'fontTools': fontTools.__version__, 'profile': 'latin1_ui_nfd',
              'unicode_range': UNICODE_RANGE, 'full_source_files_unchanged': True,
              'scope': 'Web CSS only. Keep original fonts for offline HTML/SVG exports and non-subset fallback.',
              'fonts': [item[3] for item in prepared]}
    (output / 'WEB_FONT_SUBSETS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(output), 'total_bytes': sum(len(item[1]) for item in prepared), 'fonts': report['fonts']}, ensure_ascii=False))

if __name__ == '__main__':
    main()
