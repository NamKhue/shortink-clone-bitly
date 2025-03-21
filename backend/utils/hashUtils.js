const crypto = require("crypto");

function createShortHash(originalURL, userID, domain) {
  const utcTime = new Date().getTime().toString();
  const hashValue = userID
    ? originalURL + utcTime + userID
    : originalURL + utcTime;
  const hash = crypto.createHash("md5").update(hashValue).digest("hex");
  const shortHash = hash.slice(0, 6);
  return domain + shortHash;
}

module.exports = { createShortHash };
