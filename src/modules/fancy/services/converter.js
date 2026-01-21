const { getCache, smembersCache } = require("../../../cache/redis");

const convertFancyToTargetDS = async (eventId) => {
    const result = [];

    const eventInfo = await getCache(`EVENT:${eventId}:META`);
    const eventFancyData = await getCache(`EVENT:${eventId}:FANCY`);
    if (!eventInfo || !eventFancyData) return result;

    const marketIds = await smembersCache(`EVENT:${eventId}:MARKETS`);
    if (!marketIds?.length) return result;

    for (const marketId of marketIds) {
        const [catalogue, book] = await Promise.all([
            getCache(`MARKET:${marketId}:META`),
            getCache(`MARKET:${marketId}:BOOK`)
        ]);
        if (!catalogue || !book) continue;

        catalogue.runners.forEach(r => {
            const fancy = Array.isArray(eventFancyData) && eventFancyData.length ? eventFancyData.find(f => f.RunnerName == catalogue.marketName) : {};
            result.push({
                eventType: catalogue.eventType.id ?? 0,
                eventId: (eventInfo.event.id),
                marketId: r.selectionId || 1,
                marketType: catalogue.marketType || 1,
                status: book.status,
                summaryStatus: 0,
                sort: r.sortPriority || 0,

                eventName: eventInfo.event.name,
                marketName: catalogue.marketName,

                runsNo: fancy?.BackPrice1 ?? 0,
                runsYes: fancy?.LayPrice1 ?? 0,

                oddsNo: fancy?.BackSize1 ?? 0,
                oddsYes: fancy?.LaySize1 ?? 0,

                oddsVersion: book.version || 0,
                resultRuns: -1,

                min: fancy?.min || 10,
                max: fancy?.max || 1000,
                delayBetting: book.betDelay,
            });
        });
    }
    return result;
};


const convertBookMakerToTargetDS = async (eventId) => {
    const target = { markets: {}, selections: {} };
    // console.log(target);
    const now = Date.now();

    const marketIdsSet = await smembersCache(`EVENT:${eventId}:MARKETS`);
    // console.log("marketIdsSet", marketIdsSet);
    if (!marketIdsSet || !marketIdsSet.length) return target;


    for (const marketId of marketIdsSet) {
        const [marketMeta, marketBook] = await Promise.all([
            getCache(`MARKET:${marketId}:META`),
            getCache(`MARKET:${marketId}:BOOK`)
        ]);

        if (!marketMeta) continue;

        // console.log(marketMeta);
        // console.log(marketBook);

        const eventMeta = await getCache(`EVENT:${eventId}:META`);
        if (!eventMeta) continue;
        // console.log(eventMeta);

        const fancy = await getCache(`EVENT:${eventId}:FANCY`);
        const bookmaker = await getCache(`EVENT:${eventId}:BOOKMAKER`);
        // console.log("fancy", fancy);
        // console.log("bookmaker", bookmaker);

        target.markets[marketId] = {
            marketId: marketId,
            marketType: fancy?.gtype === "session" ? 1 : 0,
            marketName: marketMeta.marketName || "Unknown",
            status: marketBook?.status === "OPEN" ? 1 : 2,
            summaryStatus: 0,
            sort: marketMeta.sortPriority || 1,
            updateDate: now,
            oddsSettingUpdateDate: now,
            min: bookmaker?.[0]?.min ? Number(bookmaker[0].min) : 0,
            max: bookmaker?.[0]?.max ? Number(bookmaker[0].max) : 0,
            rebateRatio: 0,
            delayBetting: marketBook?.betDelay || 0,
            eventType: eventMeta.eventType?.id || 0,
            eventId: eventId,
            eventName: eventMeta.event?.name || "Unknown",
            highlightMarketId: marketId
        };
        // console.log(target[marketId]);

        const runners = marketMeta.runners || [];
        for (const runner of runners) {
            const selKey = `${marketId}:${runner.selectionId}`;
            const bookRunner = marketBook?.runners?.find(r => r.selectionId === runner.selectionId);

            const backOdds = bookRunner?.ex?.availableToBack?.map(o => o.price.toFixed(6)) || ["", "", ""];
            const layOdds = bookRunner?.ex?.availableToLay?.map(o => o.price.toFixed(6)) || ["", "", ""];

            target.selections[selKey] = {
                marketId: marketId,
                selectionId: runner.selectionId,
                status: bookRunner?.status === "ACTIVE" ? 1 : 2,
                runnerName: runner.runnerName,
                sort: runner.sortPriority || 0,
                backOddsInfo: JSON.stringify(backOdds),
                layOddsInfo: JSON.stringify(layOdds),
                updateDate: now,
                eventId: eventId
            };
        }
    }
    // console.log(JSON.stringify(target));
    return target;
};

module.exports = { convertFancyToTargetDS, convertBookMakerToTargetDS }