export class DatasetImage {
    constructor(data = {}) {
        this.fileName = data.fileName || "";
        this.link = data.link || ""; // URL to fetch image
        this.bbox = data.bbox || null;
        this.date = data.date || null; // Acquisition date
        this.labels = data.labels || []; // Array of Label objects
    }
}
