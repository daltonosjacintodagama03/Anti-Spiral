import hashlib
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Literal

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, AccountSession

router = APIRouter(prefix='/api/auth', tags=['accounts'])
hasher = PasswordHasher()
# Rate limiting is per process; use a single API process for this prototype.
attempts = defaultdict(deque)
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(24))


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    access: Literal['planeje', 'estude', 'explore'] = 'explore'

    @field_validator('email')
    @classmethod
    def email_address(cls, value):
        value = value.strip().lower()
        if '@' not in value or any(c.isspace() for c in value):
            raise ValueError('Indique um email válido.')
        return value


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=120)

    @field_validator('name')
    @classmethod
    def meaningful_name(cls, value):
        if not value.strip():
            raise ValueError('Indique um nome.')
        return value.strip()


class AccountRead(BaseModel):
    id: str
    name: str
    email: str
    access: str


def current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get('antispiral_session', '')
    session = db.get(AccountSession, hashlib.sha256(token.encode()).hexdigest()) if token else None
    expiry = (session.expires_at.astimezone(timezone.utc) if session.expires_at.tzinfo else session.expires_at.replace(tzinfo=timezone.utc)) if session else None
    if expiry is None or expiry <= datetime.now(timezone.utc):
        raise HTTPException(401, 'Inicie sessão para aceder aos dados da sua conta.')
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, 'Sessão inválida.')
    return user


def limit(request):
    key = request.client.host if request.client else 'unknown'
    queue = attempts[key]
    now = time.monotonic()
    while queue and queue[0] < now - 60:
        queue.popleft()
    if len(queue) >= 10:
        raise HTTPException(429, 'Demasiadas tentativas. Aguarde um minuto.')
    queue.append(now)


def open_session(user, db, response):
    token = secrets.token_urlsafe(32)
    db.add(AccountSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
                          expires_at=datetime.now(timezone.utc) + timedelta(days=7)))
    db.commit()
    response.set_cookie('antispiral_session', token, httponly=True, secure=settings.secure_cookies,
                        samesite='lax', max_age=7*86400, path='/')
    return dict(id=user.id, name=user.name, email=user.email, access=user.access)


@router.post('/register', response_model=AccountRead, status_code=201)
def register(data: Registration, request: Request, response: Response, db: Session = Depends(get_db)):
    limit(request)
    user = User(name=data.name.strip(), email=data.email, password_hash=hasher.hash(data.password), access=data.access)
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Não foi possível criar esta conta. Verifique os dados ou tente iniciar sessão.') from None
    return open_session(user, db, response)


@router.post('/login', response_model=AccountRead)
def login(data: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    limit(request)
    user = db.scalar(select(User).where(User.email == data.email))
    try:
        valid = hasher.verify(user.password_hash if user else DUMMY_HASH, data.password)
    except (VerificationError, InvalidHashError):
        valid = False
    if not user or not valid:
        raise HTTPException(401, 'Email ou senha inválidos.')
    # Presentation preference, never an authorization role.
    user.access = data.access
    return open_session(user, db, response)


@router.get('/me', response_model=AccountRead)
def me(user=Depends(current_user)):
    return dict(id=user.id, name=user.name, email=user.email, access=user.access)


@router.post('/logout', status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get('antispiral_session', '')
    record = db.get(AccountSession, hashlib.sha256(token.encode()).hexdigest())
    if record:
        db.delete(record)
        db.commit()
    response.delete_cookie('antispiral_session', path='/')
