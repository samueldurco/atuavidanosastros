ATVNA city search data — GeoNames attribution

Source: GeoNames geographical database, https://www.geonames.org/
Dataset: https://download.geonames.org/export/dump/cities500.zip
Regions: https://download.geonames.org/export/dump/admin1CodesASCII.txt
License: Creative Commons Attribution 4.0 International
https://creativecommons.org/licenses/by/4.0/

Derived on 2026-10-05 using scripts/build-city-index.py. ATVNA normalizes names,
groups aliases into 1024 shards, and retains city coordinates and IANA zones.
The manifest records the SHA-256 of both downloaded source files.
Public geographic data only; no user birth records are included.

Coverage: cities with more than 500 inhabitants, plus administrative seats.
An absent location must not be replaced silently with guessed coordinates.
City coordinates refer to a city point, not an exact birth address.
Historical timezone resolution uses the application's Intl runtime; the
dataset does not certify historical timezone accuracy or birth records.
