const { setCache, getCache } = require("../../cache/redis");
const { createLogger } = require("../../utils/logger");

const errorLogger = createLogger("MARKET_ERROR", "jsonl");

const callApi = async (args) => {
  try {
    const baseUrl = process.env.THIRD_PARTY_URL || "";
    if (!baseUrl) throw new Error(`Base url not found`);

    const url = `${baseUrl}/${args.join("/")}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}, url:${url}`);

    const list = await res.json();
    return list;
  } catch (error) {
    errorLogger.error({
      at: Date.now(),
      message: error.message || "internal server error",
    });
  }
};

const getComptMatches = async () => {
  try {
    const sportId = process.env.SPORT_ID;
    const compPoint = process.env.COMPETITION_LIST_END_POINT;
    const eventPoint = process.env.EVENTS_LIST_END_POINT;

    const competitionList = await callApi([compPoint, sportId]);

    const results = await Promise.allSettled(
      competitionList.map(async (c) => {
        const comp = {
          competitionId: c.competition.id,
          competitionName: c.competition.name,
          competitionRegion: c.competitionRegion,
          marketCount: c.marketCount,
        };

        const eventList = await callApi([
          eventPoint,
          sportId,
          comp.competitionId,
        ]);
        let updatedEventList = eventList.map((e) => {
          return { ...comp, ...e };
        });
        return updatedEventList;
      })
    );

    const eventsList = results
      .flatMap((e) => {
        if (e.status == "fulfilled") {
          return [e.value];
        } else return [];
      })
      .flat(1);
    const cmpEvtkey = `COMPETITION_EVENT_LIST:${sportId}`;
    await setCache(cmpEvtkey, eventsList);
    // console.log(await getCache(cmpEvtkey));

    await getMarketsRunners(sportId);
  } catch (error) {
    errorLogger.error({
      at: Date.now(),
      message: error.message || "internal server error",
    });
  } finally {
    return;
  }
};

const getMarketsRunners = async (sportId) => {
  try {
    const marketList = process.env.MARKET_LIST_END_POINT;
    const cmpEvtkey = `COMPETITION_EVENT_LIST:${sportId}`;
    const eventsList = await getCache(cmpEvtkey);

    const eventMarketsData = await Promise.allSettled(
      eventsList.map(async (e) => {
        console.log(e.event.id);
        const data = await callApi([marketList, e.event.id]);
        console.log(data);
      })
    );
  } catch (error) {
    errorLogger.error({
      at: Date.now(),
      message: error.message || "internal server error",
    });
  } finally {
    return;
  }
};

module.exports = {
  getComptMatches,
};
