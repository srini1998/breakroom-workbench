import { Download, ArrowRight, ShieldCheck } from "lucide-react";
export default function ProductFit() {
  return (
    <div className="product-fit">
      <section className="purpose-lead">
        <span className="eyebrow">
          PRODUCT FIT / AN EVIDENCE-BASED ASSESSMENT
        </span>
        <h1>
          A useful contribution starts
          <br />
          with a specific customer problem.
        </h1>
        <p>
          These tools could become open-source examples, integrations or product
          features. They are not drop-in Supabase features today, and there is
          no evidence that Supabase has requested or approved them.
        </p>
      </section>
      <section className="plain-explainer">
        <h2>What already exists?</h2>
        <p>
          Supabase already offers{" "}
          <a
            href="https://supabase.com/docs/guides/observability/advisors"
            target="_blank"
            rel="noreferrer"
          >
            Advisors
          </a>{" "}
          for database health/security/performance,{" "}
          <a
            href="https://supabase.com/docs/guides/realtime/reports"
            target="_blank"
            rel="noreferrer"
          >
            Realtime reports
          </a>
          ,{" "}
          <a
            href="https://supabase.com/docs/guides/database/testing"
            target="_blank"
            rel="noreferrer"
          >
            database tests
          </a>
          , an{" "}
          <a
            href="https://supabase.com/docs/guides/ai-tools/mcp"
            target="_blank"
            rel="noreferrer"
          >
            MCP interface
          </a>{" "}
          and{" "}
          <a
            href="https://supabase.com/docs/guides/deployment/branching"
            target="_blank"
            rel="noreferrer"
          >
            isolated preview environments
          </a>
          . Repackaging these as a generic AI monitoring dashboard would not
          establish a new need.
        </p>
        <p>
          Our assessment: verifying an application’s declared behavior before
          and after a change is a stronger focus. A successful SQL migration
          does not by itself demonstrate that the intended users can still
          perform their jobs. This is a product hypothesis to validate with
          developers and maintainers, not a claim that existing tools cannot
          test behavior.
        </p>
      </section>
      <section className="customer-scene">
        <span className="eyebrow">
          WORKING LOCAL PROTOTYPE / POLICY PASSPORT
        </span>
        <h2>“Will this permission change expose another team’s records?”</h2>
        <p>
          Declare what each role should be able to do. Run the same role/action
          checks against a baseline and a reviewed candidate, through real local
          Supabase Auth and RLS. See exactly which permissions changed, and fail
          a CI check if the candidate breaks the contract.
        </p>
        <div className="example-columns">
          <div>
            <h3>1. Declare intent</h3>
            <p>
              A small JSON contract says which supported actions owners, members
              and contractors may perform. The model does not invent the
              permission rules.
            </p>
          </div>
          <div>
            <h3>2. Measure behavior</h3>
            <p>
              The executable CLI uses a fresh isolated local fixture per probe.
              It compares actual observed access, not policy text or a model’s
              assurance.
            </p>
          </div>
          <div>
            <h3>3. Review the difference</h3>
            <p>
              The JSON report identifies an allow/deny change, the identity
              involved and the contract violation. A failing candidate exits
              with code 1 for CI.
            </p>
          </div>
        </div>
        <div className="business-actions">
          <a className="button primary" href="/api/product-fit/contract">
            <Download size={16} /> Download the tested starter contract
          </a>
          <a className="button" href="/api/product-fit/example">
            <Download size={16} /> Download an actual seeded-failure report
          </a>
        </div>
        <div className="command-example">
          <span>Run in this repository after local Supabase setup</span>
          <pre>
            npm run preflight -- --candidate=clean{`\n`}npm run preflight --
            --candidate=candidate-1
          </pre>
          <p>
            The second command deliberately tests a seeded tenant-read defect
            and should exit 1. Templates are reviewed local fixtures; this CLI
            does not connect to arbitrary customer schemas or run generated
            migrations.
          </p>
        </div>
        <div className="business-outcome">
          <ShieldCheck size={20} />
          <p>
            A realistic path: ship this as a small developer tool, make the
            contract format usable outside the demo, add a documented adapter to
            disposable preview environments, gather feedback, and contribute a
            focused test or integration upstream. A native Supabase feature
            would require their review, demand evidence and substantial
            hardening.
          </p>
        </div>
      </section>
      <section className="plain-explainer">
        <h2>Where each current project fits</h2>
        <div className="business-table">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Credible customer value</th>
                <th>Realistic first packaging</th>
                <th>What is still missing</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Switchboard",
                  "Check a supported Realtime transport change preserves recipients and delivery objectives.",
                  "A Realtime transition verification CLI or runnable guide.",
                  "Customer-owned adapters, hosted parity, larger workloads and repeatability.",
                ],
                [
                  "AccessProof",
                  "Catch a permission regression with known identities and expected actions.",
                  "A declared-contract test generator / CI companion.",
                  "Arbitrary-schema adapters and developer-supplied representative fixtures.",
                ],
                [
                  "EventMedic",
                  "Prevent retries and interruptions from counting the same business operation twice.",
                  "An idempotent worker/outbox reference implementation.",
                  "Integration with a customer’s events, ordering and retention requirements.",
                ],
                [
                  "ErasureCheck",
                  "Find owned files and stop delayed jobs recreating supported deleted resources.",
                  "An app-lifecycle recipe with explicit ownership contracts.",
                  "Application-specific ownership maps, backup/legal requirements and operational review.",
                ],
                [
                  "ImportRescue",
                  "Preview a file, reject ambiguous facts and commit a supported batch once.",
                  "An import workflow example or separate vertical application.",
                  "Customer catalogs, units, approvals and recovery requirements.",
                ],
                [
                  "EconomyBreaker",
                  "Reproduce double spending and verify a transaction preserves an inventory rule.",
                  "A game-backend concurrency testing kit.",
                  "Real game rules, workloads and exploit coverage.",
                ],
              ].map((r) => (
                <tr key={r[0]}>
                  {r.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>What would make it compelling?</h3>
        <p>
          A developer can reproduce a real problem, declare the expected
          behavior, see a failing case, apply a focused correction, and keep an
          executable regression test. A second developer can repeat it. That is
          stronger evidence than a dramatic website or an unsupported claim that
          a company will adopt it.
        </p>
        <p>
          We cannot know that a project will “blow their mind,” become part of
          Supabase, or lead to a job. The useful test is whether real users find
          the workflow valuable, whether maintainers can review it, and whether
          its measurements remain honest under failures.
        </p>
      </section>
    </div>
  );
}
