from sqlalchemy import text, func
from sqlalchemy.orm import sessionmaker

from database import engine

# 1. Test Connection & PostGIS Version
# We run a raw SQL command to ask the database "Who are you?"
try:
    with engine.connect() as connection:
        # Ask for the PostGIS version
        result = connection.execute(text("SELECT PostGIS_Full_Version();")).scalar()
        print(f"✅ PostGIS is ACTIVE: {result.split(' ')[0]}")
        # Should print something like: POSTGIS="3.4.2...
except Exception as e:
    print(f"❌ PostGIS Check Failed: {e}")
    exit()

# 2. Test GeoAlchemy2 (The "Math")
# We will ask the DB to calculate the distance between New York and London.
# If GeoAlchemy works, it will translate this Python code into valid PostGIS SQL.

Session = sessionmaker(bind=engine)
session = Session()

try:
    # New York (Lat 40.7, Lon -74.0)
    # London (Lat 51.5, Lon -0.1)
    # We use ST_DistanceSphere which calculates distance in meters on a round earth

    # NOTE: In spatial databases, the order is usually POINT(Longitude Latitude)
    ny = "POINT(-74.0060 40.7128)"
    london = "POINT(-0.1276 51.5074)"

    # This line uses GeoAlchemy (func.ST_...)
    distance_query = session.query(
        func.ST_DistanceSphere(
            func.ST_GeomFromText(ny, 4326),
            func.ST_GeomFromText(london, 4326)
        )
    )

    distance_meters = distance_query.scalar()
    distance_km = distance_meters / 1000

    print(f"✅ GeoAlchemy is WORKING.")
    print(f"   Calculated Distance: {distance_km:.2f} km")
    print("   (If you see ~5570 km, your spatial stack is perfect).")

except Exception as e:
    print(f"❌ GeoAlchemy Check Failed: {e}")
    print("   Make sure you have installed: pip install geoalchemy2")

finally:
    session.close()