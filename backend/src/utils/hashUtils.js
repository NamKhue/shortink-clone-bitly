// hashUtils.js

import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export function createShortHash(originalURL, userID) {
  const utcTime = new Date().getTime().toString();
  const uuid = uuidv4();
  const hashValue = userID
    ? originalURL + utcTime + userID + uuid
    : originalURL + utcTime + uuid;
  const hash = crypto.createHash("md5").update(hashValue).digest("hex");
  const shortHash = hash.slice(0, 6);
  return shortHash;
}
