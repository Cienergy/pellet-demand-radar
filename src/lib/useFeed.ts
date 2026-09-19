import { useCallback, useEffect, useRef, useState } from "react";
import type { Feed } from "./types";

const FEED_URL = `${import.meta.env.BASE_URL}data/feed.json`;

export function useFeed(pollMs = 60_000) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async (manual = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(`${FEED_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
      const data = (await res.json()) as Feed;
      setFeed(data);
      setError(null);
      setLastFetch(new Date().toISOString());
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const id = window.setInterval(() => void refresh(false), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return { feed, loading, refreshing, error, lastFetch, refresh };
}
