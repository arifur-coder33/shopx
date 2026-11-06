import test from "node:test";
import assert from "node:assert/strict";
import { storefrontScheduleWindow } from "./storefrontSchedule.mjs";

const now = Date.parse("2026-11-06T12:00:00Z");

test("no scheduled transitions means on-demand-only caching", () => {
  assert.deepEqual(storefrontScheduleWindow([], now), { epoch: "0", revalidate: false });
  assert.deepEqual(storefrontScheduleWindow([{ startAt: null, endAt: null }], now), { epoch: "0", revalidate: false });
  assert.equal(storefrontScheduleWindow([{ startAt: "invalid", endAt: "invalid" }], now).revalidate, false);
});

test("expiry follows the next real boundary instead of a fixed minute", () => {
  const startAt = new Date(now + 3_600_000);
  const endAt = new Date(now + 7_200_000);
  const beforeStart = storefrontScheduleWindow([{ startAt, endAt }], now);
  assert.equal(beforeStart.revalidate, 3601);
  const atStart = storefrontScheduleWindow([{ startAt, endAt }], startAt.getTime());
  assert.equal(atStart.epoch, String(startAt.getTime()));
  assert.notEqual(atStart.epoch, beforeStart.epoch);
  assert.ok(atStart.revalidate >= 3600);
});

test("inclusive end gets a different cache epoch only after it ends", () => {
  const record = { startAt: new Date(now - 1000), endAt: new Date(now) };
  const atEnd = storefrontScheduleWindow([record], now);
  const afterEnd = storefrontScheduleWindow([record], now + 1);
  assert.equal(atEnd.epoch, String(now - 1000));
  assert.equal(afterEnd.epoch, String(now + 1));
  assert.equal(afterEnd.revalidate, false);
});

test("multiple campaigns pick the nearest upcoming transition", () => {
  const records = [
    { startAt: new Date(now - 1000), endAt: new Date(now + 600_000) },
    { startAt: new Date(now + 30_000), endAt: new Date(now + 900_000) },
  ];
  assert.equal(storefrontScheduleWindow(records, now).revalidate, 31);
  assert.equal(storefrontScheduleWindow(records, now + 31_000).epoch, String(now + 30_000));
});
