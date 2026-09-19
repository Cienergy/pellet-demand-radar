import { useCallback, useEffect, useState } from "react";
import type { Feed } from "./types";

const FEED_URL = `${import.meta.env.BASE_URL}data/feed.json`;

export function useFeed(pollMs = 60_000) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${FEED_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
      const data = (await res.json()) as Feed;
      setFeed(data);
      setError(null);
      setLastFetch(new Date().toISOString());
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return { feed, loading, error, lastFetch, refresh };
}
