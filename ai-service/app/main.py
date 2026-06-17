import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.routes import router
from app.api.recommend_routes import router as recommend_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    for d in [settings.temp_dir, settings.upload_dir, settings.model_dir]:
        os.makedirs(d, exist_ok=True)

    logger.info("Starting up AI Recognition Service")
    logger.info("Settings: http={}:{}, grpc={}", settings.http_host, settings.http_port, settings.grpc_port)

    grpc_server = None
    try:
        from app.grpc_proto.grpc_server import start_grpc_server
        grpc_server = start_grpc_server()
    except Exception as e:
        logger.warning("gRPC server failed to start: {}", e)

    yield

    logger.info("Shutting down AI Recognition Service")
    if grpc_server:
        try:
            from app.grpc_proto.grpc_server import stop_grpc_server
            stop_grpc_server()
        except Exception as e:
            logger.warning("gRPC server shutdown error: {}", e)


app = FastAPI(
    title="Form AI Recognition Service",
    description="AI-powered form/table recognition service with PaddleOCR",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/recognize", tags=["recognize"])
app.include_router(recommend_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "form-ai-recognition"}


@app.get("/")
async def root():
    return {
        "service": "Form AI Recognition Service",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.http_host,
        port=settings.http_port,
        reload=False,
    )
