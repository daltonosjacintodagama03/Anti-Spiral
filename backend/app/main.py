from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, ProgrammingError
from fastapi.exceptions import RequestValidationError
from urllib.parse import urlsplit
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import accounts, health, jobs, positions, sites, mission_analyses

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(sites.router)
app.include_router(jobs.router)
app.include_router(positions.router)

app.include_router(accounts.router)
app.include_router(mission_analyses.router)

@app.middleware('http')
async def origin_protection(request: Request, call_next):
    origin = request.headers.get('origin')
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and origin:
        same_host = urlsplit(origin).netloc == request.headers.get('host')
        if not same_host and origin not in settings.cors_origins:
            return JSONResponse(status_code=403, content={'detail': 'Origem não autorizada.'})
    try:
        response = await call_next(request)
        if request.url.path.startswith(('/api/auth', '/api/mission-analyses', '/api/jobs')):
            response.headers['Cache-Control'] = 'no-store'
        return response
    except (OperationalError, ProgrammingError):
        return JSONResponse(status_code=503, content={'detail': 'Base de dados indisponível. Verifique as credenciais e execute as migrações.'})

@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError):
    # Do not echo passwords, cookies or entire request bodies in validation errors.
    errors = [{key: error[key] for key in ('loc','msg','type')} for error in exc.errors()]
    return JSONResponse(status_code=422, content={'detail': errors})
