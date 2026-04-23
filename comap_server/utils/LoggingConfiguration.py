import logging.config
import os


def setupLogging():

    sLOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

    oLOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,  # prevents Uvicorn or other libraries from silencing the logs in the code
        "formatters": {
            "simple": {
                "format": "[%(levelname)s] [%(module)s] %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": sLOG_LEVEL,
                "formatter": "simple",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            # Root Logger settings
            "": {
                "handlers": ["console"],
                "level": sLOG_LEVEL,
            },
            "rio_tiler": { "level": "WARNING" },
            "rasterio": { "level": "WARNING" },
            "boto3": { "level": "WARNING" },
            "botocore": { "level": "WARNING" },
            "passlib": { "level": "WARNING" },
            "numexpr": { "level": "WARNING" },
            "fiona": { "level": "WARNING" },
        },
    }

    logging.config.dictConfig(oLOGGING_CONFIG)