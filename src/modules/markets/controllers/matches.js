const { getCache } = require("../../../cache/redis");
const { ApiError } = require("../../../utils/apiError");
const { ApiResponse } = require("../../../utils/apiResponse");
const { getEnvVar } = require("../../../utils/loadEnv");
const { createLogger } = require("../../../utils/logger");
const { getMarketsBySport } = require("../services/converter");
const { } = require("../services/marketData");

const logger = createLogger("match", "jsonl");

const getMatchCount = async (req, res) => {
    try {

        const { sportId } = req.query;
        if (!sportId) throw new ApiError(400, "sport id is requried");
        const opnMidsKey = `OPEN_MARKETS:${sportId}`;

        const data = {
            cricketInplayCount: await getCache(opnMidsKey)?.length || 0,
        }
        return res.status(200).send(new ApiResponse(200, "Match List fetched successfully.", data));
    } catch (error) {
        logger.error(error)
        console.error(error, "internal server error");

        return res.status(error.status || 500).send(new ApiError(error.status, error.message || "internal server error",))
    }
}

const getMatchList = async (req, res) => {
    try {
        const { sportId } = req.query;
        if (!sportId) throw new ApiError(400, "sport id is requried");
        console.log(sportId);
        const data = await getMarketsBySport(sportId);
        return res
            .status(200)
            .send(new ApiResponse(200, "Matches list fetched successfully", data));
    } catch (error) {
        logger.error(error)
        console.error(error, "internal server error");

        return res
            .status(error.status || 500)
            .send(new ApiError(error.status, error.message || "internal server error",))
    }
}


module.exports = {
    getMatchCount,
    getMatchList
}