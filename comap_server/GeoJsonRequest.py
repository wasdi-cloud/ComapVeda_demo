import geojson
from pydantic import RootModel, field_validator
from typing import Dict, Any


class GeoJsonRequest(RootModel):
    """Pydantic model that accepts a raw GeoJSON object as request body.

    Uses RootModel to accept the GeoJSON object directly at the root level.
    The field_validator validates it using the geojson library.
    Access the validated GeoJSON via `.root` or `.data` property.
    """

    root: Dict[str, Any]

    @field_validator('root', mode='before')
    @classmethod
    def validate_geojson(cls, oV):
        # Accept either a mapping or a raw JSON string from the request body.
        import json as _json

        if isinstance(oV, str):
            try:
                oV = _json.loads(oV)
            except Exception as e:
                raise ValueError(f"Invalid JSON body: {e}")

        # v is expected to be a mapping representing a GeoJSON geometry/feature
        try:
            oInstance = geojson.GeoJSON.to_instance(oV)
        except Exception as e:
            raise ValueError(f"GeoJSON parsing error: {e}")

        # Some geojson objects expose `is_valid`; treat missing attribute as valid
        if not getattr(oInstance, "is_valid", True):
            # convert ValidationInfo objects into strings so errors are serializable
            try:
                errors = [str(oEntity) for oEntity in oInstance.errors()]
            except Exception:
                errors = ["Unknown GeoJSON validation error"]
            raise ValueError(errors)

        return oV

    @property
    def data(self):
        """Alias for .root to maintain backwards compatibility."""
        return self.root