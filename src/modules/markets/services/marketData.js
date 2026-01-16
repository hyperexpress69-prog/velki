const { setCache, getCache } = require("../../../cache/redis");
const { getEnvVar } = require("../../../utils/loadEnv");
const { createLogger } = require("../../../utils/logger");
const { getApi } = require("../../../utils/apiCaller");

const logger = createLogger("MARKET_ERROR", "jsonl");

/* concurrent execution */
const getMarketInfo = async () => {
  try {
    // console.log("getMarketInfo started", Date.now());
    const [sportId, compPoint, eventPoint, marketListPoint] = getEnvVar(["SPORT_ID", "COMPETITION_LIST_EP", "EVENTS_LIST_EP", "MARKET_LIST_EP"]);

    const competitions = await getApi([compPoint, sportId], "market");
    if (!Array.isArray(competitions) || !competitions.length) return;

    const sportEventIds = [];

    await Promise.all(competitions.map(async (c) => {
      let events;
      try {
        events = await getApi([eventPoint, sportId, c.competition.id], "market");
      } catch {
        return;
      }

      if (!Array.isArray(events)) return;

      await Promise.all(events.map(async (e) => {
        const event = e.event;
        const eventType = e.eventType;

        let markets;
        try {
          markets = await getApi([marketListPoint, event.id], "market");
        } catch {
          return;
        }

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

        sportEventIds.push(event.id);
      }));
    }));

    // console.log("sportEventIds_______________>", sportEventIds);
    if (sportEventIds.length) {
      await setCache(`SPORT_EVENTS:${sportId}`, sportEventIds);
    }

    await getMarketOdds(sportId);
    // console.log("getMarketInfo completed", Date.now());
  } catch (error) {
    logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }))
  }
};

const getMarketOdds = async (sportId) => {
  try {
    const allOdds = []
    // console.log("getMarketOdds started", Date.now());
    const [marketOddsPoint] = getEnvVar(["MARKET_ODDS_EP"]);

    const eventIds = await getCache(`SPORT_EVENTS:${sportId}`);
    if (!Array.isArray(eventIds)) return;

    await Promise.all(eventIds.map(async (eventId) => {
      const marketIds = await getCache(`EVENT_MARKETS:${eventId}`);
      if (!Array.isArray(marketIds)) return;

      await Promise.all(marketIds.map(async (marketId) => {
        const marketInfo = await getCache(`MARKET:${marketId}`);
        if (!marketInfo) return;

        try {
          const odds = await getApi([marketOddsPoint, eventId, marketId], "market");
          if (!odds) return;
          allOdds.push(odds);
          await setCache(`MARKET_ODDS:${marketId}`, odds);
        } catch (error) {
          console.error("error occured to fetch marketOdds of:", marketId);
        }
      }));
    }));
    // console.log("getMarketOdds completed", Date.now());
  } catch (error) {
    console.error("getMarketOdds error", error);
  }
};


/* sequential execution 
const getMarketInfo = async () => {
  try {
    // console.log("getMarketInfo started", Date.now());
    const [
      sportId,
      compPoint,
      eventPoint,
      marketListPoint
    ] = getEnvVar([
      "SPORT_ID",
      "COMPETITION_LIST_EP",
      "EVENTS_LIST_EP",
      "MARKET_LIST_EP"
    ]);

    const competitions = await getApi([compPoint, sportId],"market");
    if (!Array.isArray(competitions) || !competitions.length) return;

    const sportEventIds = [];

    for (const c of competitions) {
      let events;

      try {
        events = await getApi([eventPoint, sportId, c.competition.id],"market");
      } catch {
        continue;
      }

      if (!Array.isArray(events)) continue;

      for (const e of events) {
        const event = e.event;
        const eventType = e.eventType;

        let markets;
        try {
          markets = await getApi([marketListPoint, event.id],"market");
        } catch {
          continue;
        }

        if (!Array.isArray(markets) || !markets.length) continue;

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

        sportEventIds.push(event.id);
      }
    }

    // console.log("sportEventIds_______________>", sportEventIds);
    if (sportEventIds.length) {
      await setCache(`SPORT_EVENTS:${sportId}`, sportEventIds);
    }

    await getMarketOdds(sportId);
    // console.log("getMarketInfo completed", Date.now());
  } catch (error) {
   logger.error(JSON.stringify({ at: Date.now(), message: error.message || "internal server error" }))
    }
};

const getMarketOdds = async (sportId) => {
  try {
    // console.log("getMarketOdds started", Date.now());
    const [marketOddsPoint] = getEnvVar(["MARKET_ODDS_EP"]);

    const eventIds = await getCache(`SPORT_EVENTS:${sportId}`);
    if (!Array.isArray(eventIds)) return;

    for (const eventId of eventIds) {
      const marketIds = await getCache(`EVENT_MARKETS:${eventId}`);
      if (!Array.isArray(marketIds)) continue;

      for (const marketId of marketIds) {
        const marketInfo = await getCache(`MARKET:${marketId}`);
        if (!marketInfo) return;

        const odds = await getApi([marketOddsPoint, eventId, marketId],"market");

        await setCache(`MARKET_ODDS:${marketId}`, odds);
      }
    }
    // console.log("getMarketOdds completed", Date.now());
  } catch (error) {
    console.error("getMarketOdds error", error);
  } finally {
    return
  }
};
*/

module.exports = {
  getMarketInfo,
  getMarketOdds,
};
