export class AttributeValue {
    constructor(data = {}) {
        this.name = data.name || "";
        this.type = data.type || "TEXT";
        this.field = data.field || ""; // The key/ID of the attribute definition
        this.value = data.value || "";
    }
}

export class Label {
    constructor(data = {}) {
        this.id = data.id || null;

        // Geometry (GeoJSON usually)
        this.geometry = data.geometry || null;
        this.isPoint = data.isPoint || false;
        this.isLine = data.isLine || false;
        this.isPolygon = data.isPolygon || false;

        // Review Process
        this.reviewers = data.reviewers || []; // List of User IDs who reviewed
        this.reviewCount = data.reviewCount || 0;
        this.reviewNotes = data.reviewNotes || "";

        // Data
        this.attributes = (data.attributes || []).map(a => new AttributeValue(a));
    }
}
