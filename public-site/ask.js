// Ask Breakroom: a free hosted model answers questions about one tool page.
// Calls the Supabase Edge Function; shows a saved demo answer if the model is unavailable.
const ASK_URL = "https://sprnmhdizfajlaybojuh.supabase.co/functions/v1/ask-breakroom";
const SLUGS = ["switchboard", "accessproof", "eventmedic", "erasurecheck", "importrescue", "economybreaker"];

const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = String(text);
  if (cls) e.className = cls;
  return e;
};

const demoAnswer = (p) =>
  p.copy.agent + " " + (p.copy.steps || []).map((s, i) => i + 1 + ". " + s).join(" ") + " Limits: " + p.copy.limit;

function askPanel(p) {
  const section = el("section", undefined, "ask");
  section.append(
    el("h3", "Ask about this tool"),
    el("p", "A free hosted model answers from this page's recorded evidence only. If it is busy, you'll see a saved demo answer instead.", "ask-hint"),
  );
  const form = el("form");
  const label = el("label", "Your question");
  label.htmlFor = "ask-q";
  const input = el("input");
  input.id = "ask-q";
  input.maxLength = 300;
  input.placeholder = "e.g. What failure does this catch?";
  const button = el("button", "Ask", "button");
  button.type = "submit";
  form.append(label, input, button);
  const out = el("div", undefined, "ask-answer");
  out.setAttribute("aria-live", "polite");
  const show = (text, tag) => out.replaceChildren(el("small", tag), el("p", text));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (question.length < 3) return;
    button.disabled = true;
    show("Thinking…", "LIVE MODEL");
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(ASK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug, question }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = await r.json();
      if (data.mode === "live" && data.answer) show(data.answer, "LIVE MODEL · " + (data.model || "free tier"));
      else
        show(
          demoAnswer(p),
          data.reason === "rate_limited"
            ? "DEMO RESPONSE · question limit reached, try again later"
            : "DEMO RESPONSE · live model unavailable",
        );
    } catch {
      show(demoAnswer(p), "DEMO RESPONSE · live model unavailable");
    } finally {
      button.disabled = false;
    }
  });
  section.append(form, out);
  return section;
}

const slug = location.pathname.split("/").filter(Boolean)[0];
if (SLUGS.includes(slug)) {
  const evidence = fetch("/evidence.json").then((r) => r.json());
  const mount = async () => {
    const aside = document.querySelector("main aside");
    if (!aside || aside.querySelector(".ask")) return !!aside;
    const p = (await evidence).products.find((x) => x.slug === slug);
    if (!p || aside.querySelector(".ask")) return true;
    const anchor = aside.querySelector("section.explanation");
    const panel = askPanel(p);
    anchor ? anchor.after(panel) : aside.append(panel);
    return true;
  };
  const obs = new MutationObserver(async () => {
    if (await mount()) obs.disconnect();
  });
  obs.observe(document.querySelector("main"), { childList: true, subtree: true });
  mount().then((done) => done && obs.disconnect());
}
