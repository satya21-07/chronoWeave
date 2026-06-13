# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend .
RUN npm run build -- --configuration production

# Final image with backend and nginx
FROM python:3.11-slim
RUN apt-get update && apt-get install -y nginx gettext-base && rm -rf /var/lib/apt/lists/* && rm -f /etc/nginx/sites-enabled/default
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=frontend-builder /frontend/dist/chronoweave/browser /usr/share/nginx/html
COPY render-nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PYTHONPATH=/app/backend
EXPOSE 80
CMD ["/usr/local/bin/docker-entrypoint.sh"]
