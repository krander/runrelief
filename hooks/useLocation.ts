import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

type UseLocationResult = {
  location: Location.LocationObject | null;
  error: string | null;
};

export function useLocation(enabled: boolean): UseLocationResult {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,      // update at most every 1 second
        distanceInterval: 5,     // update when moved at least 5 metres
      },
      (loc) => {
        setLocation(loc);
        setError(null);
      },
    )
      .then((sub) => { subscription = sub; })
      .catch((err: Error) => { setError(err.message); });

    return () => { subscription?.remove(); };
  }, [enabled]);

  return { location, error };
}
