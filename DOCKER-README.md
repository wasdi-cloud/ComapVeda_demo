# COMAP - Docker Deployment Guide

Complete Docker setup for the COMAP application with database, backend server, and frontend client.

## Architecture

The application consists of three services:

1. **Database (db)** - PostGIS/PostgreSQL database on port 5432
2. **Backend Server (server)** - FastAPI application on port 8000
3. **Frontend Client (client)** - React application served by Nginx on port 3000

All services communicate over a Docker network called `comap-network`.

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
- **Port**: 8000
- **Features**:
  - RESTful API endpoints
  - Geospatial data processing (GDAL, Rasterio)
  - Database integration with SQLAlchemy
  - Auto-reload for development

### Frontend Client Service

- **Technology**: React with Nginx
- **Port**: 3000 (mapped from container port 80)
- **Features**:
  - Mapbox and Leaflet integration
  - API proxy configured to `/api/` → backend server
  - Production-optimized build

## API Proxy Configuration

The frontend is configured to proxy API requests to the backend:

- Frontend URL: `http://localhost:3000/api/*`
- Proxied to: `http://server:8000/*`

This means your React app should make API calls to `/api/endpoint` instead of `http://localhost:8000/endpoint`.

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

**Important**: The `.env` file is ignored by Git for security. Always use `.env.example` as a template.

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

For production deployment:

1. **Update credentials**: Edit `.env` file with strong passwords
2. Remove volume mounting for server code (in `docker-compose.yml`)
3. Disable auto-reload in server
4. Add health checks
5. Configure proper CORS settings
6. Use environment-specific configuration
7. Enable HTTPS with reverse proxy (e.g., Traefik, Nginx)

## Network Configuration

All services are connected via `comap-network` bridge network, allowing services to communicate using their service names:
- `db` - Database service
- `server` - Backend service  
- `client` - Frontend service

## Data Persistence

Database data is persisted in the `postgres_data` Docker volume. To backup:

```bash
# Export database (use credentials from your .env file)
docker-compose exec db pg_dump -U root comapdb > backup.sql

# Import database
docker-compose exec -T db psql -U root comapdb < backup.sql
```

**Note**: Replace `root` and `comapdb` with your actual `POSTGRES_USER` and `POSTGRES_DB` values from `.env`.
