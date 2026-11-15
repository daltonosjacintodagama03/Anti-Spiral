"""Bounded lunar observer queries; no synthetic fallback or terrain model."""
import asyncio
import csv
import hashlib
import io
import math
from uuid import uuid4
from app.domain.visibility import derive_visibility
from datetime import datetime, timezone

import anyio
import httpx

URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
# One execution per process; also serializes Sun/Earth requests.
query_lock = asyncio.Lock()


class HorizonsError(Exception):
    pass


def parameters(request, body: str, times: list[datetime]) -> dict[str, str]:
    values = {
        "COMMAND": body, "OBJ_DATA": "NO", "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER", "CENTER": "coord@301",
        "COORD_TYPE": "GEODETIC",
        "SITE_COORD": f"{request.longitude_deg},{request.latitude_deg},0",
        "TIME_TYPE": "UT", "TIME_DIGITS": "SECONDS",
        "QUANTITIES": "4", "APPARENT": "AIRLESS", "CSV_FORMAT": "YES",
        "ANG_FORMAT": "DEG", "ELEV_CUT": "-90", "SKIP_DAYLT": "NO",
        "CAL_FORMAT": "CAL", "CAL_TYPE": "GREGORIAN",
    }
    params = {"format": "json", **{key: f"'{value}'" for key, value in values.items()}}
    if len(times) == 1:
        params['TLIST'] = f"'{times[0]:%Y-%m-%d %H:%M:%S}'"
        params['TLIST_TYPE'] = "'CAL'"
    else:
        params['START_TIME'] = f"'{times[0]:%Y-%m-%d %H:%M:%S}'"
        params['STOP_TIME'] = f"'{times[-1]:%Y-%m-%d %H:%M:%S}'"
        minutes = int((times[1] - times[0]).total_seconds() / 60)
        params['STEP_SIZE'] = f"'{minutes} m'"
    return params


def parse(payload: dict, body: str, expected: list[datetime]) -> list[dict]:
    if not isinstance(payload, dict):
        raise HorizonsError("Resposta JSON Horizons inválida.")
    signature = payload.get("signature")
    if not isinstance(signature, dict) or signature.get("version") != "1.2":
        raise HorizonsError("Versão da resposta Horizons ainda não validada.")
    result = payload.get("result", "")
    if payload.get("error") or not isinstance(result, str):
        raise HorizonsError("O Horizons recusou a consulta.")
    required = [f"({body})", "Moon (301)", "NO (AIRLESS)", "E-lon(deg)", "MEAN_ME", "1737.4", "$$SOE", "$$EOE"]
    if any(value not in result for value in required):
        raise HorizonsError("Cabeçalho ou tabela Horizons inválidos.")
    before, table = result.split("$$SOE", 1)
    headers = next((line for line in reversed(before.splitlines()) if 'Date__(UT)' in line), '')
    columns = [value.strip() for value in next(csv.reader([headers]))]
    try:
        az_index, el_index = columns.index('Azi_(a-app)'), columns.index('Elev_(a-app)')
        rows = []
        for fields in csv.reader(io.StringIO(table.split('$$EOE', 1)[0].strip())):
            stamp = fields[0].strip()
            fmt = '%Y-%b-%d %H:%M:%S.%f' if '.' in stamp else '%Y-%b-%d %H:%M:%S' if stamp.count(':') == 2 else '%Y-%b-%d %H:%M'
            time = datetime.strptime(stamp, fmt).replace(tzinfo=timezone.utc)
            az, el = float(fields[az_index]), float(fields[el_index])
            if not math.isfinite(az) or not math.isfinite(el) or not 0 <= az <= 360 or not -90 <= el <= 90:
                raise ValueError('angles')
            rows.append({'timestamp_utc': time, 'azimuth_deg': az, 'elevation_deg': el})
        if [row['timestamp_utc'] for row in rows] != expected:
            raise ValueError('timestamps')
        return rows
    except (ValueError, IndexError, StopIteration) as exc:
        raise HorizonsError("Série Horizons incompleta ou instantes desalinhados.") from exc


async def analyze(request):
    times = request.grid()
    if query_lock.locked():
        raise HorizonsError("Existe uma consulta em curso. Tente novamente dentro de alguns segundos.")
    batches = [times]
    if len(times) > 2 and times[-1] - times[-2] != times[1] - times[0]:
        batches = [times[:-1], times[-1:]]
    async with query_lock:
        series, sources = {}, []
        try:
            with anyio.fail_after(50):
                async with httpx.AsyncClient(timeout=20) as client:
                    for name, body in [('sun', '10'), ('earth', '399')]:
                        series[name] = []
                        # Regular span plus a separate final instant keeps URLs small.
                        for batch in batches:
                            params = parameters(request, body, batch)
                            response = await client.get(URL, params=params)
                            response.raise_for_status()
                            if len(response.content) > 2_000_000:
                                raise HorizonsError('Resposta Horizons demasiado grande.')
                            series[name].extend(parse(response.json(), body, batch))
                            sources.append({'body': name, 'url': URL, 'parameters': params,
                                            'retrieved_at': datetime.now(timezone.utc),
                                            'response_sha256': hashlib.sha256(response.content).hexdigest()})
        except (httpx.HTTPError, TimeoutError, ValueError) as exc:
            raise HorizonsError('Horizons indisponível ou resposta inválida. Tente novamente.') from exc
    samples = [{'timestamp_utc': time, **{name: {k: v for k, v in series[name][i].items() if k != 'timestamp_utc'} for name in series}} for i, time in enumerate(times)]
    return {'run_id': str(uuid4()), 'engine_version': 'geometric-visibility-1',
            'visibility_rule': 'center', 'visibility': derive_visibility(samples),
            'request': request.model_dump(), 'model': 'geometric',
            'coordinate_frame': 'Horizons lunar MEAN_ME; longitude este positiva',
            'reference_surface_assumption': 'Esfera lunar de referência, altitude 0 km assumida; não medida.',
            'samples': samples,
            'sources': sources,
            'limitations': ['Sem relevo ou refracção.', 'Posições aparentes dos centros; não são potência eléctrica nem ligação rádio garantida.', 'Cobertura limitada a 2026. Eventos estimados por interpolação linear; transições entre amostras podem não ser detectadas. O bracket não garante exactidão física.']}
