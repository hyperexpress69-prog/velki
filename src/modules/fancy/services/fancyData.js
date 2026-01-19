const { createLogger } = require("../../../utils/logger");
const { getApi, postApi } = require("../../../utils/apiCaller");
const { getEnvVar } = require("../../../utils/loadEnv");
const { setCache, getCache, saddCache, getCacheKeys } = require("../../../cache/redis");
const { chunkArray } = require("../../../utils/helpers");

const fs = require('fs/promises');

const logger = createLogger("FANCY", "jsonl");

const getSportsFancyData = async () => {
    try {
        // console.log("sport start", Date.now());
        const [SPORTS_LIST_EP, LIST_COMPETITION_EP, LIST_EVENT_EP, LIST_MARKET_CATALOGUE_EP] = getEnvVar([
            "SPORTS_LIST_EP",
            "LIST_COMPETITION_EP",
            "LIST_EVENT_EP",
            "LIST_MARKET_CATALOGUE_EP"
        ]);

        const sportsList = await getApi([SPORTS_LIST_EP], "market");
        if (!Array.isArray(sportsList)) throw new Error("Invalid sports list");

        // await fs.writeFile("sportsList.json", JSON.stringify(sportsList), "utf-8");

        const competitions = (await Promise.all(
            sportsList.map(s =>
                s?.eventType?.id
                    ? getApi([LIST_COMPETITION_EP, s.eventType.id], "market")
                    : []
            )
        )).flat();

        //  await fs.writeFile("comp.json", JSON.stringify(competitions), "utf-8");

        const events = (await Promise.all(
            competitions.map(c =>
                c?.competition?.id
                    ? getApi([LIST_EVENT_EP, c.competition.id], "market")
                    : []
            )
        )).flat();
        //  await fs.writeFile("events.json", JSON.stringify(events), "utf-8");


        await Promise.all(
            events.map(e =>
                e?.event?.id
                    ? setCache(`EVENT:${e.event.id}:META`, e)
                    : null
            )
        );

        const catalogues = (await Promise.all(
            events.map(e =>
                e?.event?.id
                    ? getApi([LIST_MARKET_CATALOGUE_EP, e.event.id], "market")
                    : []
            )
        )).flat();
        //  await fs.writeFile("cat.json", JSON.stringify(catalogues), "utf-8");


        await Promise.all(
            catalogues.map(cat => {
                const eventId = cat?.event?.id;
                const marketId = cat?.marketId;
                if (!eventId || !marketId) return null;

                return Promise.all([
                    setCache(`MARKET:${marketId}:META`, cat),
                    setCache(`MARKET:${marketId}:EVENT`, eventId),
                    saddCache(`EVENT:${eventId}:MARKETS`, marketId)
                ]);
            })
        );

        await getMarketBookListData();
        await getFancyBookMakerOdds();
        console.log("sport execution done", Date.now());
        return true;
    } catch (err) {
        console.error(err)
        logger.error({ message: err.message, stack: err.stack });
        throw err;
    }
};

const getMarketBookListData = async () => {
    const [LIST_MARKET_BOOK_EP] = getEnvVar(["LIST_MARKET_BOOK_EP"]);

    const keys = await getCacheKeys("MARKET:*:EVENT");
    const marketIds = keys.map(k => k.split(":")[1]);

    const chunks = chunkArray(marketIds, 20);

    const books = (await Promise.all(
        chunks.map(chunk =>
            postApi([LIST_MARKET_BOOK_EP], { marketIds: chunk }, "market")
                .then(r => r?.data || [])
        )
    )).flat();

    //  await fs.writeFile("books.json", JSON.stringify(books), "utf-8");


    await Promise.all(
        books.map(b =>
            b?.marketId
                ? setCache(`MARKET:${b.marketId}:BOOK`, b)
                : null
        )
    );

    return books.length;
};

const getFancyBookMakerOdds = async () => {
    const [fancyBookEP] = getEnvVar(["FANCY_BOOKMAKER_ODDS_EP"]);

    const eventKeys = await getCacheKeys("EVENT:*:META");
    const eventIds = eventKeys.map(k => k.split(":")[1]);

    const responses = await Promise.all(
        eventIds.map(e =>
            getApi([fancyBookEP, e], "fancy").then(resp => ({ eventId: e, resp }))
        )
    );

    //  await fs.writeFile("fancy.json", JSON.stringify(responses), "utf-8");

    await Promise.all(
        responses.map(({ eventId, resp }) => {
            if (!resp) return null;
            return Promise.all([
                resp.fancy ? setCache(`EVENT:${eventId}:FANCY`, resp.fancy) : null,
                resp.bookmaker ? setCache(`EVENT:${eventId}:BOOKMAKER`, resp.bookmaker) : null
            ]);
        })
    );

    return responses.length;
};

const getDataByMarketId = async (marketId) => {
    const eventId = await getCache(`MARKET:${marketId}:EVENT`);
    if (!eventId) return null;

    const [event, market, book, fancy, bookmaker] = await Promise.all([
        getCache(`EVENT:${eventId}:META`),
        getCache(`MARKET:${marketId}:META`),
        getCache(`MARKET:${marketId}:BOOK`),
        getCache(`EVENT:${eventId}:FANCY`),
        getCache(`EVENT:${eventId}:BOOKMAKER`)
    ]);

    return { event, market, book, fancy, bookmaker };
};

const getDataByEventId = async (eventId) => {
    const marketIds = await getCache(`EVENT:${eventId}:MARKETS`) || [];

    const [event, fancy, bookmaker, markets] = await Promise.all([
        getCache(`EVENT:${eventId}:META`),
        getCache(`EVENT:${eventId}:FANCY`),
        getCache(`EVENT:${eventId}:BOOKMAKER`),

        Promise.all(
            marketIds.map(async mId => ({
                marketId: mId,
                meta: await getCache(`MARKET:${mId}:META`),
                book: await getCache(`MARKET:${mId}:BOOK`)
            }))
        )
    ]);

    return { event, markets, fancy, bookmaker };
};

module.exports = {
    getSportsFancyData,
    getDataByMarketId,
    getDataByEventId
};



/* old code 
const getSportsFancyData = async () => {
    try {
        const [spListEP, compListEP, eventListEP, mktCtlgEP] = getEnvVar(["SPORTS_LIST_EP", "LIST_COMPETITION_EP", "LIST_EVENT_EP", "LIST_MARKET_CATALOGUE_EP"]);

        if (!spListEP || !compListEP || !eventListEP || !mktCtlgEP) {
            throw new Error("One or more endpoint env variables missing");
        }

        const sportsList = await getApi([spListEP], "market");

        if (!Array.isArray(sportsList) || !sportsList.length) throw new Error("Empty sports list");

        await setCache("ALL_SPORT_EVENTS_LIST", sportsList);

        const compList = (await Promise.all(
            sportsList.map(async (s) => {
                if (!s?.eventType?.id) return [];

                const comp = await getApi([compListEP, s.eventType.id], "market");
                // console.log(`COMP for sport ${s.eventType.id}:`, comp.length);

                if (Array.isArray(comp)) {
                    await Promise.all(
                        comp.map(c => setCache(`FANCY_COMP:${c.competition.id}`, c))
                    );
                }

                return comp;
            })
        )).flat();

        const eventIdsArr = []
        const eventsList = (await Promise.all(
            compList.map(async (c) => {
                if (!c?.competition?.id) return [];

                const events = await getApi([eventListEP, c.competition.id], "market");

                if (Array.isArray(events)) {
                    await Promise.all(
                        events.map(e => {
                            setCache(`FANCY_EVENT:${e.event.id}`, e)
                            eventIdsArr.push(e.event.id);
                        })
                    );
                }

                return events;
            })
        )).flat();

        await setCache("FANCY_EVENT_IDS", eventIdsArr);

        const marketIdArr = []
        const catalogues = (await Promise.all(
            eventsList.map(async e => {
                if (!e?.event?.id) return [];
                const ctlg = await getApi([mktCtlgEP, e.event.id], "market");
                if (e.event.id == 35143752) console.warn("ctlg______________>", JSON.stringify(ctlg));

                if (Array.isArray(ctlg)) {
                    ctlg.map(c => {
                        setCache(`FANCY_MARKET_CAT:${c.marketId}`, c);
                        marketIdArr.push(c.marketId);
                    });
                }

                return ctlg;
            })
        )).flat();

        await setCache("FANCY_CAT_ARR", catalogues);
        if (marketIdArr.length) {
            await setCache(`FANCY_MARKET_IDS`, marketIdArr);
        }
        // await getFancyBookMakerOdds();
        await getMarketBookListData();

        return;
    } catch (error) {
        logger.error({ at: Date.now(), message: error.message, stack: error.stack });
        console.error(" getSportsList error:", error);
        return;
    }
};

const getMarketBookListData = async () => {
    try {

        const [lsMktBookEP] = getEnvVar(["LIST_MARKET_BOOK_EP"])

        const midsKey = `FANCY_MARKET_IDS`;
        const mids = await getCache(midsKey);

        if (!Array.isArray(mids) || !mids.length) throw new Error("No market ids found for fetching market book list data");

        const midChunks = chunkArray(mids, 20);
        const bookList = (await Promise.all(
            midChunks.map(async mids => {
                if (!Array.isArray(mids) || !mids.length) return [];

                const resp = await postApi([lsMktBookEP], { marketIds: mids }, "market");

                if (resp.status && Array.isArray(resp.data)) {
                    resp.data.map(b => setCache(`FANCY_BOOK:${b.marketId}`, b));

                }
                return resp.data || [];
            })
        )).flat();
        // console.log("book list data:", bookList.length);

        return;
    } catch (error) {
        logger.error({ at: Date.now(), message: error.message, stack: error.stack });
        console.error(" getMarketBookListData error:", error);
        return
    }
}

const getFancyBookMakerOdds = async () => {
    try {

        const [fbOddsEP] = getEnvVar(["FANCY_BOOKMAKER_ODDS_EP"]);
        if (!fbOddsEP) throw new Error("Fancy book maker end point not found");

        const eventIdsKey = "FANCY_EVENT_IDS";
        const eventIds = await getCache(eventIdsKey);
        // console.log(JSON.stringify(eventIds));
        if (!Array.isArray(eventIds) || !eventIds.length) throw new Error("no event ids found to fetch fancy and book maker data");

        const fancyBookData = await Promise.all(eventIds.map(async e => {
            const resp = await getApi([fbOddsEP, e], "fancy");
            if (resp?.bookmaker?.length && resp.fancy?.length)
                await setCache(`FANCY_BOOKMAKER_ODDS:${e}`, resp);
            return resp;
        }));

        // const chunkedIds = chunkArray(eventIds, 8);
        // const fancyBookData = [];
        // for (const evIds of chunkedIds) {
        //     if (Array.isArray(evIds) && evIds.length) {
        //         await Promise.all(evIds.map(async e => {
        //             const resp = await getApi([fbOddsEP, e], "fancy");
        //             fancyBookData.push({ [e]: resp });
        //             return resp;
        //         }));
        //     }
        //     await new Promise(async (res, _) => setTimeout(res, 500));
        // }

        // await fs.writeFile("f.json", JSON.stringify(fancyBookData), "utf-8");
        return

    } catch (error) {
        logger.error({ at: Date.now(), message: error.message, stack: error.stack });
        console.error(" getSportsList error:", error);
        return;
    }
}

module.exports = {
    getSportsFancyData
};

 old code end */