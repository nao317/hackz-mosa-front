import { describe, expect, it } from "vitest";

import type { WeatherSnapshot } from "../Geolocation/Weather";
import { getRecommendationQueries, getTimePeriod } from "./recommendation";

const weather: WeatherSnapshot = {
  temperatureC: 18,
  apparentTemperatureC: 17,
  precipitationMm: 1,
  weatherCode: 61,
  isDay: true,
  observedAt: "2026-09-15T12:00",
  modelTime: "2026-09-15T12:00",
  timeZone: "Asia/Tokyo",
};

describe("getTimePeriod", () => {
  it("uses the weather location time zone", () => {
    const date = new Date("2026-09-15T00:00:00Z");

    expect(getTimePeriod(date, "Asia/Tokyo")).toBe("morning");
    expect(getTimePeriod(date, "America/Los_Angeles")).toBe("evening");
  });
});

describe("getRecommendationQueries", () => {
  it("prioritizes a query made from weather and local time", () => {
    const queries = getRecommendationQueries(
      weather,
      new Date("2026-09-15T11:00:00Z"),
    );

    expect(queries[0]).toBe("rain ambient evening");
    expect(queries).toContain("evening chill");
    expect(queries.at(-1)).toBe("lofi");
  });

  it("falls back to time-based queries when weather is unavailable", () => {
    const queries = getRecommendationQueries(
      undefined,
      new Date(2026, 8, 15, 23, 0),
    );

    expect(queries).toEqual(["night lofi", "lofi"]);
  });
});
