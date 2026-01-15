class ApiResponse {
    constructor(subCode = 200, message = "Success", data = {}) {
        this.subCode = subCode;
        this.message = message;
        this.data = data;
        this.status = true;
    }
}

module.exports = { ApiResponse }