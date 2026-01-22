const { getCache, smembersCache } = require("../../../cache/redis");

const convertFancyToTargetDS = async (eventId) => {
    const result = [];

    const [eventInfo, eventFancyData] = await Promise.all([
        getCache(`EVENT:${eventId}:META`),
        getCache(`EVENT:${eventId}:FANCY`)
    ]);

    if (!eventInfo || !Array.isArray(eventFancyData)) {
        return result;
    }

    const eventType = Number(eventInfo?.event?.eventTypeId ?? 4);
    const eventName = eventInfo?.event?.name ?? "";

    for (const fancy of eventFancyData) {
        result.push({
            eventType,
            eventId: Number(eventInfo.event.id),

            marketId: Number(fancy.SelectionId),
            marketType: 6, // Fancy / Session

            status: fancy.GameStatus === "Ball Running" ? 1 : 2,
            summaryStatus: 0,
            sort: fancy.sr_no ?? 0,

            eventName,
            marketName: fancy.RunnerName,

            runsNo: fancy.BackPrice1 ?? 0,
            runsYes: fancy.LayPrice1 ?? 0,

            oddsNo: fancy.BackSize1 ?? 0,
            oddsYes: fancy.LaySize1 ?? 0,

            oddsVersion: 1,
            resultRuns: -1,

            min: fancy.min ?? 0,
            max: fancy.max ?? 0,
            delayBetting: fancy.ballsess ?? 0,

            updateDate: Date.now(),
            oddsSettingUpdateDate: Date.now(),

            rebateRatio: 0,
            remarkFirstRow: fancy.rem ?? "",
            remarkSecondRow: "",
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
            getCache(`MARKET:${marketId}:BOOK`),
        ]);

        if (!marketMeta) continue;

        // console.log({ marketMeta });
        // console.log({ marketBook });

        const eventMeta = await getCache(`EVENT:${eventId}:META`);
        if (!eventMeta) continue;
        // console.log({ eventMeta });

        const fancy = await getCache(`EVENT:${eventId}:FANCY`);
        const bookmaker = await getCache(`EVENT:${eventId}:BOOKMAKER`);
        // console.log("fancy", { fancy });
        // console.log("bookmaker", { bookmaker });

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
        // console.log({ target: target.markets[marketId] }, "+++++++++++++");

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
    console.log("bookmaker done");
    return target;
};

module.exports = { convertFancyToTargetDS, convertBookMakerToTargetDS }