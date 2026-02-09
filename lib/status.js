const STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  PREPARING: "PREPARING",
  READY: "READY",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
};

const allowedTransitions = {
  [STATUS.PENDING]: [STATUS.PAID, STATUS.CANCELED],
  [STATUS.PAID]: [STATUS.PREPARING, STATUS.CANCELED],
  [STATUS.PREPARING]: [STATUS.READY, STATUS.CANCELED],
  [STATUS.READY]: [STATUS.COMPLETED, STATUS.CANCELED],
};

const terminalStatuses = new Set([STATUS.CANCELED, STATUS.COMPLETED]);

const openStatuses = [
  STATUS.PENDING,
  STATUS.PAID,
  STATUS.PREPARING,
  STATUS.READY,
];

function canTransition(current, next) {
  if (!current || !next) return false;
  if (terminalStatuses.has(current)) return false;
  const allowed = allowedTransitions[current] || [];
  return allowed.includes(next);
}

module.exports = {
  STATUS,
  allowedTransitions,
  openStatuses,
  canTransition,
  terminalStatuses,
};
