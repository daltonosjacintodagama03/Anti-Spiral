"""Linear integration between samples, local geometric horizon, center > 0.
Unknown endpoints make a whole segment unknown. Times are seconds since start.
"""
from datetime import timedelta
import math


def merge(intervals, cuts=()):
    result = []
    for start, end in sorted(intervals):
        if end <= start:
            continue
        touches_cut = result and abs(start - result[-1][1]) < 1e-8 and any(abs(start - cut) < 1e-8 for cut in cuts)
        if result and start <= result[-1][1] + 1e-8 and not touches_cut:
            result[-1] = (result[-1][0], max(end, result[-1][1]))
        else:
            result.append((start, end))
    return result


def intersect(left, right, cuts=()):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        a, b = left[i], right[j]
        if max(a[0], b[0]) < min(a[1], b[1]):
            result.append((max(a[0], b[0]), min(a[1], b[1])))
        if a[1] <= b[1]:
            i += 1
        else:
            j += 1
    return merge(result, cuts)


def complement(intervals, total):
    result, cursor = [], 0.0
    for start, end in merge(intervals):
        if start > cursor:
            result.append((cursor, start))
        cursor = end
    if cursor < total:
        result.append((cursor, total))
    return result


def derive_visibility(samples):
    if len(samples) < 2:
        raise ValueError('At least two samples are required')
    origin = samples[0]['timestamp_utc']
    offsets = [(sample['timestamp_utc'] - origin).total_seconds() for sample in samples]
    if any(b <= a for a, b in zip(offsets, offsets[1:])):
        raise ValueError('Samples must be strictly chronological')
    total = offsets[-1]
    events, states, all_cuts = [], {}, []
    for body in ('sun', 'earth'):
        visible, invisible = [], []
        for index, (start, end) in enumerate(zip(offsets, offsets[1:])):
            angles = [samples[i].get(body) for i in (index, index + 1)]
            values = [angle.get('elevation_deg') if angle else None for angle in angles]
            if any(value is None or not math.isfinite(value) for value in values):
                continue
            a, b = values
            if (a > 0) == (b > 0):
                (visible if a > 0 else invisible).append((start, end))
                continue
            crossing = start + (end - start) * (-a) / (b - a)
            rising = b > 0
            visible.append((crossing, end) if rising else (start, crossing))
            invisible.append((start, crossing) if rising else (crossing, end))
            event_type = ('sunrise' if rising else 'sunset') if body == 'sun' else ('earthrise' if rising else 'earthset')
            events.append({'event_type': event_type, 'time_utc': origin + timedelta(seconds=crossing),
                           'bracket_start_utc': origin + timedelta(seconds=start),
                           'bracket_end_utc': origin + timedelta(seconds=end), 'method': 'linear_interpolation'})
        cuts = [offsets[i] for i, sample in enumerate(samples) if sample.get(body) and sample[body].get('elevation_deg') == 0]
        all_cuts.extend(cuts)
        states[body] = {'visible': merge(visible, cuts), 'invisible': merge(invisible)}
    states['combined'] = {
        'visible': intersect(states['sun']['visible'], states['earth']['visible'], all_cuts),
        # A known false body makes the conjunction false even if the other is unknown.
        'invisible': merge(states['sun']['invisible'] + states['earth']['invisible']),
    }
    summaries, windows = {}, []
    for body, state in states.items():
        unknown = complement(state['visible'] + state['invisible'], total)
        duration = lambda spans: sum(end - start for start, end in spans)
        longest = lambda spans: max((end - start for start, end in spans), default=0)
        lit, dark, missing = duration(state['visible']), duration(state['invisible']), duration(unknown)
        summaries[body] = {
            'visible_seconds': lit, 'invisible_seconds': dark,
            'known_seconds': lit + dark, 'unknown_seconds': missing,
            'visible_fraction_total': lit / total, 'coverage_fraction': (lit + dark) / total,
            'longest_visible_seconds': longest(state['visible']),
            'longest_invisible_seconds': longest(state['invisible']),
        }
        for status, spans in list(state.items()) + [('unknown', unknown)]:
            for start, end in spans:
                windows.append({'condition': body, 'state': status,
                                'start_utc': origin + timedelta(seconds=start),
                                'end_utc': origin + timedelta(seconds=end), 'duration_seconds': end - start})
    elevations = [sample['sun']['elevation_deg'] for sample in samples if sample.get('sun') and sample['sun'].get('elevation_deg') is not None and math.isfinite(sample['sun']['elevation_deg'])]
    return {'duration_seconds': total, 'summary': summaries,
            'max_sun_elevation_deg': max(elevations) if elevations else None,
            'events': sorted(events, key=lambda event: event['time_utc']),
            'windows': sorted(windows, key=lambda window: (window['condition'], window['start_utc'])),
            'event_absence': {kind: 'not_found_in_range' for kind in ('sunrise', 'sunset', 'earthrise', 'earthset') if not any(event['event_type'] == kind for event in events)}}
