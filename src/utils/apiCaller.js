const { getEnvVar } = require("./loadEnv");
const { createLogger } = require("./logger");

const errorLogger = createLogger("THIRD_PARTY_ERROR", "jsonl");

const getApi = async (args, flag) => {
  let baseUrl = "";
  let url = "";
  try {

    if (flag == "market") [baseUrl] = getEnvVar(["THIRD_PARTY_URL"]);
    else if (flag == "fancy") [baseUrl] = getEnvVar(["THIRD_PARTY_FANCY_URL"]);

    if (!baseUrl) throw new Error(`Base url not found`);

    url = `${baseUrl}/${args.join("/")}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}, url:${url}`);

    const list = await res.json();
    return list;
  } catch (error) {
    // errorLogger.error(JSON.stringify({
    //   at: Date.now(),
    //   message: error.message || "internal server error",
    // }));
    // console.error(error);
    return [];
  }
};

const postApi = async (args, payload, flag) => {
  let url = "";
  let baseUrl = "";
  try {

    if (flag == "market") [baseUrl] = getEnvVar(["THIRD_PARTY_URL"]);
    else if (flag == "fancy") [baseUrl] = getEnvVar(["THIRD_PARTY_FANCY_URL"]);
    // console.log(args, payload, flag, baseUrl);
    if (!baseUrl) throw new Error(`Base url not found`);

    url = `${baseUrl}/${args.join("/")}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}, url:${url}, res: ${JSON.stringify(res)}`);

    return await res.json();
  } catch (error) {
    // errorLogger.error(JSON.stringify({
    //   at: Date.now(),
    //   message: error.message || "internal server error",
    // }));
    // console.error(error);
    return []
  }
}

module.exports = { getApi, postApi };
