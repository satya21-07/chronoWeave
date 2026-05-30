# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend .
RUN npm run build -- --configuration production

# Final image with backend and nginx
FROM python:3.11-slim
RUN apt-get update && apt-get install -y nginx gettext-base && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=frontend-builder /frontend/dist/chronoweave/browser /usr/share/nginx/html
COPY render-nginx.conf.template /etc/nginx/conf.d/default.conf.template

ENV PYTHONPATH=/app/backend
EXPOSE 80
CMD bash -lc "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && uvicorn app.main:app --host 127.0.0.1 --port 8000 & nginx -g 'daemon off;'"
