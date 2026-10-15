"""Reproduce private Career Compass six-preview angles independently of Caelus.

The geometric solver is the separately versioned ERFA/semi-arc QA oracle in
generate-house-reference.py. No reference package is included in the app.
"""

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import math
import runpy

import erfa
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "packages/astrology/fixtures/career-six-oracle"
RAD = math.pi / 180
geometry = runpy.run_path(str(ROOT / "scripts/generate-house-reference.py"))["geometry"]
CASES = [
    ("shared-five", "1992-05-17T11:40:00Z", -19.9167, -43.9345),
    ("different-birth", "1985-08-21T17:20:00Z", 0, 0),
]


def generate():
    assert erfa.__version__ == "2.0.1.5"
    assert erfa.version.erfa_version == "2.0.1"
    assert np.__version__ == "2.2.6"
    rows = []
    for label, instant, latitude, longitude in CASES:
        dt = datetime.fromisoformat(instant.replace("Z", "+00:00"))
        utc = erfa.dtf2d("UTC", dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
        tt = erfa.taitt(*erfa.utctai(*utc))
        # DUT1=0 matches the conservative adapter approximation, not a
        # measured Earth-orientation solution for either historical date.
        ut1 = erfa.utcut1(*utc, 0.0)
        gst = float(erfa.gst06a(*ut1, *tt))
        _, deps = erfa.nut06a(*tt)
        eps = float(erfa.obl06(*tt) + deps)
        theta = (gst + longitude * RAD) % math.tau
        rows.append({"id": label, "utcInstant": instant,
                     "latitude": latitude, "longitude": longitude,
                     "orientation": {"armcDegrees": theta / RAD,
                                     "trueObliquityDegrees": eps / RAD},
                     "expectedStatus": "ok", **geometry(theta, eps, latitude)})
    payload = {"schemaVersion": "atv-career-six-erfa/1", "reference": {
        "pyerfa": erfa.__version__, "erfa": erfa.version.erfa_version,
        "numpy": np.__version__, "orientation": "IAU 2006/2000A; gst06a + obl06 + nut06a",
        "solver": "ATV independent vector intersection and bracketed Placidus semi-arc QA oracle v1",
        "dut1Seconds": 0, "limitations": [
            "No historical IERS DUT1 measurement",
            "No independent validation of the user's civil-time zone conversion",
            "Finite two-birth sample; no global or polar precision claim",
        ]}, "tolerancesArcsec": {"midheaven": 60, "ascendant": 60, "cusp": 120},
        "cases": rows}
    OUT.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()
    (OUT / "erfa-reference.json").write_bytes(raw)
    manifest = {"schemaVersion": "atv-career-six-erfa-manifest/1",
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "fixtureSha256": sha256(raw).hexdigest(),
                "generatorSha256": sha256(Path(__file__).read_bytes()).hexdigest(),
                "geometrySourceSha256": sha256((ROOT / "scripts/generate-house-reference.py").read_bytes()).hexdigest(),
                "sources": [
                    "https://pypi.org/project/pyerfa/2.0.1.5/",
                    "https://github.com/liberfa/erfa/blob/v2.0.1/src/gst06a.c",
                    "https://github.com/liberfa/erfa/blob/v2.0.1/src/obl06.c",
                    "https://github.com/liberfa/erfa/blob/v2.0.1/src/nut06a.c",
                    "https://ncgrastrology.org/wp-content/uploads/publications/geocosmic-journal-archive/2006_NCGR_Journal_Spring_2006.pdf",
                ], "promotion": False}
    (OUT / "erfa-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"cases": len(rows), "fixtureSha256": manifest["fixtureSha256"]}))


if __name__ == "__main__":
    generate()
