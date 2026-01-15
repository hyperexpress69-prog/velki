const dotenv = require('dotenv');
dotenv.config();
const getEnvVar = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return [];
    return arr.map(e => process.env[e] || "");
}
module.exports = { getEnvVar }