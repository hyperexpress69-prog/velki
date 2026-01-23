const { getCache, getCacheKeys } = require("../../../cache/redis");
const { ApiError } = require("../../../utils/apiError");
const { ApiResponse } = require("../../../utils/apiResponse");
const { createLogger } = require("../../../utils/logger");
const { getMarketsOdds, getMatchesList } = require("../services/converter");

const logger = createLogger("match_api", "jsonl");

const getMatchCount = async (req, res) => {
    try {

        const { type } = req.query;
        if (!type) throw new ApiError(400, "type is requried");
        const spEvtLstkey = `SPORT_EVENTS:${type}:*`;
        const resp = await getCacheKeys(spEvtLstkey);

        const data = {
            cricketInplayCount: 0,
            soccerInplayCount: 0,
            tennisInplayCount: 0
        };

        if (Array.isArray(resp) && resp.length) {
            await Promise.all(
                resp.map(async (e) => {
                    const parts = e.split(":");
                    let key = parts[2];
                    const value = await getCache(e);
                    // console.log(e, value);
                    // Map keys and assign values
                    if (key === "4") {
                        data.cricketInplayCount = value?.length || 0;
                    } else if (key === "1") {
                        data.soccerInplayCount = value?.length || 0;
                    } else if (key === "2") {
                        data.tennisInplayCount = value?.length || 0;
                    }
                })
            );
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
        const { game_type, type } = req.query;
        if (!game_type || !type) {
            throw new ApiError(400, "game_type and type is required");
        }

        let matches = [];

        if (game_type === "all") {
            const spEvtLstkey = `SPORT_EVENTS:${type}:*`;
            const keys = await getCacheKeys(spEvtLstkey);

            if (Array.isArray(keys) && keys.length) {
                const results = await Promise.all(
                    keys.map(async (key) => {
                        const parts = key.split(":");
                        const sportId = parts[2];
                        return await getMatchesList(sportId, type, "");
                    })
                );

                results.forEach((mList) => {
                    if (mList && mList.length) {
                        matches.push(...mList);
                    }
                });
            }
        } else {
            const mList = await getMatchesList(game_type, type, "");
            if (mList && mList.length) {
                matches.push(...mList);
            }
        }
        // console.log(matches.length);
        return res.status(200).send(new ApiResponse(200, "Matches list fetched successfully", { matches }));

    } catch (error) {
        logger.error(JSON.stringify({
            at: Date.now(),
            message: error.message || "internal server error"
        }));

        return res.status(error.status || 500).send(
            new ApiError(error.status || 500, error.message || "internal server error")
        );
    }
};


const getMatchOdds = async (req, res) => {
    try {
        const { game_type = 4, match_ids } = req.query;
        if (!game_type || !match_ids) throw new ApiError(400, "game_type and match_ids are requried fields");
        const data = await getMarketsOdds(game_type, match_ids.split(","), "");
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