import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  // dynamic import keeps server-only module out of client bundle
  return import("@/lib/ai-gateway.server").then(({ createLovableAiGatewayProvider }) =>
    createLovableAiGatewayProvider(key),
  );
}

/** Recommend opportunities for the signed-in user using AI. Returns ranked list with match% + reasons. */
export const aiRecommend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: profile }, { data: opps }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("opportunities")
        .select("*")
        .gte("deadline", today)
        .order("deadline", { ascending: true })
        .limit(40),
    ]);

    if (!profile || !opps || opps.length === 0) return { recommendations: [] as Array<{ id: string; match: number; reasons: string[] }> };

    const profileSummary = {
      skills: profile.skills ?? [],
      interests: profile.interests ?? [],
      degree: profile.degree,
      branch: profile.branch,
      year: profile.current_year,
      cgpa: profile.cgpa,
      certifications: profile.certifications ?? [],
      resume_excerpt: (profile.resume_text ?? "").slice(0, 1500),
    };

    const oppList = opps.map((o) => ({
      id: o.id,
      title: o.title,
      organization: o.organization,
      category: o.category,
      eligibility: o.eligibility,
      skills_required: o.skills_required,
      description: o.description.slice(0, 300),
    }));

    const gateway = await getGateway();
    const prompt = `You are an expert career advisor matching a student with opportunities.

STUDENT PROFILE:
${JSON.stringify(profileSummary, null, 2)}

OPPORTUNITIES (live, not expired):
${JSON.stringify(oppList, null, 2)}

Return STRICT JSON only (no markdown). For the TOP 12 best matches, output:
{"recommendations":[{"id":"<id>","match":<int 0-100>,"reasons":["short reason 1","short reason 2","short reason 3"]}]}

Match score uses: skills overlap (40%), interest/category fit (25%), academic eligibility (25%), resume keywords (10%). Be honest — low scores for weak fits. Reasons must be specific (e.g. "Matches Python skill", "Eligible for B.Tech students", "Aligns with AI interest").`;

    const { text } = await generateText({ model: gateway(MODEL), prompt });
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { recommendations: Array<{ id: string; match: number; reasons: string[] }> };
      return { recommendations: parsed.recommendations ?? [] };
    } catch {
      return { recommendations: [] };
    }
  });

/** AI Career Mentor / Chatbot - single turn with stored history */
export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { message } = data;

    const [{ data: profile }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("chat_history")
        .select("role,content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

    await supabase.from("chat_history").insert({ user_id: userId, role: "user", content: message });

    const system = `You are OpportunityHub AI - a friendly career mentor for college students.
You help with: scholarships, internships, hackathons, certifications, career paths, resume advice, skill-gap analysis.
Be concise, encouraging, and actionable. Use bullet points.

STUDENT PROFILE:
${profile ? JSON.stringify({
      name: profile.full_name,
      degree: profile.degree,
      branch: profile.branch,
      year: profile.current_year,
      skills: profile.skills,
      interests: profile.interests,
    }) : "(no profile yet)"}`;

    const messages = [
      { role: "system" as const, content: system },
      ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const gateway = await getGateway();
    const { text } = await generateText({ model: gateway(MODEL), messages });

    await supabase.from("chat_history").insert({ user_id: userId, role: "assistant", content: text });
    return { reply: text };
  });

/** AI Skill Gap analysis for a specific opportunity */
export const aiSkillGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { opportunityId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: opp }] = await Promise.all([
      supabase.from("profiles").select("skills,interests,certifications,resume_text").eq("id", userId).maybeSingle(),
      supabase.from("opportunities").select("*").eq("id", data.opportunityId).maybeSingle(),
    ]);
    if (!opp) throw new Error("Opportunity not found");

    const gateway = await getGateway();
    const prompt = `Compare this student's skills with the opportunity requirements and produce a skill gap report.

STUDENT SKILLS: ${JSON.stringify(profile?.skills ?? [])}
CERTIFICATIONS: ${JSON.stringify(profile?.certifications ?? [])}

OPPORTUNITY: ${opp.title} @ ${opp.organization}
REQUIRED SKILLS: ${JSON.stringify(opp.skills_required ?? [])}
ELIGIBILITY: ${opp.eligibility ?? ""}

Return STRICT JSON only:
{"missing_skills":["..."],"matched_skills":["..."],"resources":[{"skill":"...","resource":"<free course name/url suggestion>"}],"suggested_certifications":["..."]}`;
    const { text } = await generateText({ model: gateway(MODEL), prompt });
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { missing_skills: [], matched_skills: [], resources: [], suggested_certifications: [] };
    }
  });

/** Web-search opportunities via AI when the local DB has no matches.
 *  Returns real, currently-known opportunities with source URLs. */
export type WebOpp = {
  title: string;
  organization: string;
  category: string;
  description: string;
  apply_link: string;
  deadline: string | null;
  location?: string | null;
  skills_required?: string[];
};

export const aiSearchOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; category?: string }) => d)
  .handler(async ({ data }) => {
    const q = data.query.trim();
    if (!q) return { results: [] as WebOpp[] };

    const gateway = await getGateway();
    const today = new Date().toISOString().slice(0, 10);
    const prompt = `You are an opportunity researcher. A student is searching for: "${q}"${data.category && data.category !== "all" ? ` (category: ${data.category})` : ""}.

Today is ${today}. Return up to 8 REAL, currently-active or recurring opportunities (scholarships, internships, hackathons, fellowships, competitions, grants, courses, jobs) that match the query. Only include programs you are highly confident actually exist, from reputable organizations (governments, universities, well-known companies, established foundations, official programs).

STRICT rules:
- apply_link MUST be the real official homepage or application URL of the program (https://...). Never invent URLs.
- organization MUST be the real sponsoring organization.
- deadline: use ISO YYYY-MM-DD if you know the next upcoming deadline; otherwise null.
- description: 1-2 factual sentences, no marketing fluff.
- category: one of scholarship, internship, hackathon, certification, course, fellowship, competition, grant, research, conference, bootcamp, job, volunteer, mentorship, startup, government.
- If you are not confident a program is real, DO NOT include it. Empty array is better than fabrications.

Return STRICT JSON only, no markdown:
{"results":[{"title":"","organization":"","category":"","description":"","apply_link":"","deadline":null,"location":null,"skills_required":[]}]}`;

    const { text } = await generateText({ model: gateway(MODEL), prompt });
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { results: WebOpp[] };
      const results = (parsed.results ?? []).filter(
        (r) => r && r.title && r.organization && r.apply_link && /^https?:\/\//.test(r.apply_link),
      );
      return { results };
    } catch {
      return { results: [] as WebOpp[] };
    }
  });

/** AI Resume ATS checker — scores the user's resume and suggests skills to improve. */
export type ResumeAts = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  skills_to_improve: Array<{ skill: string; why: string; resource?: string }>;
  formatting_issues: string[];
  suggestions: string[];
};

export const aiResumeAts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetRole?: string; resumeText?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,degree,branch,current_year,skills,interests,certifications,resume_text")
      .eq("id", userId)
      .maybeSingle();

    const resumeText = (data.resumeText ?? profile?.resume_text ?? "").trim();
    if (!resumeText) throw new Error("No resume text found. Paste your resume in the Resume section first.");

    const gateway = await getGateway();
    const prompt = `You are an ATS (Applicant Tracking System) and career coach. Analyze the following resume${
      data.targetRole ? ` for the target role: "${data.targetRole}"` : ""
    } and produce a strict evaluation.

STUDENT CONTEXT: ${JSON.stringify({
      degree: profile?.degree,
      branch: profile?.branch,
      year: profile?.current_year,
      known_skills: profile?.skills ?? [],
      certifications: profile?.certifications ?? [],
    })}

RESUME:
"""
${resumeText.slice(0, 8000)}
"""

Score the resume out of 100 based on: ATS-friendly formatting (20%), keyword match & industry terms (25%), quantified impact & action verbs (20%), skills/technical depth (20%), clarity/structure (15%).

Return STRICT JSON only, no markdown:
{
  "score": <0-100 integer>,
  "summary": "<2 sentence overall verdict>",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "missing_keywords": ["...", "..."],
  "skills_to_improve": [{"skill":"","why":"","resource":"<free course/site suggestion>"}],
  "formatting_issues": ["..."],
  "suggestions": ["actionable bullet ...", "..."]
}`;

    const { text } = await generateText({ model: gateway(MODEL), prompt });
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as ResumeAts;
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))),
        summary: parsed.summary ?? "",
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        missing_keywords: parsed.missing_keywords ?? [],
        skills_to_improve: parsed.skills_to_improve ?? [],
        formatting_issues: parsed.formatting_issues ?? [],
        suggestions: parsed.suggestions ?? [],
      } satisfies ResumeAts;
    } catch {
      throw new Error("AI returned an invalid response. Please try again.");
    }
  });