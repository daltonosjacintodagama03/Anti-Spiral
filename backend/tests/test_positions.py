import json
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from app.integrations.horizons import HorizonsError, parse, parameters
from app.routers.positions import PositionRequest

BASE = dict(latitude_deg=-89.5, longitude_deg=0, start_utc='2026-11-14T12:00:00Z', duration_hours=1, step_minutes=30)
FIXTURES = Path(__file__).parent / 'fixtures'


@pytest.mark.parametrize('change', [
    {'latitude_deg': -90}, {'latitude_deg': 90}, {'latitude_deg': float('nan')},
    {'longitude_deg': float('inf')}, {'start_utc': '2026-11-14T12:00:00'},
    {'start_utc': '2026-12-31T23:30:00Z'}, {'duration_hours': 0},
    {'duration_hours': 168, 'step_minutes': 1}, {'step_minutes': 0},
])
def test_invalid_requests(change):
    with pytest.raises(ValidationError):
        PositionRequest(**(BASE | change))


def test_grid_normalizes_and_includes_short_last_segment():
    request = PositionRequest(**(BASE | {'longitude_deg': 350, 'step_minutes': 7, 'start_utc': '2026-11-14T13:00:00+01:00'}))
    assert request.longitude_deg == -10
    assert request.grid()[0] == datetime(2026, 11, 14, 12, tzinfo=timezone.utc)
    assert len(request.grid()) == 10
    assert (request.grid()[-1] - request.grid()[-2]).total_seconds() == 240


@pytest.mark.parametrize('body,name', [('10','sun'), ('399','earth')])
def test_real_fixtures(body, name):
    request = PositionRequest(**BASE)
    payload = json.loads((FIXTURES / f'{name}.json').read_text())
    rows = parse(payload, body, request.grid())
    assert len(rows) == 3
    assert rows[0]['timestamp_utc'] == request.start_utc
    assert parameters(request, body, request.grid())['APPARENT'] == "'AIRLESS'"
    if body == '10':
        assert rows[0]['azimuth_deg'] == 120.534441
        assert rows[0]['elevation_deg'] == 1.302620


@pytest.mark.parametrize('payload', [{'error':'invalid'}, {'result':''}, {'result':'$$SOE\n$$EOE'}])
def test_provider_error(payload):
    with pytest.raises(HorizonsError):
        parse(payload, '10', PositionRequest(**BASE).grid())


def test_incomplete_and_misaligned_table():
    payload = json.loads((FIXTURES / 'sun.json').read_text())
    with pytest.raises(HorizonsError):
        parse(payload, '10', PositionRequest(**BASE).grid()[:-1])
    payload['result'] = payload['result'].replace('120.534441', 'NaN')
    with pytest.raises(HorizonsError):
        parse(payload, '10', PositionRequest(**BASE).grid())


def test_endpoint_failure_and_validation(client, monkeypatch):
    monkeypatch.setattr('app.routers.positions.analyze', AsyncMock(side_effect=HorizonsError('Fornecedor indisponível')))
    assert client.post('/api/positions', json=BASE).status_code == 503
    assert client.post('/api/positions', json=BASE | {'latitude_deg':90}).status_code == 422


def test_endpoint_with_real_provider_fixtures(client, monkeypatch):
    import httpx
    original_client = httpx.AsyncClient
    calls = []

    def respond(request):
        body = request.url.params['COMMAND'].strip("'")
        name = 'sun' if body == '10' else 'earth'
        calls.append(body)
        return httpx.Response(200, json=json.loads((FIXTURES / f'{name}.json').read_text()))

    monkeypatch.setattr('app.integrations.horizons.httpx.AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(respond), **kwargs))
    response = client.post('/api/positions', json=BASE)
    assert response.status_code == 200
    result = response.json()
    assert calls == ['10', '399']
    assert len(result['samples']) == 3
    assert result['samples'][0]['earth']['elevation_deg'] == -3.621837
    assert result['model'] == 'geometric'
    assert len(result['sources'][0]['response_sha256']) == 64


@pytest.mark.parametrize('mode', ['timeout', 'http', 'invalid_json', 'provider_error'])
def test_transport_failures_have_no_samples(client, monkeypatch, mode):
    import httpx
    original_client = httpx.AsyncClient

    def respond(request):
        if mode == 'timeout':
            raise httpx.ReadTimeout('timeout', request=request)
        if mode == 'http':
            return httpx.Response(502)
        if mode == 'invalid_json':
            return httpx.Response(200, text='not json')
        return httpx.Response(200, json={'error':'provider error'})

    monkeypatch.setattr('app.integrations.horizons.httpx.AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(respond), **kwargs))
    response = client.post('/api/positions', json=BASE)
    assert response.status_code == 503
    assert 'samples' not in response.json()


def test_long_series_is_batched_and_aligned(client, monkeypatch):
    import httpx
    original_client = httpx.AsyncClient
    batches = []

    def checked_parse(payload, body, expected):
        batches.append((body, len(expected)))
        return [{'timestamp_utc': time, 'azimuth_deg': 0, 'elevation_deg': -1} for time in expected]

    monkeypatch.setattr('app.integrations.horizons.parse', checked_parse)
    monkeypatch.setattr('app.integrations.horizons.httpx.AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(lambda request: httpx.Response(200, json={})), **kwargs))
    response = client.post('/api/positions', json=BASE | {'duration_hours':23, 'step_minutes':7})
    assert response.status_code == 200
    result = response.json()
    assert len(result['samples']) == 199
    assert batches == [('10',198), ('10',1), ('399',198), ('399',1)]
    assert result['samples'][-1]['timestamp_utc'] == '2026-11-15T11:00:00Z'
    assert len(result['sources']) == 4


def test_busy_provider_returns_error(client, monkeypatch):
    class Busy:
        def locked(self):
            return True
    monkeypatch.setattr('app.integrations.horizons.query_lock', Busy())
    response = client.post('/api/positions', json=BASE)
    assert response.status_code == 503
    assert 'samples' not in response.json()


def test_unknown_provider_version_and_malformed_signature():
    for signature in [{'version':'99'}, [], None]:
        with pytest.raises(HorizonsError):
            parse({'signature': signature}, '10', [])
