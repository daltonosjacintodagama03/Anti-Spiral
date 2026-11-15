#!/usr/bin/env python3
"""Losslessly select fields from NASA SVS mooninfo_2026.json for local frontend use.
Usage: python3 frontend/tools/prepare_lunar_ephemeris.py /path/to/mooninfo_2026.json
Download from the URL below; raw scientific input stays outside Git.
"""
import hashlib
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

SOURCE = 'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json'
ROOT = Path(__file__).resolve().parents[2]


def main():
    raw = Path(sys.argv[1]).read_bytes()
    records = json.loads(raw)
    if not isinstance(records, list) or len(records) != 8760:
        raise ValueError('Expected 8760 hourly records for 2026; no missing or extra rows allowed')
    first = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = []
    for index, record in enumerate(records):
        timestamp = datetime.strptime(record['time'], '%d %b %Y %H:%M UT').replace(tzinfo=timezone.utc)
        if timestamp != first + timedelta(hours=index):
            raise ValueError(f'Misaligned UTC timestamp at index {index}')
        row = [record['subsolar']['lon'], record['subsolar']['lat'], record['subearth']['lon'], record['subearth']['lat'], record['distance']]
        if any(not isinstance(n, (int, float)) or not math.isfinite(n) for n in row):
            raise ValueError(f'Invalid numeric value at index {index}')
        if not (abs(row[0]) <= 180 and abs(row[1]) <= 90 and abs(row[2]) <= 180 and abs(row[3]) <= 90 and 300000 < row[4] < 450000):
            raise ValueError(f'Unexpected coordinate/distance at index {index}')
        rows.append(row)
    source_hash = hashlib.sha256(raw).hexdigest()
    output = {'year': 2026, 'source': SOURCE, 'sourceSha256': source_hash,
              'startUtc': '2026-01-01T00:00:00Z', 'stepSeconds': 3600,
              'fields': ['subsolar_longitude_deg_east', 'subsolar_latitude_deg_north',
                         'subearth_longitude_deg_east', 'subearth_latitude_deg_north', 'earth_distance_km'],
              'rows': rows}
    destination = ROOT / 'frontend/public/data/moon-2026.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(output, separators=(',', ':')) + '\n').encode()
    destination.write_bytes(payload)
    manifest = {'source': SOURCE, 'sourcePage': 'https://svs.gsfc.nasa.gov/5587/',
                'retrievedAtUtc': datetime.now(timezone.utc).isoformat(), 'sourceSha256': source_hash,
                'sourceBytes': len(raw), 'artifact': 'frontend/public/data/moon-2026.json',
                'artifactSha256': hashlib.sha256(payload).hexdigest(), 'artifactBytes': len(payload),
                'samples': len(rows), 'firstUtc': output['startUtc'], 'lastUtc': '2026-12-31T23:00:00Z',
                'transformation': 'Select five numeric fields, preserve source precision and order; no interpolation.'}
    manifest_path = ROOT / 'docs/sources/moon-2026-manifest.json'
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Wrote {len(rows)} verified hourly records, {len(payload)} bytes, source SHA-256 {source_hash}')


if __name__ == '__main__':
    main()
