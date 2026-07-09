// Modular connector system for opportunity aggregation.
// Each kind exports { fetch(source) -> NormalizedOpp[] }. Pure fetch, no Node-only deps.

export type NormalizedOpp = {
  external_id: string;
  title: string;
  organization: string;
  description: string;
  apply_link: string;
  deadline: string; // ISO date (YYYY-MM-DD)
  category: string;
  eligibility?: string | null;
  benefits?: string | null;
  skills_required?: string[];
  location?: string | null;
  tags?: string[];
  summary?: string | null;
};

export type SourceRow = {
  id: string;
  name: string;
  kind: string;
  url: string;
  config: Record<string, unknown>;
  default_category: string | null;
};

// -------- helpers --------
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function pickTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
export function contentHash(o: NormalizedOpp): string {
  return hash(`${o.title}|${o.organization}|${o.deadline}|${o.apply_link}`);
}

// -------- RSS / Atom --------
async function fetchRss(src: SourceRow): Promise<NormalizedOpp[]> {
  const res = await fetch(src.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OpportunityHubBot/1.0; +https://opportunityhub.ai)",
      "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();
  const items = xml.split(/<item[\s>]|<entry[\s>]/i).slice(1);
  const org = (src.config?.organization as string | undefined) ?? src.name;
  const cat = src.default_category ?? "hackathon";
  const defaultDeadlineDays = Number(src.config?.default_deadline_days ?? 30);
  return items.slice(0, 50).map((raw) => {
    const chunk = "<x>" + raw + "</x>";
    const title = pickTag(chunk, "title") ?? "Untitled";
    const link =
      pickTag(chunk, "link") ??
      (chunk.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? "");
    const description = pickTag(chunk, "description") ?? pickTag(chunk, "summary") ?? pickTag(chunk, "content") ?? "";
    const guid = pickTag(chunk, "guid") ?? pickTag(chunk, "id") ?? (link || title);
    return {
      external_id: guid,
      title: stripHtml(title).slice(0, 300),
      organization: org,
      description: stripHtml(description).slice(0, 2000),
      apply_link: link,
      deadline: futureDate(defaultDeadlineDays),
      category: cat,
    };
  });
}

// -------- Greenhouse public job boards --------
// URL example: https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true
async function fetchGreenhouse(src: SourceRow): Promise<NormalizedOpp[]> {
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`Greenhouse ${res.status}`);
  const j = (await res.json()) as { jobs: Array<{ id: number; title: string; absolute_url: string; location?: { name?: string }; content?: string; updated_at?: string; company_name?: string }> };
  const org = (src.config?.organization as string | undefined) ?? j.jobs[0]?.company_name ?? src.name;
  const cat = src.default_category ?? "internship";
  return (j.jobs ?? []).map((job) => ({
    external_id: String(job.id),
    title: job.title,
    organization: org,
    description: stripHtml(job.content ?? "").slice(0, 2000),
    apply_link: job.absolute_url,
    deadline: futureDate(60),
    category: cat,
    location: job.location?.name ?? null,
  }));
}

// -------- Lever public postings --------
// URL example: https://api.lever.co/v0/postings/{company}?mode=json
async function fetchLever(src: SourceRow): Promise<NormalizedOpp[]> {
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`Lever ${res.status}`);
  const arr = (await res.json()) as Array<{ id: string; text: string; hostedUrl: string; categories?: { location?: string; team?: string }; descriptionPlain?: string }>;
  const org = (src.config?.organization as string | undefined) ?? src.name;
  const cat = src.default_category ?? "internship";
  return arr.map((p) => ({
    external_id: p.id,
    title: p.text,
    organization: org,
    description: (p.descriptionPlain ?? "").slice(0, 2000),
    apply_link: p.hostedUrl,
    deadline: futureDate(60),
    category: cat,
    location: p.categories?.location ?? null,
  }));
}

// -------- USAJobs (Government) --------
// URL example: https://data.usajobs.gov/api/search?Keyword=intern&ResultsPerPage=25
// Optional env: USAJOBS_API_KEY (unauth calls still work but are rate-limited)
async function fetchUSAJobs(src: SourceRow): Promise<NormalizedOpp[]> {
  const headers: Record<string, string> = {
    "Host": "data.usajobs.gov",
    "User-Agent": (src.config?.contact_email as string) ?? "hello@opportunityhub.ai",
  };
  if (process.env.USAJOBS_API_KEY) headers["Authorization-Key"] = process.env.USAJOBS_API_KEY;
  const res = await fetch(src.url, { headers });
  if (!res.ok) throw new Error(`USAJobs ${res.status}`);
  const j = await res.json() as {
    SearchResult?: { SearchResultItems?: Array<{ MatchedObjectId: string; MatchedObjectDescriptor: {
      PositionTitle: string; PositionURI: string; OrganizationName: string;
      QualificationSummary?: string; UserArea?: { Details?: { WhoMayApply?: { Name?: string } } };
      ApplicationCloseDate?: string; PositionLocationDisplay?: string; PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string }>;
    } }> }
  };
  const items = j.SearchResult?.SearchResultItems ?? [];
  const cat = src.default_category ?? "government";
  return items.map((it) => {
    const d = it.MatchedObjectDescriptor;
    const deadline = d.ApplicationCloseDate ? d.ApplicationCloseDate.slice(0, 10) : futureDate(30);
    const pay = d.PositionRemuneration?.[0];
    const stipend = pay ? `$${pay.MinimumRange} - $${pay.MaximumRange}` : undefined;
    return {
      external_id: it.MatchedObjectId,
      title: d.PositionTitle,
      organization: d.OrganizationName,
      description: (d.QualificationSummary ?? "").slice(0, 2000),
      apply_link: d.PositionURI,
      deadline,
      category: cat,
      eligibility: d.UserArea?.Details?.WhoMayApply?.Name ?? null,
      location: d.PositionLocationDisplay ?? null,
      benefits: stipend ?? null,
    };
  });
}

// -------- Generic JSON with JSONPath-ish mapping --------
// config: { itemsPath: "data.items", map: { external_id: "id", title: "name", ... } }
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return acc;
    if (Array.isArray(acc) && /^\d+$/.test(key)) return acc[Number(key)];
    return (acc as Record<string, unknown>)[key];
  }, obj);
}
async function fetchCustomJson(src: SourceRow): Promise<NormalizedOpp[]> {
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`custom_json ${res.status}`);
  const j = await res.json();
  const cfg = src.config as { itemsPath?: string; map?: Record<string, string> };
  const items = (cfg.itemsPath ? getPath(j, cfg.itemsPath) : j) as unknown[];
  if (!Array.isArray(items)) throw new Error("custom_json: itemsPath did not resolve to an array");
  const map = cfg.map ?? {};
  const cat = src.default_category ?? "internship";
  const org = (src.config?.organization as string | undefined) ?? src.name;
  return items.map((it, i) => {
    const val = (k: string) => (map[k] ? String(getPath(it, map[k]) ?? "") : "");
    const deadline = val("deadline") || futureDate(30);
    return {
      external_id: val("external_id") || String(i),
      title: val("title") || "Untitled",
      organization: val("organization") || org,
      description: stripHtml(val("description")).slice(0, 2000),
      apply_link: val("apply_link") || src.url,
      deadline: deadline.slice(0, 10),
      category: val("category") || cat,
    };
  });
}

// -------- Dispatcher --------
export const CONNECTOR_KINDS = ["rss", "greenhouse", "lever", "usajobs", "custom_json"] as const;
export type ConnectorKind = (typeof CONNECTOR_KINDS)[number];

export async function runConnector(src: SourceRow): Promise<NormalizedOpp[]> {
  switch (src.kind) {
    case "rss":
    case "devpost_rss":
    case "hackerearth_rss":
      return fetchRss(src);
    case "greenhouse":
      return fetchGreenhouse(src);
    case "lever":
      return fetchLever(src);
    case "usajobs":
      return fetchUSAJobs(src);
    case "custom_json":
      return fetchCustomJson(src);
    default:
      throw new Error(`Unknown connector kind: ${src.kind}`);
  }
}