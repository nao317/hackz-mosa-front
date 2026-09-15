import type { WeatherSnapshot } from "../Geolocation/Weather";

export type TimePeriod = "morning" | "daytime" | "evening" | "night";

const rainCodes = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82,
]);
const snowCodes = new Set([71, 73, 75, 77, 85, 86]);
const stormCodes = new Set([95, 96, 99]);

export function getTimePeriod(date: Date, timeZone?: string): TimePeriod {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
  const hour = Number(
    formatter.formatToParts(date).find((part) => part.type === "hour")?.value,
  );

  if (hour >= 5 && hour < 10) {
    return "morning";
  }
  if (hour >= 10 && hour < 17) {
    return "daytime";
  }
  if (hour >= 17 && hour < 22) {
    return "evening";
  }
  return "night";
}

function getWeatherKeyword(weather?: WeatherSnapshot): string | undefined {
  if (!weather) {
    return undefined;
  }
  if (stormCodes.has(weather.weatherCode)) {
    return "storm electronic";
  }
  if (snowCodes.has(weather.weatherCode)) {
    return "snow acoustic";
  }
  if (rainCodes.has(weather.weatherCode)) {
    return "rain ambient";
  }
  if ([45, 48].includes(weather.weatherCode)) {
    return "fog ambient";
  }
  if (weather.weatherCode === 0) {
    return weather.isDay ? "sunny upbeat" : "clear night";
  }
  return "cloudy lofi";
}

export function getRecommendationQueries(
  weather?: WeatherSnapshot,
  date = new Date(),
): string[] {
  const period = getTimePeriod(date, weather?.timeZone);
  const timeQueryByPeriod: Record<TimePeriod, string> = {
    morning: "morning acoustic",
    daytime: "daytime upbeat",
    evening: "evening chill",
    night: "night lofi",
  };
  const weatherKeyword = getWeatherKeyword(weather);

  return Array.from(
    new Set(
      [
        weatherKeyword ? `${weatherKeyword} ${period}` : undefined,
        weatherKeyword,
        timeQueryByPeriod[period],
        "lofi",
      ].filter((query): query is string => Boolean(query)),
    ),
  );
}
