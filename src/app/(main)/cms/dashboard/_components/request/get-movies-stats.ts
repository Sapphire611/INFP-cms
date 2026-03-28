"use client";

import { useState, useEffect } from "react";

interface MovieStats {
  total: number;
  monthly: number;
  weekly: number;
  daily: number;
}

export function useMovieStats() {
  const [stats, setStats] = useState<MovieStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/movies/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch movie stats");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}
