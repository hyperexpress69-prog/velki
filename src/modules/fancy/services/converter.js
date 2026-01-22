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
    const now = Date.now();

    const eventMeta = await getCache(`EVENT:${eventId}:META`);
    const bookmakerRaw = await getCache(`EVENT:${eventId}:BOOKMAKER`);
    const marketIdsSet = await smembersCache(`EVENT:${eventId}:MARKETS`);

    if (!eventMeta || !bookmakerRaw) {
        return { subCode: 404, message: "Data not found", status: false };
    }

    const bookmakerData = typeof bookmakerRaw === 'string' ? JSON.parse(bookmakerRaw) : bookmakerRaw;

    const rawMid = bookmakerData[0].mid || "";
    const consolidatedMarketId = rawMid.split('_')[0] || "UnknownMarket";
    const target = { markets: {}, selections: {} };

    const firstRunner = bookmakerData[0] || {};

    target.markets[consolidatedMarketId] = {
        marketId: consolidatedMarketId,
        marketType: 1,
        marketName: bookmakerData[0].mname,
        status: firstRunner.s === "ACTIVE" ? 1 : 2,
        summaryStatus: 0,
        sort: 1,
        updateDate: now,
        oddsSettingUpdateDate: now,
        min: Number(firstRunner.min || 0),
        max: Number(firstRunner.max || 0),
        rebateRatio: 0,
        delayBetting: 3, // Matches your target output
        eventType: eventMeta.eventType?.id || 4,
        eventId: eventId,
        eventName: eventMeta.event?.name || "Unknown",
        highlightMarketId: marketIdsSet?.[0] || ""
    };

    // 3. Build Selections from the Bookmaker Array
    bookmakerData.forEach((bmRunner) => {
        // Mapping sid to selectionId (matches your target: 870144/870145 style)
        // Note: Using sid or mapping it to your specific IDs
        const selectionId = bmRunner.sid;
        const selKey = `${consolidatedMarketId}:${selectionId}`;

        // Formatting Odds: Bookmaker uses b1, l1 for prices
        // Based on your target output, we provide 3 price levels
        const backOdds = [
            bmRunner.b1 && bmRunner.b1 !== "0.00" ? Number(bmRunner.b1).toFixed(6) : "",
            bmRunner.b2 && bmRunner.b2 !== "0.00" ? Number(bmRunner.b2).toFixed(6) : "",
            bmRunner.b3 && bmRunner.b3 !== "0.00" ? Number(bmRunner.b3).toFixed(6) : ""
        ];

        const layOdds = [
            bmRunner.l1 && bmRunner.l1 !== "0.00" ? Number(bmRunner.l1).toFixed(6) : "",
            bmRunner.l2 && bmRunner.l2 !== "0.00" ? Number(bmRunner.l2).toFixed(6) : "",
            bmRunner.l3 && bmRunner.l3 !== "0.00" ? Number(bmRunner.l3).toFixed(6) : ""
        ];

        target.selections[selKey] = {
            marketId: consolidatedMarketId,
            selectionId: Number(selectionId),
            status: bmRunner.s === "ACTIVE" ? 1 : 2,
            runnerName: bmRunner.nat,
            sort: Number(bmRunner.sr || 0),
            backOddsInfo: JSON.stringify(backOdds),
            layOddsInfo: JSON.stringify(layOdds),
            updateDate: now,
            eventId: eventId.toString()
        };
    });

    console.log("bookmaker conversion done");
    return target;
};

module.exports = { convertFancyToTargetDS, convertBookMakerToTargetDS }