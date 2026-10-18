import { useState } from "react";
import { FileInput, Upload, ArrowRight } from "lucide-react";
import type { ProductProps } from "../../src/products.ts";
export default function ImportRescuePage({ scenario, onImport }: ProductProps) {
  const [csv, setCsv] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const [mapping, setMapping] = useState({
    version: 1 as const,
    sku: "sku",
    quantity: "units",
    unit: "each",
    unit_column: null as string | null,
    receipt: "receipt",
    pack_version: 1,
  });
  const boxed = scenario === "supplier-b" || scenario === "supplier-c";
  return (
    <>
      <section className="product-domain">
        <div className="domain-heading">
          <FileInput size={18} />
          <div>
            <h2>Supplier mapping desk</h2>
            <p>
              Declared facts bind the file, mapping, pack version, and staged
              changes.
            </p>
          </div>
        </div>
        <div className="mapping-preview">
          <div>
            <span>SUPPLIER FIELD</span>
            <strong>
              {scenario === "supplier-b"
                ? "part"
                : scenario === "supplier-c" || scenario === "missing-pack"
                  ? "item"
                  : "sku"}
            </strong>
            <small>Catalog identifier</small>
          </div>
          <b>→</b>
          <div>
            <span>CANONICAL PART</span>
            <strong>BOLT / NUT</strong>
            <small>R-1: 12 bolts · R-2: 6 nuts</small>
          </div>
          <b>×</b>
          <div>
            <span>DECLARED CONVERSION</span>
            <strong>
              {scenario === "missing-pack"
                ? "Unknown → abstain"
                : boxed
                  ? "1 box = 6 each"
                  : "1 unit = 1 each"}
            </strong>
            <small>Sandbox pack definitions / version 1</small>
          </div>
        </div>
        <div className="domain-foot">
          Whole-batch staging · conflicting receipts rejected · replay cannot
          double stock
        </div>
      </section>
      <details className="upload-desk">
        <summary>
          <Upload size={16} /> Try a CSV of your own{" "}
          <span>64 KiB maximum / sandbox stock only</span>
        </summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!csv) {
              setError("Choose a CSV first");
              return;
            }
            onImport?.({ csv, mapping });
          }}
        >
          <p>
            Your file is checked against the BOLT/NUT catalog and purchase
            receipts above. Unknown products, receipts, or pack conversions are
            rejected. The file and exact stock diff appear for review before
            commit.
          </p>
          <label>
            Supplier CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 65536) {
                  setError("CSV must be at most 64 KiB");
                  return;
                }
                setError("");
                setName(f.name);
                void f
                  .text()
                  .then(setCsv)
                  .catch(() => setError("File could not be read"));
              }}
            />
          </label>
          {name && (
            <span className="file-name">
              {name} · {new Blob([csv]).size} bytes
            </span>
          )}
          <div className="mapping-fields">
            {[
              { key: "sku", label: "Part ID column" },
              { key: "quantity", label: "Quantity column" },
              { key: "receipt", label: "Receipt column" },
            ].map((f) => (
              <label key={f.key}>
                {f.label}
                <input
                  maxLength={64}
                  required
                  value={mapping[f.key as "sku" | "quantity" | "receipt"]}
                  onChange={(e) =>
                    setMapping({ ...mapping, [f.key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Default unit
              <select
                value={mapping.unit}
                onChange={(e) =>
                  setMapping({ ...mapping, unit: e.target.value })
                }
              >
                <option value="each">each</option>
                <option value="box">box</option>
                <option value="pallet">pallet (not defined)</option>
              </select>
            </label>
            <label>
              Unit column (optional)
              <input
                maxLength={64}
                value={mapping.unit_column || ""}
                onChange={(e) =>
                  setMapping({
                    ...mapping,
                    unit_column: e.target.value || null,
                  })
                }
              />
            </label>
          </div>
          {csv && (
            <details>
              <summary>Preview untrusted file content</summary>
              <pre>{csv.split(/\r?\n/).slice(0, 11).join("\n")}</pre>
            </details>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={!csv}>
            Stage uploaded CSV <ArrowRight size={14} />
          </button>
        </form>
      </details>
    </>
  );
}
