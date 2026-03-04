# Local Development Setup

This guide explains how to run COMAP locally for development and debugging.

## Prerequisites

- Python 3.9+ with pip
- Node.js 18+ with npm
- Docker Desktop (for PostgreSQL database)

## Setup Steps

### 1. Start PostgreSQL Database

Keep the database running in Docker (it's already configured):

```powershell
docker compose up -d db
```

The database will be available at `localhost:5433`.

### 2. Run FastAPI Server Locally

#### Navigate to server directory:
```powershell
cd comap_server
```

#### Install Python dependencies:
```powershell
pip install -r requirements.txt
```

#### Run the server:
```powershell
# The server will automatically load .env.local
python -m uvicorn main:oApp --reload --port 8000
```

The API will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- TiTiler tiles endpoint: `http://localhost:8000/tiles/`

### 3. Run React App Locally

#### Navigate to client directory (in a new terminal):
```powershell
cd comap_app
```

#### Install npm dependencies (first time only):
```powershell
npm install
```

#### Run the development server:
```powershell
# React will automatically load .env.local
npm start
```

The app will open at `http://localhost:3000`

## Environment Variables Summary

### Server (.env.local)
- `DATABASE_URL=postgresql://root:multipass@localhost:5433/comapdb`
  - Port 5433 connects to PostgreSQL in Docker
  - Change to 5432 if running PostgreSQL locally

### Client (.env.local)
- `REACT_APP_API_URL=http://localhost:8000/`
  - Points to local FastAPI server
- `REACT_APP_MAPBOX_TOKEN=pk.your_token_here`
  - Your Mapbox access token (already configured)

## Debugging in VS Code

### Debug FastAPI Server

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "main:oApp",
        "--reload",
        "--port",
        "8000"
      ],
      "cwd": "${workspaceFolder}/comap_server",
      "envFile": "${workspaceFolder}/comap_server/.env.local",
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug React App

React debugging works out of the box with Chrome DevTools. For VS Code debugging:

1. Install the "Debugger for Chrome" or "JavaScript Debugger" extension
2. Start the React app with `npm start`
3. Use F5 to attach debugger

## Switching Between Local and Docker

### To switch back to Docker:
```powershell
docker compose down
docker compose up -d
```

### To stop local development:
- Press `Ctrl+C` in both terminal windows (server and client)
- Optionally stop the database: `docker compose down db`

## Notes

- The local `.env.local` files are gitignored and won't be committed
- Docker uses the root `.env` file (different configuration)
- FastAPI loads `.env.local` automatically via python-dotenv
- React loads `.env.local` automatically (Create React App behavior)
- Database schema/data persists in Docker volume even when stopped
