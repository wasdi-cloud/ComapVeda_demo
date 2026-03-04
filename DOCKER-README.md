# COMAP - Docker Deployment Guide

Complete Docker setup for the COMAP application with database, backend server, and frontend client.

## Architecture

The application consists of three services deployed with **Traefik reverse proxy**:

1. **Database (db)** - PostGIS/PostgreSQL database (internal only)
2. **Backend Server (server)** - FastAPI application at `comap.wasdi.net/api/*`
3. **Frontend Client (client)** - React application at `comap.wasdi.net`

All services communicate over Docker networks:
- `comap-network` - Internal network for database connectivity
- `net-wasdi` - External network with Traefik for public access

### Public Access Points:
- **Frontend**: https://comap.wasdi.net
- **Backend API**: https://comap.wasdi.net/api/*
- **API Docs**: https://comap.wasdi.net/api/docs

## Prerequisites

- Docker (version 20.10 or later)
- Docker Compose (version 1.29 or later)

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and customize if needed:

```bash
cp .env.example .env
```

Edit `.env` to change database credentials:
```env
POSTGRES_USER=root
POSTGRES_PASSWORD=multipass
POSTGRES_DB=comapdb
POSTGRES_PORT=5432
```

### 2. Start All Services

From the project root directory:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 3. Access the Application

Once deployed with Traefik:
- **Frontend**: https://comap.wasdi.net
- **Backend API**: https://comap.wasdi.net/api/
- **API Docs**: https://comap.wasdi.net/api/docs

For local development without Traefik:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432

### 4. Stop All Services

```bash
# Stop services (keeps data)
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

## Service Details

### Database Service

- **Image**: postgis/postgis:16-3.4
- **Port**: Configured via `POSTGRES_PORT` in `.env` (default: 5432)
- **Credentials**: Configured in `.env` file:
  - User: `POSTGRES_USER`
  - Password: `POSTGRES_PASSWORD`
  - Database: `POSTGRES_DB`
- **Data Persistence**: Volume mounted at `postgres_data`

### Backend Server Service

- **Technology**: FastAPI with Python
- **Public URL**: https://comap.wasdi.net/api/*
- **Internal Port**: 8000
- **Features**:
  - RESTful API endpoints
  - Geospatial data processing (GDAL, Rasterio)
  - Database integration with SQLAlchemy
  - Auto-reload for development
  - Traefik strips `/api` prefix automatically

### Frontend Client Service

- **Technology**: React with Nginx
- **Public URL**: https://comap.wasdi.net
- **Internal Port**: 80
- **Features**:
  - Mapbox and Leaflet integration
  - API calls to `/api/*` routed by Traefik to backend
  - API URL configurable via `REACT_APP_API_URL` in root `.env`
  - Production-optimized multi-stage build

## Traefik Reverse Proxy Configuration

The application uses **Traefik** for path-based routing on the same domain:

### How Routing Works:

```
User Request: https://comap.wasdi.net
    ↓
Traefik (reverse proxy)
    ├─ comap.wasdi.net/         → client service (React app)
    └─ comap.wasdi.net/api/*    → server service (FastAPI)
```

### Traefik Labels Explained:

**Backend (server)**:
- Routes: `Host(comap.wasdi.net) && PathPrefix(/api)`
- Strips `/api` prefix before forwarding to FastAPI
- Priority: 2 (matches first)

**Frontend (client)**:
- Routes: `Host(comap.wasdi.net)`
- Serves React app for all other paths
- Priority: 1 (matches after /api)

### React API Configuration:

Your React app uses `REACT_APP_API_URL=/api/` (set in root `.env`):

```javascript
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/";
// In production: BASE_URL = "/api/"
// Browser requests: https://comap.wasdi.net/api/projects
// Traefik routes to: http://server:8000/projects (inside Docker)
```

This configuration is already set up in `comap_app/src/services/api.js`.

## Development Workflow

### Running Individual Services

```bash
# Start only the database
docker-compose up db

# Start database and server
docker-compose up db server

# Start all services
docker-compose up
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
```

### Rebuilding After Changes

```bash
# Rebuild specific service
docker-compose up --build server

# Rebuild all services
docker-compose up --build
```

### Server Development Mode

The server service mounts the source code as a volume (`./comap_server:/app`), so changes to Python files will automatically reload the server without rebuilding.

To disable auto-reload for production, modify the Dockerfile CMD:
```dockerfile
CMD ["uvicorn", "main:oApp", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

Remove `--reload` for production deployment.

## Environment Variables

All database credentials and configuration are stored in the `.env` file at the project root.

### Configuration Options

- **POSTGRES_USER** - Database username (default: `root`)
- **POSTGRES_PASSWORD** - Database password (default: `multipass`)
- **POSTGRES_DB** - Database name (default: `comapdb`)
- **POSTGRES_PORT** - Database port (default: `5432`)
- **DATABASE_URL** - Full connection string (automatically constructed)
- **REACT_APP_API_URL** - Frontend API endpoint (default: `/api/` for Docker, proxied by nginx)

**Important**: The `.env` file is ignored by Git for security. Always use `.env.example` as a template.

### API URL Configuration

The React app uses `REACT_APP_API_URL=/api/` for production with Traefik:

**Production Flow**:
1. Browser loads React app from `https://comap.wasdi.net`
2. React makes API call: `fetch('/api/projects')`
3. Browser resolves to: `https://comap.wasdi.net/api/projects`
4. Traefik receives request and matches `/api` PathPrefix rule
5. Traefik strips `/api` and forwards to backend: `http://server:8000/projects`
6. FastAPI processes request and returns response

**Local Development** (outside Docker):
Create `comap_app/.env.local`:
```env
REACT_APP_API_URL=http://localhost:8000/
```

### DNS Configuration

Ensure your DNS points to your server:
```
comap.wasdi.net → YOUR_SERVER_IP
```

No separate DNS entry needed for the API - it's on the same domain with `/api/` path.

### Additional Server Configuration

For server-specific environment variables, create a `.env` file in `comap_server/` directory.

## Troubleshooting

### Port Conflicts

If ports are already in use, modify the ports in `docker-compose.yml`:

```yaml
ports:
  - "3001:80"    # Change client port to 3001
  - "8001:8000"  # Change server port to 8001
  - "5433:5432"  # Change database port to 5433
```

### Database Connection Issues

Ensure the database is fully started before the server attempts to connect. The `depends_on` directive handles this, but for additional reliability, you can add a health check:

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U root"]
    interval: 5s
    timeout: 5s
    retries: 5
```

### Container Won't Start

```bash
# Check container logs
docker-compose logs [service-name]

# Check running containers
docker ps -a

# Remove all containers and start fresh
docker-compose down -v
docker-compose up --build
```

### Clearing Everything

```bash
# Remove all containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean Docker system (careful!)
docker system prune -a --volumes
```

## Production Deployment

For production deployment with Traefik:

1. **Update credentials**: Edit `.env` file with strong passwords
2. **Configure HTTPS**: Change entrypoints from `web` to `websecure` in docker-compose.yml
3. **Add TLS certificates**: Ensure Traefik has SSL certificates configured (Let's Encrypt recommended)
4. **Update domain**: Replace `comap.wasdi.net` with your actual domain in docker-compose.yml
5. **Remove dev volumes**: Comment out volume mounting for server code in docker-compose.yml
6. **Disable auto-reload**: Remove `--reload` from FastAPI command in Dockerfile
7. **Configure CORS**: Update CORS settings in FastAPI to allow your domain
8. **Database backups**: Set up automated database backup routine
9. **Monitoring**: Add health checks and monitoring (Prometheus/Grafana)

### Enable HTTPS:
```yaml
labels:
  - "traefik.http.routers.comap-server.entrypoints=websecure"
  - "traefik.http.routers.comap-server.tls=true"
  - "traefik.http.routers.comap-server.tls.certresolver=letsencrypt"
```

## Network Configuration

The application uses two Docker networks:

### Internal Network (`comap-network`)
Private bridge network for inter-service communication:
- `db` - Database service (not externally accessible)
- `server` - Backend service
- `client` - Frontend service

### External Network (`net-wasdi`)
Traefik's external network for public access:
- `server` - Exposed at `comap.wasdi.net/api/*`
- `client` - Exposed at `comap.wasdi.net`

### Traefik Requirements
This setup assumes you have Traefik running with:
- An external network named `net-wasdi`
- Entry points configured (typically `web` for HTTP and `websecure` for HTTPS)

To enable HTTPS, update the entrypoints in [docker-compose.yml](docker-compose.yml):
```yaml
- "traefik.http.routers.comap-server.entrypoints=websecure"
- "traefik.http.routers.comap-client.entrypoints=websecure"
```

## Data Persistence

Database data is persisted in the `postgres_data` Docker volume. To backup:

```bash
# Export database (use credentials from your .env file)
docker-compose exec db pg_dump -U root comapdb > backup.sql

# Import database
docker-compose exec -T db psql -U root comapdb < backup.sql
```

**Note**: Replace `root` and `comapdb` with your actual `POSTGRES_USER` and `POSTGRES_DB` values from `.env`.
