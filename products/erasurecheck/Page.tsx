import { ScanLine, LockKeyhole } from "lucide-react";
export default function ErasureCheckPage() {
  return (
    <section className="product-domain">
      <div className="domain-heading">
        <ScanLine size={18} />
        <div>
          <h2>Declared ownership graph</h2>
          <p>
            The exact cleanup plan is reviewable before the worker mutates
            resources.
          </p>
        </div>
      </div>
      <div className="resource-grid">
        <div>
          <span>OWNED</span>
          <strong>Profile → attachment → export</strong>
          <p>Remove owned rows and real Storage objects.</p>
        </div>
        <div>
          <span>PENDING WORK</span>
          <strong>Delayed export / epoch 0</strong>
          <p>A locked account tombstone fences stale work.</p>
        </div>
        <div>
          <span>CONTROL DATA</span>
          <strong>Other tenant & shared resource</strong>
          <p>Preserve control content; detach shared ownership.</p>
        </div>
      </div>
      <div className="domain-foot">
        <LockKeyhole size={12} /> Live controlled resources only. Backups and
        legal compliance are outside the tested scope.
      </div>
    </section>
  );
}
