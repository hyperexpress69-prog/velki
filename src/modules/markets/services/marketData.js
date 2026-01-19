const { setCache, getCache, saddCache, getCacheKeys } = require("../../../cache/redis");
const { getEnvVar } = require("../../../utils/loadEnv");
const { createLogger } = require("../../../utils/logger");
const { getApi } = require("../../../utils/apiCaller");
const { getMarketsOdds, getMatchesList } = require("./converter");

const logger = createLogger("MARKET_ERROR", "jsonl");

/* concurrent execution */
const getMarketInfo = async () => {
  try {
    // console.log("getMarketInfo started", Date.now());
    const [sportsEP, compEP, eventEP, marketListEP] = getEnvVar(["SPORTS_LIST_EP", "COMPETITION_LIST_EP", "EVENTS_LIST_EP", "MARKET_LIST_EP"]);

    const sportsList = await getApi([sportsEP], "market");
    if (!Array.isArray(sportsList)) throw new Error("Invalid sports list");

    const competitions = {};

    await Promise.all(sportsList.map(async sport => {
      const compList = await getApi([compEP, sport.eventType.id], "market");
      if (Array.isArray(compList) && compList.length) {
        competitions[sport.eventType.id] = compList;
      }
    }))

    const inplayEventIds = [];
    const todayEventIds = [];
    const tomorrowEventIds = [];

    for (const [sportId, comp] of Object.entries(competitions)) {

      await Promise.all(comp.map(async (c) => {
        let events = await getApi([eventEP, sportId, c.competition.id], "market");

        if (!Array.isArray(events)) return;

        await Promise.all(events.map(async (e) => {
          const event = e.event;
          const eventType = e.eventType;
          let markets = await getApi([marketListEP, event.id], "market");

          if (!Array.isArray(markets) || !markets.length) return;

          const eventMarketIds = [];
          const marketCacheOps = [];

          for (const m of markets) {
            eventMarketIds.push(m.marketId);
            marketCacheOps.push(
              setCache(`MARKET:${m.marketId}`, {
                ...m,
                event,
                competition: {
                  id: c.competition.id,
                  name: c.competition.name,
                  region: c.competitionRegion,
                  marketCount: c.marketCount
                },
                eventType
              })
            );
          }

          await Promise.all([
            ...marketCacheOps,
            setCache(`EVENT_MARKETS:${event.id}`, eventMarketIds)
          ]);

          const marketDate = new Date(event.openDate);
          const now = new Date();

          const todayStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
          ));

          const tomorrowStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1
          ));

          const dayAfterTomorrowStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 2
          ));

          if (marketDate >= todayStart && marketDate < tomorrowStart) {
            todayEventIds.push(event.id);
          } else if (marketDate >= tomorrowStart && marketDate < dayAfterTomorrowStart) {
            tomorrowEventIds.push(event.id);
          }

        }));
      }));

      if (todayEventIds.length) await setCache(`SPORT_EVENTS:today:${sportId}`, todayEventIds);
      if (tomorrowEventIds.length) await setCache(`SPORT_EVENTS:tomorrow:${sportId}`, tomorrowEventIds);

      await getMarketOdds(sportId, "in_play");
      inplayEventIds.length = 0;
      todayEventIds.length = 0;
      tomorrowEventIds.length = 0;
    }

    console.log({ todayEventIds, tomorrowEventIds });

    // console.log("getMarketInfo completed", Date.now());
  } catch (error) {
    logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }))
  }
};

const getMarketOdds = async (sportId, type) => {
  try {
    const inplayEventIds = new Set();
    const allOdds = []
    const [marketOddsPoint] = getEnvVar(["MARKET_ODDS_EP"]);

    const eventIds = await getCache(`SPORT_EVENTS:${type}:${sportId}`);
    if (!Array.isArray(eventIds)) return;

    await Promise.all(eventIds.map(async (eventId) => {
      const marketIds = await getCache(`EVENT_MARKETS:${eventId}`);
      if (!Array.isArray(marketIds)) return;

      await Promise.all(marketIds.map(async (marketId) => {
        const marketInfo = await getCache(`MARKET:${marketId}`);
        if (!marketInfo) return;

        try {
          let odds = await getApi([marketOddsPoint, eventId, marketId], "market");
          if (!odds) return;
          allOdds.push(odds);
          await setCache(`MARKET_ODDS:${marketId}`, odds);

          if (odds?.data?.inplay) inplayEventIds.add(eventId);

          winnerSId = odds?.data?.runners?.find(r => r.status == "WINNER")?.selectionId;
          if (winnerSId) await setCache(`win:marketOdds:${eventId}:${marketId}`, winnerSId);

        } catch (error) {
          console.error("error occured to fetch marketOdds of:", marketId);
          console.error(error)
        }
      }));
    }));
    console.log("getMarketOdds completed", Date.now());

    if (inplayEventIds.size) {
      await saddCache("SPORT_EVENTS:in_play", sportId);
      await setCache(`SPORT_EVENTS:in_play:${sportId}`, [...inplayEventIds]);
    }
    console.log(sportId, [...inplayEventIds]);

    await setMatchOddsList()
  } catch (error) {
    console.error("getMarketOdds error", error);
  } finally {
    return;
  }
};

const setMatchOddsList = async () => {
  try {
    const spEvtLstkey = `SPORT_EVENTS:in_play:*`;
    const resp = await getCacheKeys(spEvtLstkey);

    const data = {};

    if (Array.isArray(resp) && resp.length) {
      await Promise.all(
        resp.map(async (e) => {
          const key = e.split(":")[2];
          const value = await getCache(e);
          data[key] = value;
        })
      );
    }

    for (const [sportId, eventIds] of Object.entries(data)) {
      await getMatchesList(sportId, "in_play", "cron");
      await getMarketsOdds(sportId, eventIds, "cron");
    }

  } catch (error) {
    console.error("error occured during setmatchoddslist", error)
  }
  finally {
    return;
  }
}

module.exports = {
  getMarketInfo,
  getMarketOdds,
};
