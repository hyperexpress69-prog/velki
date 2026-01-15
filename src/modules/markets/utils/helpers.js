const getFilteredData = (arr) => {
  try {
    if (!Array.isArray(arr) || !arr.length) return [];
    return arr
      .flatMap((e) => {
        if (e.status == "fulfilled") {
          return [e.value];
        } else return [];
      })
      .flat(1)
      .filter(Boolean);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

module.exports = { getFilteredData, chunkArray };
