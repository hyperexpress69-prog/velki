
class ApiError {
    /*
      Constructs a standardized error API response.
     * @param {number} subCode - Error code (e.g. 400, 500)
     * @param {string} message - Human-readable error message
     * @param {Error|object} error - The original error object or extra info
     * @param {object} [data={}] - Additional custom data
     */
    constructor(subCode = 500, message = "Something went wrong.", error = {}, data = {}) {
        this.subCode = subCode;
        this.message = message;
        this.status = false;
        this.timestamp = new Date().toISOString();

        // Extract error details (if a real Error object was passed)
        if (error instanceof Error) {
            this.errorName = error.name;
            this.errorMessage = error.message;
            this.stack = error.stack;
        } else {
            // If it's just a string or object, keep it as extra info
            this.errorName = "CustomError";
            this.errorMessage = typeof error === "string" ? error : JSON.stringify(error);
            this.stack = null;
        }

        // Optional extra context
        this.data = data;
    }
}

module.exports = { ApiError }