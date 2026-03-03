export class Attribute {
    constructor(data = {}) {
        this.name = data.name || "";
        this.type = data.type || "TEXT"; // See AttributeType Enum
        this.categories = data.categories || []; // Array of strings if type is CATEGORY
        this.colors = data.colors || {}; // Map of category -> color code
        this.isMandatory = data.isMandatory || false;
    }
}

export class LabelTemplate {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || "";
        this.description = data.description || "";

        // Geometries
        this.hasPolygons = data.hasPolygons || false;
        this.hasLines = data.hasLines || false;
        this.hasPoints = data.hasPoints || false;

        // Attributes List
        this.attributes = (data.attributes || []).map(a => new Attribute(a));

        // Styling
        this.isFixedColor = data.isFixedColor || false;
        this.fixedColor = data.fixedColor || "#ff0000";
        this.colorAttributeName = data.colorAttributeName || ""; // Attribute used for coloring if not fixed

        // Meta
        this.creator = data.creator || null; // User ID
        this.creationDate = data.creationDate || null;
    }
}
