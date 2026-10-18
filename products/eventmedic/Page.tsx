import { Radio, ArrowRight } from "lucide-react";
import type { ProductProps } from "../../src/products.ts";
export default function EventMedicPage({ scenario }: ProductProps) {
  const sequence =
    scenario === "reordered"
      ? ["Return received", "Checkout received", "Dependency replay"]
      : scenario === "interrupted"
        ? ["Checkout commits", "Acknowledgement lost", "Receipt reconciled"]
        : scenario === "duplicate"
          ? [
              "Checkout received",
              "Checkout redelivered",
              "Duplicate suppressed",
            ]
          : ["Checkout received", "Return received", "Stock restored"];
  return (
    <section className="product-domain">
      <div className="domain-heading">
        <Radio size={18} />
        <div>
          <h2>Rental event laboratory</h2>
          <p>
            Declared fixture sequence. The run records the actual ledger and
            recovery history.
          </p>
        </div>
      </div>
      <div className="event-sequence">
        {sequence.map((s, i) => (
          <div key={s}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{s}</strong>
            {i < sequence.length - 1 && <ArrowRight size={17} />}
          </div>
        ))}
      </div>
      <div className="domain-foot">
        Initial stock: 4 · one checkout and one return · unique operation
        receipts · append-only delivery history
      </div>
    </section>
  );
}
