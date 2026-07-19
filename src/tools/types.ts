/**
 * Shared tool result types — every tool wraps its output in ToolResult<T>.
 *
 * Design goals (from AI Agent Learning Roadmap 1.2):
 *   - Unified return shape so the model can reason about confidence, source, latency
 *   - Error grading: retryable vs fatal vs fallback — model can decide next action
 *   - Metadata always present — enables observability even without external tracing
 */

// ─── Core Types ─────────────────────────────────────────────

export interface ToolMetadata {
  /** Human-readable data source label, e.g. "Bing", "wttr.in", "Intl.DateTimeFormat" */
  source: string;
  /** 0-1 confidence estimate. 0.95+ = authoritative, 0.7-0.9 = good, <0.7 = uncertain */
  confidence: number;
  /** Wall-clock execution time in milliseconds */
  latencyMs: number;
}

export interface ToolError {
  /** Machine-readable error code, e.g. "TIMEOUT", "PARSE_ERROR", "RATE_LIMITED" */
  code: string;
  /** Human-readable error message (Chinese OK, model can read it) */
  message: string;
  /** true = caller should retry with same args; false = retry won't help */
  retryable: boolean;
  /** Degraded result when the primary source fails */
  fallback?: unknown;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data: T;
  metadata: ToolMetadata;
  error?: ToolError;
}

// ─── Constructors ───────────────────────────────────────────

export function success<T>(
  data: T,
  metadata: Partial<ToolMetadata> & { source: string }
): ToolResult<T> {
  return {
    success: true,
    data,
    metadata: {
      source: metadata.source,
      confidence: metadata.confidence ?? 0.9,
      latencyMs: metadata.latencyMs ?? 0,
    },
  };
}

export function failure<T = never>(
  code: string,
  message: string,
  opts?: { retryable?: boolean; fallback?: unknown }
): ToolResult<T> {
  return {
    success: false,
    data: null as unknown as T,
    metadata: { source: "error", confidence: 0, latencyMs: 0 },
    error: {
      code,
      message,
      retryable: opts?.retryable ?? false,
      fallback: opts?.fallback,
    },
  };
}
