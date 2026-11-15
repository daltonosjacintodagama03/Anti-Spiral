"""Set up local PostgreSQL without resetting existing databases or passwords.
Run with the backend Python environment: python scripts/setup_local_database.py.
Sudo authenticates via the terminal; never pass its password to this script.
"""
import os
import secrets
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
sys.path.insert(0, str(BACKEND))


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def admin(sql):
    result = subprocess.run(
        ['sudo', '-u', 'postgres', 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-d', 'postgres'],
        input=sql, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise RuntimeError('Não foi possível executar a operação administrativa. Confirme sudo e o PostgreSQL local. Nenhuma password existente foi alterada.')
    return result.stdout.strip()


def main():
    # Authenticate before making changes. Sudo asks via the controlling terminal.
    subprocess.run(['sudo', '-v'], check=True)
    env = BACKEND / '.env'
    if not env.exists():
        content = (
            'DATABASE_USER=anti_spiral_group\n'
            f'DATABASE_PASSWORD={secrets.token_urlsafe(32)}\n'
            'DATABASE_HOST=localhost\nDATABASE_PORT=5432\n'
            'DATABASE_NAME=anti_spiral\nCORS_ORIGINS=["http://localhost:5173"]\n'
        )
        descriptor = os.open(env, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w') as stream:
            stream.write(content)
    from app.config import settings
    if settings.database_host not in ('localhost', '127.0.0.1') or settings.database_port != 5432:
        raise RuntimeError('Este script configura apenas o PostgreSQL local na porta 5432; configuração existente preservada.')
    user = literal(settings.database_user)
    database = literal(settings.database_name)
    password = literal(settings.database_password)
    # format(%I/%L) quotes identifiers and literals on the PostgreSQL side.
    admin(f"SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', {user}, {password}) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname={user})\n\\gexec\n")
    admin(f"SELECT format('CREATE DATABASE %I OWNER %I', {database}, {user}) WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname={database})\n\\gexec\n")
    from sqlalchemy import create_engine, text
    engine = create_engine(settings.database_url)
    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
    except Exception:
        raise RuntimeError('A ligação com backend/.env falhou. Se o utilizador já existia, configure a sua password correcta no .env. O script não altera passwords existentes.') from None
    finally:
        engine.dispose()
    subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=BACKEND, check=True)
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as client:
        for route in ['/api/health', '/api/sites']:
            response = client.get(route)
            if response.status_code != 200:
                raise RuntimeError(f'Verificação falhou: {route} devolveu {response.status_code}.')
            print(f'{route}: OK')
    print('PostgreSQL configurado e migrações aplicadas. Nenhum dado de demonstração foi inserido.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        print(f'Configuração interrompida: {exc}', file=sys.stderr)
        sys.exit(1)
