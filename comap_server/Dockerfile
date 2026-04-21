# Use an official Python image with GDAL support for geospatial libraries
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.8.0

# Set working directory
WORKDIR /app

# Install Python, pip, and PostgreSQL development libraries
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
# --workers: number of worker processes. Each worker has its own DB connection pool.
# For a 56-core server, 8 workers is a conservative/safe starting point.
# Increase toward 16 if load requires it, but monitor total DB connections
# (workers × pool_size must stay well below PostgreSQL max_connections).
CMD ["gunicorn", "main:oApp", "-k", "uvicorn.workers.UvicornWorker", "--workers", "8", "--bind", "0.0.0.0:8000", "--timeout", "120"]
