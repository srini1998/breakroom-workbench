const main = document.querySelector("main");
const node = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = String(text);
  if (cls) e.className = cls;
  return e;
};
const link = (text, url, cls) => {
  const e = node("a", text, cls);
  e.href = url;
  return e;
};
const block = (parent, title, text) => {
  const s = node("section", undefined, "explanation");
  s.append(node("h2", title), node("p", text));
  parent.append(s);
  return s;
};
const summaries = {
  switchboard:
    "Compare two ways of sending live app updates and see which messages reached each team.",
  accessproof:
    "Check whether an owner, teammate or contractor can see only the work they should.",
  eventmedic:
    "A retried rental request should take one bike out of stock, not two.",
  erasurecheck:
    "Remove a shopper’s owned data and stop delayed jobs from bringing it back.",
  importrescue:
    "Review spreadsheet columns and totals, then import the rows without creating duplicates.",
  economybreaker:
    "Two players’ crafting requests should not create more items than their ingredients allow.",
};
function display(data) {
  main.replaceChildren();
  const slug = location.pathname.split("/").filter(Boolean)[0];
  const notice = node(
    "p",
    "Recorded evidence · Fresh experiments run in the local application. This public website does not execute database writes or paid inference.",
    "notice",
  );
  if (!slug) {
    const hero = node("section", undefined, "hero");
    hero.append(
      node("small", "SIX PRACTICAL SUPABASE APPLICATIONS"),
      node("h1", "Catch the bugs\nusers notice."),
      node(
        "p",
        "A teammate sees the wrong data. A rental removes two bikes from stock. A game creates an extra item. Explore six tools built to catch these everyday failures.",
      ),
    );
    hero.append(link("Explore the tools ↓", "#tools", "button"));
    const art = node("div", undefined, "hero-art");
    art.setAttribute("aria-hidden", "true");
    for (const label of [
      "{ permission }",
      "↻ one receipt",
      "▦ clean import",
      "◇ fair game",
    ])
      art.append(node("span", label));
    hero.append(art);
    main.append(hero);
    const grid = node("div", undefined, "directory");
    grid.id = "tools";
    for (const [i, p] of data.products.entries()) {
      const a = link("", `/${p.slug}`, i === 0 ? "feature" : "");
      a.append(
        node(
          "small",
          i === 0
            ? "FEATURED / REALTIME"
            : "APPLICATION " + String(i + 1).padStart(2, "0"),
        ),
        node("h2", p.name),
        node("p", summaries[p.slug] || p.copy.subtitle),
        node(
          "div",
          {
            switchboard: "Live event delivery",
            accessproof: "Team and client access",
            eventmedic: "Cycling and bike rentals",
            erasurecheck: "Shopper account cleanup",
            importrescue: "Retail spreadsheet imports",
            economybreaker: "Game crafting and inventory",
          }[p.slug],
          "use-label",
        ),
        node("span", "Explore the application ↗"),
      );
      grid.append(a);
    }
    main.append(grid, notice);
    const fit = block(
      main,
      "Could these become useful Supabase tooling?",
      "These applications are plausible reference implementations or developer tools. Native adoption and customer demand are unproven. Supabase already provides Advisors, database testing and Realtime reports. The narrower contribution is verifying declared application behavior before and after a change.",
    );
    fit.id = "product-fit";
    fit.append(
      link(
        "Supabase database testing",
        "https://supabase.com/docs/guides/database/testing",
      ),
      node("h3", "Policy Passport: a working local permission regression CLI"),
      node(
        "p",
        "A developer supplies expected role/action permissions. Actual ordinary Auth/RLS probes compare a clean baseline with a reviewed seeded candidate. The recorded candidate exposed two forbidden foreign-read changes and exited with code 1. This prototype supports one isolated two-tenant fixture, not arbitrary customer migrations.",
      ),
      node(
        "pre",
        "npm run preflight -- --candidate=clean\nnpm run preflight -- --candidate=candidate-1",
      ),
    );
    const detail = node("details");
    detail.append(
      node("summary", "Inspect actual Policy Passport report"),
      node("pre", JSON.stringify(data.policy, null, 2)),
    );
    fit.append(
      detail,
      link("Download recorded evidence bundle", "/evidence.json", "button"),
    );
    return;
  }
  const p = data.products.find((p) => p.slug === slug);
  if (!p) {
    block(
      main,
      "Page not found",
      "Choose one of the six projects to inspect its recorded work.",
    );
    main.append(link("Back to projects", "/"));
    return;
  }
  main.append(link("← All projects", "/"));
  const hero = node("section", undefined, "hero");
  hero.append(
    node("small", p.name + " / IN PRACTICE"),
    node("h1", p.copy.title),
    node("p", summaries[p.slug] || p.copy.subtitle),
    node("p", "For " + p.copy.audience.toLowerCase() + "."),
  );
  hero.append(link("Explore the example ↓", "#example", "button"));
  main.append(hero);
  const layout = node("div", undefined, "layout"),
    body = node("div"),
    aside = node("aside");
  layout.append(body, aside);
  main.append(layout);
  aside.append(notice);
  body.append(explorer(p));
  block(body, "The real-world job", p.copy.problem);
  block(body, "A concrete example", p.copy.example);
  const steps = block(body, "How it works", "");
  const ol = node("ol");
  for (const s of p.copy.steps) ol.append(node("li", s));
  steps.append(ol);
  block(
    body,
    "Public facts behind the example",
    p.source.period || p.source.name,
  );
  const table = node("table"),
    tbody = node("tbody");
  for (const r of p.source.rows.slice(0, 12)) {
    const tr = node("tr");
    for (const [k, v] of Object.entries(r)
      .filter(([k]) => !["url", "station_id", "lat", "lon"].includes(k))
      .slice(0, 5)) {
      const td = node("td");
      td.append(
        node("small", k),
        node(
          "span",
          v === null
            ? "Not recorded"
            : typeof v === "object"
              ? JSON.stringify(v)
              : String(v),
        ),
      );
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  const scroll = node("div", undefined, "table-scroll");
  scroll.append(table);
  const raw = node("details");
  raw.append(node("summary", "Inspect the raw source rows"), scroll);
  body.append(raw);
  const src = block(
    body,
    "Source and limits",
    p.source.attribution + " · " + p.source.license,
  );
  src.append(
    link("Original dataset ↗", p.source.url),
    node("p", "Retrieved " + p.source.retrieved_at),
    node("p", p.source.transformation || ""),
    node("p", p.copy.limit),
  );
  block(aside, "What the AI actually does", p.copy.agent);
  aside.append(node("h3", "Inspect recorded results"));
  const evidence = node("details");
  evidence.append(
    node("summary", "Actual saved workflow observations"),
    node("pre", JSON.stringify(p.checks, null, 2)),
  );
  aside.append(evidence);
  if (p.cases.length) {
    aside.append(node("h3", "Named fixture evaluations"));
    const cases = node("div", undefined, "case-list");
    for (const c of p.cases) {
      const row = node("div");
      row.append(
        node("strong", c.scenario + " · " + c.mode),
        node("span", "Expected " + c.expected + " / observed " + c.observed),
        node("small", c.run_id),
      );
      cases.append(row);
    }
    aside.append(cases);
  }
  aside.append(
    link("Download evidence bundle", "/evidence.json", "button"),
    node(
      "p",
      "These are saved local results, not a fresh run or a general benchmark. No custom model training occurred. Production safety, legal compliance and company adoption are not established.",
    ),
  );
}

function explorer(p) {
  const section = node("section", undefined, "data-explorer");
  section.id = "example";
  const titles = {
    switchboard: "The reports being delivered",
    accessproof: "The work your teammates need access to",
    eventmedic: "Find a bike station",
    erasurecheck: "The retail records in the cleanup example",
    importrescue: "Preview the rows before an import",
    economybreaker: "Explore real crafting recipes",
  };
  section.append(
    node("small", "EXPLORE THE REAL SOURCE SNAPSHOT"),
    node("h2", titles[p.slug]),
    node(
      "p",
      "Search the recorded public dataset used by this example. This filters the snapshot in your browser; it does not run a fresh Supabase experiment.",
    ),
  );
  const label = node("label", "Search these records");
  label.htmlFor = "record-search";
  const search = node("input");
  search.id = "record-search";
  search.type = "search";
  search.placeholder =
    p.slug === "eventmedic"
      ? "Try a street or station name"
      : "Search names, SKUs or source IDs";
  section.append(label, search);
  const output = node("p", "", "result-count");
  output.setAttribute("role", "status");
  const cards = node("div", undefined, "record-cards");
  section.append(output, cards);
  const render = () => {
    cards.replaceChildren();
    const matches = p.source.rows.filter((r) =>
      JSON.stringify(r)
        .toLowerCase()
        .includes(search.value.trim().toLowerCase()),
    );
    output.textContent = matches.length + " matching records in this snapshot";
    for (const r of matches.slice(0, 12)) {
      const card = node("article");
      card.append(node("h3", r.name || r.sku || r.id));
      if (p.slug === "eventmedic")
        card.append(
          node("strong", r.bikes + " bikes"),
          node("p", r.docks + " empty docks · recorded availability"),
        );
      else if (p.slug === "switchboard")
        card.append(
          node("strong", "M " + r.magnitude),
          node("p", new Date(r.date).toLocaleString()),
        );
      else if (p.slug === "economybreaker")
        card.append(
          node(
            "strong",
            r.input_units +
              " " +
              r.input +
              " → " +
              r.output_units +
              " " +
              r.name,
          ),
          node(
            "p",
            "Recipe fact only. The concurrent-craft experiment uses a fictional player balance.",
          ),
        );
      else if (p.slug === "importrescue" || p.slug === "erasurecheck") {
        card.append(
          node("strong", "£" + Number(r.unit_price_gbp).toFixed(2) + " / unit"),
          node("p", "SKU " + r.sku + " · quantity " + r.quantity),
        );
        if (p.slug === "importrescue")
          card.append(
            node(
              "p",
              "Recorded line value: £" +
                (Number(r.quantity) * Number(r.unit_price_gbp)).toFixed(2),
            ),
          );
      } else
        card.append(
          node("p", "Public GitHub issue #" + r.id),
          node("p", r.date),
        );
      if (r.url) card.append(link("Open the original record ↗", r.url));
      cards.append(card);
    }
    if (!matches.length)
      cards.append(
        node("p", "No matching records in this snapshot. Try another search."),
      );
  };
  search.addEventListener("input", render);
  render();
  return section;
}

fetch("/evidence.json")
  .then((r) => {
    if (!r.ok) throw Error("Evidence unavailable");
    return r.json();
  })
  .then(display)
  .catch((e) => {
    main.replaceChildren(
      node("h1", "Evidence unavailable"),
      node("p", e.message),
    );
  });
