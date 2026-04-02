import type { TrendBrief } from "../lib/types";

interface TrendBriefProps {
  brief: TrendBrief;
}

export function TrendBrief({ brief }: TrendBriefProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live Trend Brief</p>
          <h2>Fresh source material for this batch</h2>
          <p className="panel-copy">
            The generator shortlisted these topics from the current live pull before
            writing the batch.
          </p>
        </div>
        <div className="source-metrics">
          <span>{brief.total_fetched} fetched</span>
          <span>{brief.unique_count} unique</span>
          <span>{brief.fresh_count} fresh</span>
        </div>
      </div>

      <div className="chip-row brief-breakdown">
        {Object.entries(brief.source_breakdown).map(([source, count]) => (
          <span className="chip" key={source}>
            {source.replace(/_/g, " ")}: {count}
          </span>
        ))}
      </div>

      <div className="trend-grid">
        {brief.items.map((item) => (
          <article key={item.id} className="trend-card">
            <div className="trend-card-top">
              <span className={`badge badge-${item.source_type.replace(/_/g, "-")}`}>
                {item.source}
              </span>
              {item.published_at ? (
                <span className="muted">
                  {new Date(item.published_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            <a className="trend-title" href={item.url} rel="noreferrer" target="_blank">
              {item.title}
            </a>
            <p className="trend-summary">{item.summary || item.relevance_reason}</p>
            <p className="trend-reason">{item.relevance_reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
