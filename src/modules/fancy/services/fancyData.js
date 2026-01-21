const { createLogger } = require("../../../utils/logger");
const { getApi } = require("../../../utils/apiCaller");
const { getEnvVar } = require("../../../utils/loadEnv");
const { setCache, saddCache } = require("../../../cache/redis");

const fs = require('fs/promises');

const logger = createLogger("FANCY", "jsonl");

const getSportsFancyData = async () => {
    try {
        console.log("sport exec start", Date.now());
        const [SPORTS_LIST_EP, LIST_COMPETITION_EP, LIST_EVENT_EP, LIST_MARKET_CATALOGUE_EP] = getEnvVar(["SPORTS_LIST_EP", "LIST_COMPETITION_EP", "LIST_EVENT_EP", "LIST_MARKET_CATALOGUE_EP"]);

        const sportsList = await getApi([SPORTS_LIST_EP], "market");
        if (!Array.isArray(sportsList) || !sportsList.length) throw new Error("Invalid sports list");

        // await fs.writeFile("sportsList.json", JSON.stringify(sportsList), "utf-8");

        const competitions = (await Promise.all(
            sportsList.map(s =>
                s?.eventType?.id
                    ? getApi([LIST_COMPETITION_EP, s.eventType.id], "market")
                    : []
            )
        )).flat();
        if (!Array.isArray(competitions) || !competitions.length) throw new Error("Invalid competitions list");

        //  await fs.writeFile("comp.json", JSON.stringify(competitions), "utf-8");

        const events = (await Promise.all(
            competitions.map(c =>
                c?.competition?.id
                    ? getApi([LIST_EVENT_EP, c.competition.id], "market")
                    : []
            )
        )).flat();
        if (!Array.isArray(events) || !events.length) throw new Error("Invalid events list");

        //  await fs.writeFile("events.json", JSON.stringify(events), "utf-8");

        await Promise.all(
            events.map(async e => {
                if (e) await setCache(`EVENT:${e.event.id}:META`, e)
            })
        );

        const catalogues = (await Promise.all(
            events.map(async e => {
                if (!e.event.id) return []
                return await getApi([LIST_MARKET_CATALOGUE_EP, e.event.id], "market")
            })
        )).flat();


        await Promise.all(
            catalogues.map(async cat => {
                const eventId = cat?.event?.id;
                const marketId = cat?.marketId;
                if (!eventId || !marketId) return null;

                return await Promise.all([
                    setCache(`MARKET:${marketId}:META`, cat),
                    setCache(`MARKET:${marketId}:EVENT`, eventId),
                    saddCache(`EVENT:${eventId}:MARKETS`, marketId)
                ]);
            })
        );

        console.log("sport execution done", Date.now());
        return;
    } catch (err) {
        console.error(err)
        logger.error(JSON.stringify({ message: err.message, stack: err.stack }));
        return;
    }
};

module.exports = {
    getSportsFancyData,
};