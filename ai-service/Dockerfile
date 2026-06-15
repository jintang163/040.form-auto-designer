FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p temp uploads models

RUN if command -v python &> /dev/null; then \
        python generate_proto.py 2>/dev/null || true; \
    fi

EXPOSE 8000 50051

ENV APP_HTTP_HOST=0.0.0.0
ENV APP_HTTP_PORT=8000
ENV APP_GRPC_PORT=50051
ENV APP_OCR_USE_GPU=false

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
