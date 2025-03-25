// src/utils/serverState.js
let isShuttingDown = false;

export function setShuttingDown(value) {
  isShuttingDown = value;
}

export function getShuttingDown() {
  return isShuttingDown;
}
