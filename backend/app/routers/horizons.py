"""Lunar-site ephemerides from the JPL Horizons API."""

import asyncio
import csv
import io
import re
from datetime import date

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/horizons", tags=["horizons"])
HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
MOON_CENTER = "coord@301"
REQUEST_TIMEOUT_SECONDS = 60.0
STEP_PATTERN = re.compile(r"^[1-9][0-9]{0,3}\s*(?:m|min|h|hr|d|day)$", re.IGNORECASE)


def _parse_observer_result(payload: dict[str, object], target: str) -> list[dict[str, object]]:
    """Parse Horizons CSV rows between its $$SOE/$$EOE markers."""
    if payload.get("error"):
        raise HTTPException(status_code=502, detail=f"Horizons {target}: {payload['error']}")

    result = payload.get("result")
    if not isinstance(result, str):
        raise HTTPException(status_code=502, detail=f"Horizons {target} returned no ephemeris")

    match = re.search(r"\$\$SOE\s*(.*?)\s*\$\$EOE", result, flags=re.DOTALL)
    if not match:
        raise HTTPException(status_code=502, detail=f"Horizons {target} returned no data table")

    samples: list[dict[str, object]] = []
    for row in csv.reader(io.StringIO(match.group(1))):
        values = [value.strip() for value in row]
        if len(values) < 3:
            continue
        try:
            azimuth = float(values[-2])
            elevation = float(values[-1])
        except ValueError:
            # Ignore blank lines or any unexpected non-data rows.
            continue
        samples.append({
            "timeUtc": values[0],
            "azimuthDeg": azimuth,
            "elevationDeg": elevation,
        })

    if not samples:
        raise HTTPException(status_code=502, detail=f"Could not parse Horizons {target} samples")
    return samples


async def _fetch_target(
    client: httpx.AsyncClient,
    *,
    target: str,
    latitude_deg: float,
    longitude_deg: float,
    start_time: date,
    stop_time: date,
    step_size: str,
) -> list[dict[str, object]]:
    params = {
        "format": "json",
        "COMMAND": f"'{target}'",
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": MOON_CENTER,
        "COORD_TYPE": "GEODETIC",
        # Horizons order: longitude, latitude, altitude (km).
        "SITE_COORD": f"'{longitude_deg},{latitude_deg},0'",
        "START_TIME": f"'{start_time.isoformat()}'",
        "STOP_TIME": f"'{stop_time.isoformat()}'",
        "STEP_SIZE": f"'{step_size}'",
        # Quantity 4: apparent azimuth and elevation.
        "QUANTITIES": "'4'",
        "CSV_FORMAT": "YES",
    }
    try:
        response = await client.get(HORIZONS_URL, params=params)
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="JPL Horizons is unavailable or returned invalid JSON") from exc
    return _parse_observer_result(payload, target)


@router.get("/lunar-site")
async def get_lunar_site_ephemeris(
    latitude_deg: float = Query(ge=-90, le=90),
    longitude_deg: float = Query(ge=-180, le=180),
    start_time: date = Query(alias="startTime"),
    stop_time: date = Query(alias="stopTime"),
    step_size: str = Query(default="1h", alias="stepSize", pattern=r"^[1-9][0-9]{0,3}\s*(?:m|min|h|hr|d|day)$"),
) -> dict[str, object]:
    """Return Sun/Earth apparent positions for a selected lunar surface point."""
    if stop_time <= start_time:
        raise HTTPException(status_code=422, detail="stopTime must be after startTime")
    if (stop_time - start_time).days > 366:
        raise HTTPException(status_code=422, detail="Requested interval cannot exceed 366 days")
    if not STEP_PATTERN.fullmatch(step_size):
        raise HTTPException(status_code=422, detail="stepSize must be an interval such as 30m, 1h, or 1d")

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        sun, earth = await asyncio.gather(
            _fetch_target(
                client, target="10", latitude_deg=latitude_deg, longitude_deg=longitude_deg,
                start_time=start_time, stop_time=stop_time, step_size=step_size,
            ),
            _fetch_target(
                client, target="399", latitude_deg=latitude_deg, longitude_deg=longitude_deg,
                start_time=start_time, stop_time=stop_time, step_size=step_size,
            ),
        )

    sun_lit = sum(sample["elevationDeg"] > 0 for sample in sun)
    earth_visible = sum(sample["elevationDeg"] > 0 for sample in earth)
    return {
        "source": "JPL Horizons API",
        "observer": {
            "body": "Moon (301)",
            "coordinateType": "GEODETIC",
            "longitudeDeg": longitude_deg,
            "latitudeDeg": latitude_deg,
            "altitudeKm": 0,
            "longitudeConvention": "east-positive; verify/convert map convention before calling",
        },
        "interval": {"startTime": start_time, "stopTime": stop_time, "stepSize": step_size},
        "sun": {
            "samples": sun,
            "aboveGeometricHorizonSamplePct": round(100 * sun_lit / len(sun), 2),
        },
        "earth": {
            "samples": earth,
            "aboveGeometricHorizonSamplePct": round(100 * earth_visible / len(earth), 2),
        },
        "limitations": [
            "Sample percentages are estimates for the requested time step, not continuous-time guarantees.",
            "Geometric elevation does not account for local terrain, antenna masks, relay assets, or link budgets.",
            "Terrain slope and horizon obstruction require lunar topography data; Horizons does not provide them.",
        ],
    }
