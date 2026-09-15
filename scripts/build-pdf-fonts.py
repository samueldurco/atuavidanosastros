"""Build PDF-only static instances of the checked-in brand fonts.

Requires fonttools==4.65.0 and brotli==1.2.0. No network access.
The web WOFF2 originals are never modified. Font binaries remain OFL-1.1.
"""
from pathlib import Path
from hashlib import sha256
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[1]
source = root / "apps/web/static/brand/fonts"
target = root / "apps/web/src/lib/server/pdf-fonts"
target.mkdir(parents=True, exist_ok=True)
for name in ("bodoni-moda", "newsreader", "onest"):
    original = source / f"{name}-variable.woff2"
    font = TTFont(original, recalcTimestamp=False)
    axes = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
    instantiateVariableFont(font, axes, inplace=True)
    font.flavor = None
    output = target / f"{name}-regular.ttf"
    font.save(output)
    print(f"{output.name}: axes={axes}, sha256={sha256(output.read_bytes()).hexdigest()}")
