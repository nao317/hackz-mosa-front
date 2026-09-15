export type WeatherRequest = {
	latitude: number;
	longitude: number;
};

export type WeatherSnapshot = {
	temperatureC: number;
	apparentTemperatureC: number;
	precipitationMm: number;
	weatherCode: number;
	isDay: boolean;
	observedAt: string;
	modelTime: string;
	timeZone: string;
};

export async function fetchWeather(
	request: WeatherRequest,
	signal?: AbortSignal,
): Promise<WeatherSnapshot> {
	const params = new URLSearchParams({
		latitude: request.latitude.toFixed(6),
		longitude: request.longitude.toFixed(6),
		current:
			"temperature_2m,apparent_temperature,precipitation,weather_code,is_day",
		timezone: "auto",
	});

	let response: Response;
	try {
		response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
			signal: signal ?? AbortSignal.timeout(5_000),
		});
	} catch (error: unknown) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}

		throw new Error("天気情報の取得がタイムアウトしました。", {
			cause: error,
		});
	}

	if (!response.ok) {
		throw new Error("天気情報を取得できませんでした。");
	}

	const payload: unknown = await response.json();
	if (!isOpenMeteoResponse(payload)) {
		throw new Error("天気情報の形式が不正です。");
	}

	return {
		temperatureC: payload.current.temperature_2m,
		apparentTemperatureC: payload.current.apparent_temperature,
		precipitationMm: payload.current.precipitation,
		weatherCode: payload.current.weather_code,
		isDay: payload.current.is_day === 1,
		observedAt: payload.current.time,
		modelTime: payload.current.time,
		timeZone: payload.timezone,
	};
}

function isOpenMeteoResponse(
	value: unknown,
): value is {
	current: {
		temperature_2m: number;
		apparent_temperature: number;
		precipitation: number;
		weather_code: number;
		is_day: number;
		time: string;
	};
	timezone: string;
} {
	if (!value || typeof value !== "object") {
		return false;
	}

	const response = value as Record<string, unknown>;
	const current = response.current;
	if (!current || typeof current !== "object") {
		return false;
	}

	const values = current as Record<string, unknown>;
	return (
		typeof response.timezone === "string" &&
		typeof values.temperature_2m === "number" &&
		typeof values.apparent_temperature === "number" &&
		typeof values.precipitation === "number" &&
		typeof values.weather_code === "number" &&
		typeof values.is_day === "number" &&
		typeof values.time === "string"
	);
}
