export type VoicePreset = "founder" | "company";

export interface TrendItem {
  id: string;
  title: string;
  source: string;
  source_type: string;
  url: string;
  summary: string;
  relevance_reason: string;
  published_at: string | null;
  tags: string[];
  score: number;
}

export interface TrendBrief {
  generated_at: string;
  items: TrendItem[];
  total_fetched: number;
  fresh_count: number;
  unique_count: number;
  source_breakdown: Record<string, number>;
}

export interface TaggingHint {
  entity: string;
  entity_type: "company" | "person";
  reason: string;
}

export interface LintResult {
  score: number;
  flags: string[];
}

export interface SimilarityMatch {
  source_id: string;
  label: string;
  score: number;
  source_type: string;
}

export interface SimilarityResult {
  max_score: number;
  status: "clear" | "review" | "blocked";
  matches: SimilarityMatch[];
}

export interface GeneratedPost {
  id: string;
  trend_id: string;
  trend_title: string;
  voice: VoicePreset;
  hook: string;
  hook_type: string;
  body: string;
  format: "short" | "mid" | "long";
  hashtags: string[];
  tagging_hints: TaggingHint[];
  source_ids: string[];
  sources: TrendItem[];
  lint: LintResult;
  similarity: SimilarityResult;
}

export interface BatchResponse {
  batch_id: string;
  voice: VoicePreset;
  generated_at: string;
  trend_brief: TrendBrief;
  posts: GeneratedPost[];
  feedback_summary: string;
  style_summary: Record<string, string[]>;
}

export interface StyleGuideResponse {
  style_guide: string;
  voice_guides: Record<VoicePreset, string>;
  research_corpus: Array<{
    id: string;
    creator: string;
    source_url: string;
    pattern_note: string;
    source_type: string;
  }>;
  pattern_summary: Record<string, string[]>;
}

export interface FeedbackPayload {
  post_id: string;
  impressions: number;
  reactions: number;
  comments: number;
  reposts: number;
  saves: number;
  clicks: number;
  notes?: string;
}

export interface FeedbackResponse {
  post_id: string;
  message: string;
  feedback_summary: string;
}
