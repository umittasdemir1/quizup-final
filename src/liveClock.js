// Anchor to monotonic time: phone clock changes cannot move the countdown.
export function clockAnchor(serverNow, sentAt, receivedAt) {
  return { serverMs: Date.parse(serverNow) + Math.max(0, receivedAt - sentAt) / 2, receivedAt };
}

export function secondsRemaining(deadline, anchor, now = performance.now()) {
  if (!deadline || !anchor) return null;
  return Math.max(0, Math.ceil((Date.parse(deadline) - anchor.serverMs - (now - anchor.receivedAt)) / 1000));
}
