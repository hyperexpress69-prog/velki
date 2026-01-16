const { getCache } = require("../../../cache/redis");
const { ApiError } = require("../../../utils/apiError");
const { ApiResponse } = require("../../../utils/apiResponse");
const { createLogger } = require("../../../utils/logger");
const { getMarketsOdds, getMatchesList } = require("../services/converter");

const logger = createLogger("match_api", "jsonl");

const getMatchCount = async (req, res) => {
    try {

        const { game_type } = req.query;
        if (!game_type) throw new ApiError(400, "game_type is requried");
        const opnMidsKey = `OPEN_MARKETS:${game_type}`;

        const data = {
            cricketInplayCount: await getCache(opnMidsKey)?.length || 0,
        }
        return res.status(200).send(new ApiResponse(200, "Match List fetched successfully.", data));
    } catch (error) {
        logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }));
        console.error(error, "internal server error");

        return res.status(error.status || 500).send(new ApiError(error.status, error.message || "internal server error",))
    }
}

const getMatchList = async (req, res) => {
    try {
        const { game_type } = req.query;
        if (!game_type) throw new ApiError(400, "game_type is requried");
        console.log(game_type);
        const data = await getMatchesList(game_type);
        return res
            .status(200)
            .send(new ApiResponse(200, "Matches list fetched successfully", data));
    } catch (error) {
        logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }))
        console.error(error, "internal server error");

        return res
            .status(error.status || 500)
            .send(new ApiError(error.status, error.message || "internal server error",))
    }
}

const getMatchOdds = async (req, res) => {
    try {
        const { game_type, match_ids } = req.query;
        if (!game_type || !match_ids) throw new ApiError(400, "game_type and match_ids are requried fields");
        const data = await getMarketsOdds(game_type, match_ids.split(","));
        return res
            .status(200)
            .send(new ApiResponse(200, "Markets Odds fetched successfully", data));
    } catch (error) {
        logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }))
        console.error(error, "internal server error");

        return res
            .status(error.status || 500)
            .send(new ApiError(error.status, error.message || "internal server error",))
    }
}

module.exports = {
    getMatchCount,
    getMatchList,
    getMatchOdds
}