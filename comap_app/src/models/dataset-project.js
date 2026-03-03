export class DatasetProject {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || "";
        this.description = data.description || "";

        // Spatial
        this.isGlobal = data.isGlobal || false;
        this.bbox = data.bbox || null; // e.g. GeoJSON or [minX, minY, maxX, maxY]

        // Meta
        this.isPublic = data.isPublic || false;
        this.creationDate = data.creationDate || null;
        this.link = data.link || "";
        this.startDate = data.startDate || null;
        this.endDate = data.endDate || null;

        // Settings
        this.annotatorsSeeAllLabels = data.annotatorsSeeAllLabels || false;
        this.reviewRequired = data.reviewRequired || false;
        this.minReviewCount = data.minReviewCount || 0;
        this.mission = data.mission || "S2"; // MissionType Enum
        this.task = data.task || "SEMANTIC_SEGMENTATION"; // TaskType Enum

        // Storage
        this.selfHosted = data.selfHosted || false;
        this.maxStorage = data.maxStorage || 2048; // MB
        this.s3Address = data.s3Address || "";
        this.s3User = data.s3User || "";
        this.s3Password = data.s3Password || "";

        // Relationships
        this.images = data.images || []; // Array of DatasetImage
        this.template = data.template || null; // LabelTemplate

        // People (Lists of User IDs or User Objects)
        this.owners = data.owners || [];
        this.annotators = data.annotators || [];
        this.reviewers = data.reviewers || [];

        // Admin Workflow
        this.requestDate = data.requestDate || null;
        this.approved = data.approved || false;
        this.rejected = data.rejected || false;
        this.rejectionNote = data.rejectionNote || "";

        this.style = data.style || null; // ImageStyle
    }
}
