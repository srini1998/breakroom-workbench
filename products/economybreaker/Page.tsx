import { Boxes } from "lucide-react";
import type { ProductProps } from "../../src/products.ts";
export default function EconomyBreakerPage({
  scenario,
  onScenario,
}: ProductProps) {
  return (
    <section className="product-domain">
      <div className="domain-heading">
        <Boxes size={18} />
        <div>
          <h2>Inventory simulation</h2>
          <p>
            Choose a supported action trace. Each defective variant is tested
            alongside its correction.
          </p>
        </div>
      </div>
      <div className="trace-options">
        {[
          {
            id: "withdrawal",
            name: "Shared chest",
            text: "Two players read the same item before either withdraws.",
          },
          {
            id: "craft",
            name: "Craft retry",
            text: "Two deliveries carry the same business operation ID.",
          },
          {
            id: "transfer",
            name: "Interrupted transfer",
            text: "Failure occurs after credit, before debit commits.",
          },
        ].map((t) => (
          <button
            key={t.id}
            className={scenario === t.id ? "selected" : ""}
            onClick={() => onScenario(t.id)}
          >
            <strong>{t.name}</strong>
            <span>{t.text}</span>
          </button>
        ))}
      </div>
      <div className="domain-foot">
        Authoritative database state · coordinated request barrier · recipe: 2
        ore → 1 ingot · weighted material must remain 5
      </div>
    </section>
  );
}
