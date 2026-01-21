const { ApiError } = require("../../../utils/apiError");
const { ApiResponse } = require("../../../utils/apiResponse");
const { createLogger } = require("../../../utils/logger");
const { convertFancyToTargetDS, convertBookMakerToTargetDS } = require("../services/converter");

const logger = createLogger("fancy_api", "jsonl");

const getFancyMarketData = async (req, res) => {
    try {

        const { match_id } = req.query;
        if (!match_id) throw new ApiError(400, "match_id is requried");
        console.log("imcoming", match_id);
        const data = await convertFancyToTargetDS(match_id);

        return res.status(200).send(new ApiResponse(200, "Fancy market fetched successfully.", data));
    } catch (error) {
        logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }));
        console.error(error, "internal server error");

        return res.status(error.status || 500).send(new ApiError(error.status, error.message || "internal server error",))
    }
}

const getBookMakerData = async (req, res) => {
    try {
        const { match_id } = req.query;
        if (!match_id) throw new ApiError(400, "match_id is requried");
        // console.log(match_id);
        const data = await convertBookMakerToTargetDS(match_id);
        return res.status(200).send(new ApiResponse(200, "Fancy market fetched successfully.", data));
    } catch (error) {
        logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }));
        console.error(error, "internal server error");

        return res.status(error.status || 500).send(new ApiError(error.status, error.message || "internal server error"));
    }
}

module.exports = {
    getFancyMarketData,
    getBookMakerData
}