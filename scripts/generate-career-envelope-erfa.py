"""Offline ERFA/semi-arc reference for private Career Compass date-envelope QA.

Requires the pinned packages in house-reference-requirements.txt. ERFA's
UT1=UTC and bundled UTC model are approximations, particularly outside the
measured DUT1/leap-second era. No production accuracy is certified here.
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
OUT = ROOT / "packages/astrology/fixtures/career-envelope-erfa"
RAD = math.pi / 180
geometry = runpy.run_path(str(ROOT / "scripts/generate-house-reference.py"))["geometry"]

DATES = [
    "1900-01-01T00:00:00Z",
    "1925-01-01T12:00:00Z",
    "1950-01-01T12:00:00Z",
    "1975-01-01T12:00:00Z",
    "2000-01-01T12:00:00Z",
    "2025-01-01T12:00:00Z",
    "2050-01-01T12:00:00Z",
    "2075-01-01T12:00:00Z",
    "2099-12-31T23:59:59.999Z",
]
SITES = [
    ("south-tropical", -19.9167, -43.9345),
    ("north-midlatitude", 51.5, -0.1),
    ("placidus-boundary", 66, 18.9),
]


def generate():
    assert erfa.__version__ == "2.0.1.5"
    assert erfa.version.erfa_version == "2.0.1"
    assert np.__version__ == "2.2.6"
    cases = []
    for instant in DATES:
        dt = datetime.fromisoformat(instant.replace("Z", "+00:00"))
        seconds = dt.second + dt.microsecond / 1000000
        utc = erfa.dtf2d("UTC", dt.year, dt.month, dt.day, dt.hour, dt.minute, seconds)
        tt = erfa.taitt(*erfa.utctai(*utc))
        ut1 = erfa.utcut1(*utc, 0.0)
        gst = float(erfa.gst06a(*ut1, *tt))
        _, deps = erfa.nut06a(*tt)
        eps = float(erfa.obl06(*tt) + deps)
        for label, latitude, longitude in SITES:
            theta = (gst + longitude * RAD) % math.tau
            cases.append({
                "id": f"{instant}/{label}",
                "input": {
                    "localDateTime": instant[:-1], "utcInstant": instant,
                    "timezone": "UTC", "latitude": latitude,
                    "longitude": longitude,
                    "locationSource": "synthetic-erfa-envelope",
                },
                "expectedStatus": "ok" if abs(latitude) < 66 else "not-applicable",
                "orientation": {"armcDegrees": theta / RAD,
                                "trueObliquityDegrees": eps / RAD},
                **geometry(theta, eps, latitude),
            })
    payload = {
        "schemaVersion": "atv-career-envelope-erfa/1",
        "reference": {
            "pyerfa": erfa.__version__,
            "erfa": erfa.version.erfa_version,
            "numpy": np.__version__,
            "orientation": "IAU 2006/2000A; gst06a + obl06 + nut06a",
            "solver": "ATV independent vector intersection and bracketed Placidus semi-arc QA oracle v1",
            "dut1Seconds": 0,
            "limitations": [
                "DUT1=0 is an approximation, not historical IERS evidence",
                "ERFA's bundled UTC model extrapolates before 1972 and after its leap-second table",
                "No independent civil-time-zone resolution",
                "Finite date and latitude samples; no global precision claim",
            ],
        },
        "tolerancesArcsec": {"midheaven": 60, "ascendant": 60, "cusp": 120},
        "cases": cases,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()
    (OUT / "erfa-reference.json").write_bytes(raw)
    manifest = {
        "schemaVersion": "atv-career-envelope-erfa-manifest/1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureSha256": sha256(raw).hexdigest(),
        "generatorSha256": sha256(Path(__file__).read_bytes()).hexdigest(),
        "geometrySourceSha256": sha256((ROOT / "scripts/generate-house-reference.py").read_bytes()).hexdigest(),
        "count": len(cases),
        "sources": [
            "https://pypi.org/project/pyerfa/2.0.1.5/",
            "https://github.com/liberfa/erfa/blob/v2.0.1/src/gst06a.c",
            "https://github.com/liberfa/erfa/blob/v2.0.1/src/obl06.c",
            "https://github.com/liberfa/erfa/blob/v2.0.1/src/nut06a.c",
            "https://ncgrastrology.org/wp-content/uploads/publications/geocosmic-journal-archive/2006_NCGR_Journal_Spring_2006.pdf",
        ],
        "promotion": False,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"cases": len(cases), "fixtureSha256": manifest["fixtureSha256"]}))


if __name__ == "__main__":
    generate()
