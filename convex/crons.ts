import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "expire stale follow-ups",
  { hourUTC: 6, minuteUTC: 0 },
  internal.conversations.expireStaleFollowUps
);

export default crons;
