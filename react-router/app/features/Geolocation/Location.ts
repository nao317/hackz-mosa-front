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
    if (!stopped && document.visibilityState === "visible") {
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
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    stopped = true;
    navigator.geolocation.clearWatch(watchId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

