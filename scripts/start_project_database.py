"""Start a persistent user-owned project PostgreSQL, no sudo/Docker.
Uses installed PostgreSQL 14 binaries; changes only .local/ and backend/.env.
Never reinitializes an existing cluster or changes credentials in a system cluster.
"""
import os
import secrets
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN = Path('/usr/lib/postgresql/14/bin')
LOCAL = ROOT / '.local'
DATA = LOCAL / 'postgres'
ENV = ROOT / 'backend/.env'
PORT = '55432'


def run(name, args, **kwargs):
    return subprocess.run([str(BIN/name), *args], check=True, **kwargs)


def main():
    if not (BIN/'initdb').exists():
        raise SystemExit('PostgreSQL 14 não está instalado. Consulte backend/README.md.')
    LOCAL.mkdir(mode=0o700, exist_ok=True)
    values = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            if '=' in line and not line.startswith('#'):
                key,value=line.split('=',1);values[key]=value
    user=values.get('DATABASE_USER','anti_spiral_group')
    password=values.get('DATABASE_PASSWORD') or secrets.token_urlsafe(32)
    name=values.get('DATABASE_NAME','anti_spiral')
    admin_user='antispiral_local_admin'
    if user == admin_user:
        raise SystemExit('Escolha uma role de aplicação diferente da role administrativa.')
    secret_file=LOCAL/'db-admin-secret'
    if not secret_file.exists():
        descriptor=os.open(secret_file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(descriptor,'w') as stream:
            stream.write(secrets.token_urlsafe(32))
    admin_password=secret_file.read_text()
    if not (DATA/'PG_VERSION').exists():
        with tempfile.NamedTemporaryFile(mode='w') as stream:
            stream.write(admin_password);stream.flush()
            run('initdb',['-D',str(DATA),'-U',admin_user,'--auth=scram-sha-256','--pwfile='+stream.name],stdout=subprocess.DEVNULL)
        socket=LOCAL/'socket';socket.mkdir(mode=0o700,exist_ok=True)
        with (DATA/'postgresql.conf').open('a') as stream:
            stream.write(f"\nlisten_addresses = '127.0.0.1'\nport = {PORT}\nunix_socket_directories = '{str(socket).replace(chr(39),chr(39)*2)}'\n")
    status=subprocess.run([str(BIN/'pg_ctl'),'-D',str(DATA),'status'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if status.returncode:
        run('pg_ctl',['-D',str(DATA),'-l',str(LOCAL/'postgres.log'),'-w','start'])
    connection=['-h','127.0.0.1','-p',PORT,'-U',admin_user]
    environment={**os.environ,'PGPASSWORD':admin_password}
    probe=subprocess.run([str(BIN/'psql'),*connection,'-d','postgres','-At','-c','SELECT 1'],env=environment,capture_output=True,text=True)
    identifier=lambda value:'"'+value.replace('"','""')+'"'
    literal=lambda value:"'"+value.replace("'","''")+"'"
    if probe.returncode:
        # Upgrade a cluster created by the first version of this helper only.
        bootstrap=['-h','127.0.0.1','-p',PORT,'-U',user,'-d','postgres','-v','ON_ERROR_STOP=1']
        run('psql',bootstrap,env={**os.environ,'PGPASSWORD':password},input=f'CREATE ROLE {identifier(admin_user)} LOGIN SUPERUSER PASSWORD {literal(admin_password)};',text=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    result=run('psql',[*connection,'-d','postgres','-At','-c','SELECT rolname FROM pg_roles'],env=environment,capture_output=True,text=True)
    if user not in result.stdout.splitlines():
        run('psql',[*connection,'-d','postgres','-v','ON_ERROR_STOP=1'],env=environment,input=f'CREATE ROLE {identifier(user)} LOGIN PASSWORD {literal(password)};',text=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    run('psql',[*connection,'-d','postgres','-v','ON_ERROR_STOP=1'],env=environment,input=f'ALTER ROLE {identifier(user)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;',text=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    result=run('psql',[*connection,'-d','postgres','-At','-c',"SELECT datname FROM pg_database"],env=environment,capture_output=True,text=True)
    if name not in result.stdout.splitlines():
        run('createdb',[*connection,'-O',user,'--',name],env=environment)
    values.update(DATABASE_USER=user,DATABASE_PASSWORD=password,DATABASE_NAME=name,DATABASE_HOST='127.0.0.1',DATABASE_PORT=PORT)
    values.setdefault('CORS_ORIGINS','["http://localhost:5173","http://127.0.0.1:5173"]')
    descriptor=os.open(ENV,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    with os.fdopen(descriptor,'w') as stream:
        stream.write(''.join(f'{key}={value}\n' for key,value in values.items()))
    os.chmod(ENV,0o600)
    print('BD persistente do projecto pronta em 127.0.0.1:55432; .env actualizado. Execute alembic upgrade head.')


if __name__=='__main__':
    main()
