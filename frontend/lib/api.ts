import type {
  BatchResponse,
  FeedbackPayload,
  FeedbackResponse,
  StyleGuideResponse,
  VoicePreset
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchStyleGuide(): Promise<StyleGuideResponse> {
  const response = await fetch(`${API_BASE}/api/style-guide`, { cache: "no-store" });
  return parseJson<StyleGuideResponse>(response);
}

export async function generateBatch(voice: VoicePreset): Promise<BatchResponse> {
  const response = await fetch(`${API_BASE}/api/generate-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice, count: 5 })
  });
  return parseJson<BatchResponse>(response);
}

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const response = await fetch(`${API_BASE}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson<FeedbackResponse>(response);
}
