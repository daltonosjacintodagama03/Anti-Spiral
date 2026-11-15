"""Read-only proxy for the public Moon Trek WAC WMTS layer."""

import httpx
from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import Response

router = APIRouter(prefix="/api/moon-trek", tags=["moon-trek"])

WMTS_BASE = (
    "https://trek.nasa.gov/tiles/Moon/EQ/"
    "LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0"
)
WMTS_MATRIX_SET = "default028mm"
WMTS_STYLE = "default"
WMTS_IMAGE_EXTENSION = "jpg"
REQUEST_TIMEOUT_SECONDS = 20.0


@router.get("/capabilities", response_class=Response)
async def get_capabilities() -> Response:
    """Return layer metadata (coverage, tile matrices and formats) from NASA."""
    url = f"{WMTS_BASE}/WMTSCapabilities.xml"
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            upstream = await client.get(url)
            upstream.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Moon Trek metadata service unavailable") from exc

    return Response(
        content=upstream.content,
        media_type=upstream.headers.get("content-type", "application/xml"),
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/tiles/{matrix}/{row}/{col}")
async def get_tile(
    matrix: str = Path(pattern=r"^[0-9]{1,3}$", description="TileMatrix identifier from WMTS capabilities"),
    row: int = Path(ge=0, le=100_000),
    col: int = Path(ge=0, le=100_000),
) -> Response:
    """Proxy one image tile. matrix/row/col are WMTS indices, not coordinates."""
    url = (
        f"{WMTS_BASE}/{WMTS_STYLE}/{WMTS_MATRIX_SET}/"
        f"{matrix}/{row}/{col}.{WMTS_IMAGE_EXTENSION}"
    )
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
            upstream = await client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Moon Trek tile service unavailable") from exc

    if upstream.status_code == 404:
        raise HTTPException(status_code=404, detail="Tile has no coverage or does not exist")
    if upstream.status_code != 200:
        raise HTTPException(status_code=502, detail="Moon Trek returned an unexpected response")

    return Response(
        content=upstream.content,
        media_type=upstream.headers.get("content-type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )
