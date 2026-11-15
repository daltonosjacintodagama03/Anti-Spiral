from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from app.models import AccountSession, User, MissionAnalysis
from app.routers.mission_analyses import Requirements
from app.integrations.horizons import HorizonsError

REQUEST=dict(name='Mission test',objectives=['science','technology'],duration_value=1,duration_unit='week',
             start_utc='2026-11-14T12:00:00Z',step_minutes=60,site_ids=['nobile','malapert'],
             minimum_light_pct=50,minimum_earth_pct=50,maximum_dark_hours=72,maximum_earth_outage_hours=72)


def register(client, name='a', access='explore'):
    response=client.post('/api/auth/register',json=dict(name=name,email=f'{name}@example.com',password='testpassword123',access=access))
    assert response.status_code==201,response.text
    return response.json(),client.cookies.get('antispiral_session')


def scientific_result():
    value=json.loads((Path(__file__).parent/'fixtures/comparison-live.json').read_text())['a']
    return value


def test_auth_password_session_revocation_and_no_plain_tokens(client):
    user,token=register(client)
    assert client.get('/api/auth/me').json()['id']==user['id']
    assert client.get('/api/auth/me').headers['cache-control']=='no-store'
    with client.app.state.testing_db() as db:
        account=db.get(User,user['id'])
        assert account.password_hash.startswith('$argon2id$')
        assert account.password_hash!='testpassword123'
        assert db.get(AccountSession,hashlib.sha256(token.encode()).hexdigest()) is not None
        assert db.get(AccountSession,token) is None
    assert client.post('/api/auth/logout').status_code==204
    assert client.get('/api/auth/me').status_code==401
    client.cookies.set('antispiral_session',token)
    assert client.get('/api/auth/me').status_code==401


def test_login_normalization_expiry_and_origin(client):
    account,_=register(client)
    assert client.post('/api/auth/logout').status_code==204
    assert client.post('/api/auth/login',json=dict(email='A@EXAMPLE.COM',password='wrongpassword')).status_code==401
    assert client.post('/api/auth/login',json=dict(email='A@EXAMPLE.COM',password='testpassword123',access='planeje')).status_code==200
    assert client.post('/api/mission-analyses',json=REQUEST,headers={'Origin':'https://untrusted.example'}).status_code==403
    with client.app.state.testing_db() as db:
        session=db.scalar(select(AccountSession).where(AccountSession.user_id==account['id']))
        session.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1);db.commit()
    assert client.get('/api/auth/me').status_code==401


@pytest.mark.parametrize('host', ['localhost:5173', 'localhost:5174', '127.0.0.1:5174'])
def test_auth_through_same_origin_proxy_on_actual_frontend_port(client, host):
    headers = {'Host': host, 'Origin': f'http://{host}'}
    registration = {'name': 'Proxy test', 'email': 'proxy@example.com', 'password': 'testpassword123'}
    assert client.post('/api/auth/register', json=registration, headers=headers).status_code == 201
    assert client.post('/api/auth/login', json=registration, headers=headers).status_code == 200


@pytest.mark.parametrize('path', ['register', 'login', 'logout'])
def test_auth_proxy_rejects_foreign_origin(client, path):
    response = client.post(f'/api/auth/{path}', json={}, headers={
        'Host': 'localhost:5174', 'Origin': 'https://untrusted.example',
    })
    assert response.status_code == 403
    assert response.json()['detail'] == 'Origem não autorizada.'


@pytest.mark.parametrize('change',[
    {'duration_value':1.5},{'duration_value':'2'},{'duration_value':0},{'objectives':[]},
    {'objectives':['science','science']},{'site_ids':['nobile','nobile']},{'site_ids':['unknown','nobile']},
    {'duration_value':1,'duration_unit':'year','step_minutes':60},{'start_utc':'2028-12-31T12:00:00Z'},
    {'start_utc':'2026-11-14T12:00:00'},{'minimum_light_pct':101},{'maximum_dark_hours':-1},
])
def test_requirements_reject_invalid(client,change):
    register(client)
    assert client.post('/api/mission-analyses',json=REQUEST|change).status_code==422


@pytest.mark.parametrize('unit,hours,step',[('day',24,60),('week',168,60),('month',720,60),('year',8760,120)])
def test_duration_units_and_multiselect(unit,hours,step):
    value=Requirements(**(REQUEST|{'duration_unit':unit,'step_minutes':step}))
    assert value.hours()==hours
    assert value.objectives==['science','technology']


def test_private_history_execution_and_resume(client,monkeypatch):
    a,token_a=register(client)
    created=client.post('/api/mission-analyses',json=REQUEST)
    assert created.status_code==201
    identifier=created.json()['id']
    analysis=scientific_result()
    mock=AsyncMock(return_value=analysis)
    monkeypatch.setattr('app.routers.mission_analyses.analyze',mock)
    for site in REQUEST['site_ids']:
        response=client.post(f'/api/mission-analyses/{identifier}/sites/{site}')
        assert response.status_code==200,response.text
    assert response.json()['status']=='completed'
    assert len(response.json()['results']['nobile']['checks'])==4
    assert mock.await_count==2
    client.post(f'/api/mission-analyses/{identifier}/sites/nobile')
    assert mock.await_count==2  # Immutable completed result, no second provider call.
    assert client.get('/api/mission-analyses').json()[0]['id']==identifier
    b,token_b=register(client,'b','planeje')
    assert client.get('/api/mission-analyses').json()==[]
    assert client.get(f'/api/mission-analyses/{identifier}').status_code==404
    assert client.post(f'/api/mission-analyses/{identifier}/sites/nobile').status_code==404
    client.cookies.clear();client.cookies.set('antispiral_session',token_a)
    saved=client.get(f'/api/mission-analyses/{identifier}').json()
    assert saved['requirements']['objectives']==REQUEST['objectives']
    assert saved['results']['nobile']['analysis']['run_id']==analysis['run_id']


def test_failure_is_persisted_retry_and_lease(client,monkeypatch):
    register(client)
    record=client.post('/api/mission-analyses',json=REQUEST).json();identifier=record['id']
    mock=AsyncMock(side_effect=HorizonsError('Provider unavailable'))
    monkeypatch.setattr('app.routers.mission_analyses.analyze',mock)
    failed=client.post(f'/api/mission-analyses/{identifier}/sites/nobile').json()
    assert failed['results']['nobile']['status']=='failed'
    assert failed['results']['nobile']['analysis'] is None
    with client.app.state.testing_db() as db:
        row=db.get(MissionAnalysis,identifier)
        row.results={**row.results,'nobile':{**row.results['nobile'],'status':'running','lease_until':(datetime.now(timezone.utc)+timedelta(seconds=80)).isoformat()}}
        db.commit()
    assert client.post(f'/api/mission-analyses/{identifier}/sites/nobile').status_code==409
    with client.app.state.testing_db() as db:
        row=db.get(MissionAnalysis,identifier)
        row.results={**row.results,'nobile':{**row.results['nobile'],'lease_until':(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()}}
        db.commit()
    monkeypatch.setattr('app.routers.mission_analyses.analyze',AsyncMock(return_value=scientific_result()))
    assert client.post(f'/api/mission-analyses/{identifier}/sites/nobile').json()['results']['nobile']['status']=='completed'


def test_anonymous_and_legacy_jobs_are_private(client):
    assert client.get('/api/mission-analyses').status_code==401
    assert client.post('/api/mission-analyses',json=REQUEST).status_code==401
    assert client.get('/api/jobs').status_code==401
    _,a=register(client)
    assert client.post('/api/jobs',json={'name':'Private','kind':'test','payload':{}}).status_code==201
    register(client,'b')
    assert client.get('/api/jobs').json()==[]


def test_validation_does_not_echo_password_and_login_is_limited(client):
    secret='X!9'
    response=client.post('/api/auth/login',json={'email':'a@example.com','password':secret})
    assert response.status_code==422
    assert secret not in response.text
    assert all(set(item)=={'loc','msg','type'} for item in response.json()['detail'])
    for _ in range(10):
        assert client.post('/api/auth/login',json={'email':'missing@example.com','password':'wrong-password'}).status_code==401
    assert client.post('/api/auth/login',json={'email':'missing@example.com','password':'wrong-password'}).status_code==429


def test_stored_analysis_quota_is_per_account(client):
    register(client)
    for _ in range(20):
        assert client.post('/api/mission-analyses',json=REQUEST).status_code==201
    assert client.post('/api/mission-analyses',json=REQUEST).status_code==429
    register(client,'second')
    assert client.post('/api/mission-analyses',json=REQUEST).status_code==201
