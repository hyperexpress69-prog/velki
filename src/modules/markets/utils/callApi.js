const { getEnvVar } = require("../../../utils/loadEnv");
const { createLogger } = require("../../../utils/logger");

const errorLogger = createLogger("MARKET_ERROR", "jsonl");

const getApi = async (args) => {
  try {
    const [baseUrl] = getEnvVar(["THIRD_PARTY_URL"]) || "";
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
    console.error(error);
    return []
  }
};

const postApi = async (args, payload) => {
  try {
    const [baseUrl] = getEnvVar(["THIRD_PARTY_URL"]) || "";
    if (!baseUrl) throw new Error(`Base url not found`);

    const url = `${baseUrl}/${args.join("/")}`;
    console.log(url, payload);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}, url:${url}`);

    return await res.json();
  } catch (error) {
    errorLogger.error({
      at: Date.now(),
      message: error.message || "internal server error",
    });
    console.error(error);
    return []
  }
}

module.exports = { getApi, postApi };
