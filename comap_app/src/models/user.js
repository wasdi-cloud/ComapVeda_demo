export class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || "";
        this.surname = data.surname || "";
        this.email = data.email || "";
        this.phone = data.phone || "";
        this.password = data.password || ""; // Usually not stored on frontend
        this.registrationDateTime = data.registrationDateTime || null;
        this.confirmationCode = data.confirmationCode || "";
        this.confirmationDate = data.confirmationDate || null;
        this.termsAccepted = data.termsAccepted || false;
        this.isValid = data.isValid || false;
        this.lastOtp = data.lastOtp || "";
        this.isAdmin = data.isAdmin || false;
    }
}
