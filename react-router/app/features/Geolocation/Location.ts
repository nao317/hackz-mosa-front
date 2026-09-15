const geolocationOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

export type Location = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: number;
};

export async function fetchMunicipalityName(
  location: Pick<Location, "latitude" | "longitude">,
  signal?: AbortSignal,
): Promise<string> {
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(6),
    longitude: location.longitude.toFixed(6),
    localityLanguage: "ja",
  });

  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
    { signal: signal ?? AbortSignal.timeout(5_000) },
  );

  if (!response.ok) {
    throw new Error("現在地の地域名を取得できませんでした。");
  }

  const payload: unknown = await response.json();
  if (!isReverseGeocodeResponse(payload)) {
    throw new Error("現在地の地域名の形式が不正です。");
  }

  const municipality = formatMunicipalityName(payload);
  if (!municipality) {
    throw new Error("現在地の市町村名を取得できませんでした。");
  }

  return municipality;
}

function formatMunicipalityName(payload: {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  localityInfo?: {
    administrative?: Array<{
      name: string;
      adminLevel: number;
    }>;
  };
}): string {
  const city = payload.city?.trim();
  const locality = payload.locality?.trim();
  if (city && locality && city !== locality) {
    return `${city}${locality}`;
  }

  const finestAdministrativeArea = payload.localityInfo?.administrative
    ?.filter((area) => area.name && area.adminLevel >= 2)
    .sort((left, right) => right.adminLevel - left.adminLevel)[0]?.name;
  return (
    city ||
    locality ||
    finestAdministrativeArea ||
    payload.principalSubdivision ||
    ""
  );
}

function isReverseGeocodeResponse(
  value: unknown,
): value is {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  localityInfo?: {
    administrative?: Array<{
      name: string;
      adminLevel: number;
    }>;
  };
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Record<string, unknown>;
  return (
    (response.city === undefined || typeof response.city === "string") &&
    (response.locality === undefined || typeof response.locality === "string") &&
    (response.principalSubdivision === undefined ||
      typeof response.principalSubdivision === "string") &&
    (response.localityInfo === undefined ||
      (typeof response.localityInfo === "object" &&
        response.localityInfo !== null &&
        (!(
          "administrative" in response.localityInfo &&
          response.localityInfo.administrative !== undefined
        ) ||
          (Array.isArray(response.localityInfo.administrative) &&
            response.localityInfo.administrative.every(
              (area) =>
                typeof area === "object" &&
                area !== null &&
                typeof area.name === "string" &&
                typeof area.adminLevel === "number",
            )))))
  );
}

export type LocationErrorCode =
  | "LOCATION_UNSUPPORTED"
  | "LOCATION_PERMISSION_DENIED"
  | "LOCATION_UNAVAILABLE"
  | "LOCATION_TIMEOUT";

export class LocationError extends Error {
  constructor(
    public readonly code: LocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LocationError";
  }
}

export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new LocationError(
          "LOCATION_UNSUPPORTED",
          "このブラウザは位置情報の取得に対応していません。",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: position.timestamp,
        });
      },
      (error) => {
        const errorByCode: Record<
          1 | 2 | 3,
          { code: LocationErrorCode; message: string }
        > = {
          1: {
            code: "LOCATION_PERMISSION_DENIED",
            message: "位置情報の利用が許可されていません。",
          },
          2: {
            code: "LOCATION_UNAVAILABLE",
            message: "現在地を取得できませんでした。",
          },
          3: {
            code: "LOCATION_TIMEOUT",
            message: "現在地の取得がタイムアウトしました。",
          },
        };

        const locationError = errorByCode[error.code as 1 | 2 | 3];
        reject(
          new LocationError(
            locationError?.code ?? "LOCATION_UNAVAILABLE",
            locationError?.message ?? "現在地を取得できませんでした。",
          ),
        );
      },
      geolocationOptions,
    );
  });
}

export function startLocationPolling(
  onSuccess: (location: Location) => void,
  onError: (error: LocationError) => void,
): () => void {
  let stopped = false;

  if (!navigator.geolocation) {
    onError(
      new LocationError(
        "LOCATION_UNSUPPORTED",
        "このブラウザは位置情報の取得に対応していません。",
      ),
    );
    return () => {
      stopped = true;
    };
  }

  const handleSuccess = (position: GeolocationPosition) => {
    if (stopped) {
      return;
    }

    onSuccess({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      capturedAt: position.timestamp,
    });
  };

  const handleError = (error: GeolocationPositionError) => {
    if (stopped) {
      return;
    }

    const errorByCode: Record<
      1 | 2 | 3,
      { code: LocationErrorCode; message: string }
    > = {
      1: {
        code: "LOCATION_PERMISSION_DENIED",
        message: "位置情報の利用が許可されていません。",
      },
      2: {
        code: "LOCATION_UNAVAILABLE",
        message: "現在地を取得できませんでした。",
      },
      3: {
        code: "LOCATION_TIMEOUT",
        message: "現在地の取得がタイムアウトしました。",
      },
    };

    const locationError = errorByCode[error.code as 1 | 2 | 3];
    onError(
      new LocationError(
        locationError?.code ?? "LOCATION_UNAVAILABLE",
        locationError?.message ?? "現在地を取得できませんでした。",
      ),
    );
  };

  const watchId = navigator.geolocation.watchPosition(
    handleSuccess,
    handleError,
    geolocationOptions,
  );

  const handleVisibilityChange = () => {
    if (stopped || document.visibilityState !== "visible") {
      return;
    }

    void getCurrentLocation()
      .then((location) => {
        if (!stopped) {
          onSuccess(location);
        }
      })
      .catch((error: unknown) => {
        if (!stopped) {
          onError(
            error instanceof LocationError
              ? error
              : new LocationError(
                  "LOCATION_UNAVAILABLE",
                  "現在地を取得できませんでした。",
                ),
          );
        }
      });
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    stopped = true;
    navigator.geolocation.clearWatch(watchId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

