"""Offline reference generator, independent of Caelus and the TS adapter.

Requires only the pinned QA packages in house-reference-requirements.txt.
ERFA supplies IAU 2006/2000A Earth orientation. Vector intersections supply
angles; bracketed bisection supplies Placidus semi-arc divisions. No upstream
implementation is copied. This is a reproducible geometric cross-check, not
an independent professional ephemeris certification or an IERS time solution.
"""

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import math

import erfa
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "packages/astrology/fixtures/houses"
TAU = math.tau
RAD = math.pi / 180


def longitude(vector, eps):
    # Project an equatorial vector onto the two axes of the ecliptic plane.
    return math.atan2(vector[1] * math.cos(eps) + vector[2] * math.sin(eps), vector[0]) % TAU


def geometry(theta, eps, latitude):
    phi = latitude * RAD
    ecliptic_normal = np.array([0, -math.sin(eps), math.cos(eps)])
    east = np.array([-math.sin(theta), math.cos(theta), 0])
    meridian = np.array([math.cos(theta), math.sin(theta), 0])
    zenith = np.array([math.cos(phi) * math.cos(theta), math.cos(phi) * math.sin(theta), math.sin(phi)])
    mc_vector = np.cross(east, ecliptic_normal)
    if np.dot(mc_vector, meridian) < 0:
        mc_vector = -mc_vector
    mc = longitude(mc_vector, eps)
    # At/above the adapter's conservative boundary, compare only MC. An ASC
    # convention in circumpolar conditions is outside this reference's scope.
    if abs(latitude) >= 66:
        return {"midheaven": mc / RAD, "ascendant": None, "cusps": []}
    asc_vector = np.cross(zenith, ecliptic_normal)
    if np.dot(asc_vector, east) < 0:
        asc_vector = -asc_vector
    asc = longitude(asc_vector, eps)

    def semi_arc_error(lam, fraction, daytime):
        ra = math.atan2(math.sin(lam) * math.cos(eps), math.cos(lam))
        # All four eastern cusps have RA between the MC and IC. A signed
        # unwrap about their midpoint keeps the root continuous across 0.
        ra_offset = (ra - theta + math.pi / 2) % TAU - math.pi / 2
        dec = math.asin(math.sin(lam) * math.sin(eps))
        semi_day = math.acos(-math.tan(phi) * math.tan(dec))
        expected = fraction * semi_day if daytime else semi_day + fraction * (math.pi - semi_day)
        return ra_offset - expected

    def cusp(fraction, daytime):
        # Search ecliptic longitude, independently of the candidate's
        # fixed-point right-ascension iteration. Stop by bracket width.
        lo, hi = mc, mc + math.pi
        assert semi_arc_error(lo, fraction, daytime) < 0
        assert semi_arc_error(hi, fraction, daytime) > 0
        for _ in range(64):
            mid = (lo + hi) / 2
            if semi_arc_error(mid, fraction, daytime) > 0:
                hi = mid
            else:
                lo = mid
        result = (lo + hi) / 2
        assert abs(semi_arc_error(result, fraction, daytime)) < 1e-12
        return result % TAU

    c11, c12 = cusp(1 / 3, True), cusp(2 / 3, True)
    c2, c3 = cusp(1 / 3, False), cusp(2 / 3, False)
    cusps = [asc, c2, c3, mc + math.pi, c11 + math.pi, c12 + math.pi,
             asc + math.pi, c2 + math.pi, c3 + math.pi, mc, c11, c12]
    return {"midheaven": mc / RAD, "ascendant": asc / RAD, "cusps": [(c % TAU) / RAD for c in cusps]}


def generate():
    assert erfa.__version__ == "2.0.1.5" and erfa.version.erfa_version == "2.0.1"
    assert np.__version__ == "2.2.6"
    # Analytical zero-obliquity/equator anchors exercise orientation and
    # every quadrant before any comparison with the candidate.
    for theta in [0, 0.3, 1.5, 3.0, 4.7, 6.2]:
        result = geometry(theta, 0, 0)
        for got, expected in zip(result["cusps"], [(theta / RAD + 90 + i * 30) % 360 for i in range(12)]):
            assert abs((got - expected + 180) % 360 - 180) < 1e-10
    dates = ["1972-01-01T12:00:00Z", "2000-01-01T12:00:00Z", "2016-12-31T23:59:59Z", "2026-09-08T12:00:00Z"]
    dates += [f"2024-03-20T{hour:02}:00:00Z" for hour in range(0, 24, 3)]
    sites = [
        ("equator", 0, 0), ("date-line-east", 0, 180), ("date-line-west", 0, -180),
        ("south-tropical", -23.55, -46.6333), ("north-tropical", 23.55, 46.6333),
        ("north-midlatitude", 40.71, -74), ("north-greenwich", 51.5, -0.1),
        ("south-midlatitude", -33.87, 151.21),
        ("north-boundary-inside", 65.9999, 45), ("south-boundary-inside", -65.9999, -135),
        ("north-boundary", 66, 18.9), ("south-boundary", -66, -18.9),
        ("north-pole", 90, 0), ("south-pole", -90, 0),
    ]
    cases = []
    for instant in dates:
        dt = datetime.fromisoformat(instant.replace("Z", "+00:00"))
        utc = erfa.dtf2d("UTC", dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
        tt = erfa.taitt(*erfa.utctai(*utc))
        # Convert SOFA's quasi-JD UTC correctly on leap-second days. It is not
        # an ordinary UT1 Julian date. DUT1=0 is an explicit approximation.
        ut1 = erfa.utcut1(*utc, 0.0)
        gst = float(erfa.gst06a(*ut1, *tt))
        _, deps = erfa.nut06a(*tt)
        eps = float(erfa.obl06(*tt) + deps)
        for label, lat, lon in sites:
            theta = (gst + lon * RAD) % TAU
            cases.append({"id": f"{instant}/{label}", "input": {
                "localDateTime": instant[:-1], "timezone": "UTC", "utcInstant": instant,
                "latitude": lat, "longitude": lon, "locationSource": "synthetic-reference-grid",
            }, "orientation": {"armcDegrees": theta / RAD, "trueObliquityDegrees": eps / RAD},
                "expectedStatus": "ok" if abs(lat) < 66 else "not-applicable", **geometry(theta, eps, lat)})
    payload = {"schemaVersion": 1, "reference": {
        "pyerfa": erfa.__version__, "erfa": erfa.version.erfa_version, "numpy": np.__version__,
        "license": "BSD-3-Clause (PyERFA/ERFA); no reference runtime shipped in app",
        "orientation": "IAU 2006/2000A; gst06a + obl06 + nut06a; UT1 approximated by UTC",
        "solver": "ATV independent vector intersections and bracketed ecliptic semi-arc bisection v1",
        "timeLimit": "ERFA bundled leap-second table; no IERS DUT1, historical timezone or polar ASC certification",
    }, "tolerancesArcsec": {"midheaven": 60, "ascendant": 60, "cusp": 120}, "cases": cases}
    OUT.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()
    (OUT / "erfa-reference.json").write_bytes(raw)
    manifest = {"schemaVersion": 1, "generatedAt": datetime.now(timezone.utc).isoformat(),
                "fixtureSha256": sha256(raw).hexdigest(), "generatorSha256": sha256(Path(__file__).read_bytes()).hexdigest(),
                "count": len(cases), "sources": [
                    "https://pypi.org/project/pyerfa/2.0.1.5/",
                    "https://github.com/liberfa/erfa/blob/v2.0.1/src/gst06a.c",
                    "https://github.com/liberfa/erfa/blob/v2.0.1/src/obl06.c",
                    "https://github.com/liberfa/erfa/blob/v2.0.1/src/nut06a.c",
                    "https://ncgrastrology.org/wp-content/uploads/publications/geocosmic-journal-archive/2006_NCGR_Journal_Spring_2006.pdf",
                ], "formularyPages": "Michael P. Munkasey, An Astrological House Formulary; printed pp. 59-60 (PDF pp. 60-61)",
                "promotion": False}
    (OUT / "manifest.json").write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode())
    print(json.dumps({"cases": len(cases), "fixtureSha256": manifest["fixtureSha256"]}))


if __name__ == "__main__":
    generate()
