export class ImageStyle {
    constructor(data = {}) {
        this.projectId = data.projectId || null;

        // Bands
        this.singleBand = data.singleBand || null; // If set, grayscale mode
        this.band1 = data.band1 || "B04"; // Red
        this.band2 = data.band2 || "B03"; // Green
        this.band3 = data.band3 || "B02"; // Blue

        // Correction
        this.brightness = data.brightness || 0;
        this.contrast = data.contrast || 0;
        this.hue = data.hue || 0;
        this.saturation = data.saturation || 0;
        this.lightness = data.lightness || 0;

        // Histogram
        this.autoLevel = data.autoLevel || false;
        this.saturateLevel = data.saturateLevel || false;
        this.saturationValue = data.saturationValue || 2.0; // e.g. 2% cut
    }
}
