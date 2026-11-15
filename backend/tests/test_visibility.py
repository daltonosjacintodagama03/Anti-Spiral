from datetime import datetime, timedelta, timezone

import pytest
from app.domain.visibility import derive_visibility

ORIGIN = datetime(2026, 11, 14, tzinfo=timezone.utc)


def series(sun, earth=None, times=None):
    earth = earth if earth is not None else sun
    times = times if times is not None else [i * 3600 for i in range(len(sun))]
    return [{'timestamp_utc': ORIGIN + timedelta(seconds=t),
             'sun': {'elevation_deg': s}, 'earth': {'elevation_deg': e}}
            for t, s, e in zip(times, sun, earth)]


def assert_conservation(result):
    for summary in result['summary'].values():
        assert summary['visible_seconds'] + summary['invisible_seconds'] + summary['unknown_seconds'] == pytest.approx(result['duration_seconds'], abs=1e-7)
        assert summary['known_seconds'] + summary['unknown_seconds'] == pytest.approx(result['duration_seconds'], abs=1e-7)
    assert result['summary']['combined']['visible_seconds'] <= min(result['summary'][body]['visible_seconds'] for body in ('sun', 'earth')) + 1e-7


@pytest.mark.parametrize('elevation,visible', [(1,7200),(-1,0),(0,0)])
def test_constant_and_threshold(elevation,visible):
    result=derive_visibility(series([elevation]*3))
    assert result['summary']['sun']['visible_seconds'] == visible
    assert not result['events']
    assert result['event_absence']['sunset'] == 'not_found_in_range'
    assert_conservation(result)


def test_known_crossings_and_intersection():
    result=derive_visibility(series([-1,1,1], [1,1,-1]))
    assert result['summary']['sun']['visible_seconds'] == 5400
    assert result['summary']['earth']['visible_seconds'] == 5400
    assert result['summary']['combined']['visible_seconds'] == 3600
    assert [event['event_type'] for event in result['events']] == ['sunrise','earthset']
    assert result['events'][0]['time_utc'] == ORIGIN+timedelta(seconds=1800)
    assert result['events'][1]['time_utc'] == ORIGIN+timedelta(seconds=5400)
    assert_conservation(result)


def test_multiple_events_and_irregular_final_segment():
    result=derive_visibility(series([1,-1,1,-1], times=[0,3600,7200,7500]))
    assert [event['event_type'] for event in result['events'] if event['event_type'].startswith('sun')] == ['sunset','sunrise','sunset']
    assert result['summary']['sun']['visible_seconds'] == 3750
    assert result['summary']['sun']['longest_invisible_seconds'] == 3600
    assert_conservation(result)


def test_unknown_is_not_invisible_and_does_not_bridge_events():
    result=derive_visibility(series([1,None,-1,1], [1,1,1,1]))
    sun=result['summary']['sun']
    assert sun['unknown_seconds'] == 7200
    assert sun['visible_seconds'] == 1800
    assert sun['invisible_seconds'] == 1800
    assert sun['longest_invisible_seconds'] == 1800
    assert [event['event_type'] for event in result['events']] == ['sunrise']
    assert result['summary']['combined']['unknown_seconds'] == 7200
    assert_conservation(result)


def test_combined_known_false_despite_unknown_other_body():
    result=derive_visibility(series([None,None],[-1,-1]))
    assert result['summary']['combined']['invisible_seconds'] == 3600
    assert result['summary']['combined']['unknown_seconds'] == 0
    assert_conservation(result)


def test_zero_endpoints_and_four_event_types():
    result=derive_visibility(series([0,1,0,-1,1], [1,-1,0,1,-1]))
    assert {event['event_type'] for event in result['events']} == {'sunrise','sunset','earthrise','earthset'}
    assert result['events'][0]['time_utc'] == ORIGIN
    assert_conservation(result)


def test_nonfinite_is_unknown_and_invalid_time_grid_rejected():
    result=derive_visibility(series([float('nan'),1]))
    assert result['summary']['sun']['unknown_seconds'] == 3600
    with pytest.raises(ValueError):
        derive_visibility(series([1,1],times=[0,0]))


def test_grazing_zero_breaks_continuous_visibility_without_adding_duration():
    result = derive_visibility(series([1,0,1]))
    assert result['summary']['sun']['visible_seconds'] == 7200
    assert result['summary']['sun']['longest_visible_seconds'] == 3600
    assert result['summary']['combined']['longest_visible_seconds'] == 3600
    assert_conservation(result)


def test_recorded_real_comparison_replays_without_network():
    import json
    from pathlib import Path
    fixture = json.loads((Path(__file__).parent / 'fixtures' / 'comparison-live.json').read_text())
    results = []
    for name in ('a', 'b'):
        rows = fixture[name]['samples']
        for row in rows:
            row['timestamp_utc'] = datetime.fromisoformat(row['timestamp_utc'].replace('Z', '+00:00'))
        result = derive_visibility(rows)
        assert_conservation(result)
        assert len(result['events']) == 1
        event = result['events'][0]
        assert event['event_type'] == 'sunrise'
        assert event['bracket_start_utc'] <= event['time_utc'] <= event['bracket_end_utc']
        assert result['event_absence']['earthset'] == 'not_found_in_range'
        results.append(result)
    assert results[1]['summary']['sun']['visible_seconds'] - results[0]['summary']['sun']['visible_seconds'] == pytest.approx(86400, abs=1e-7)
