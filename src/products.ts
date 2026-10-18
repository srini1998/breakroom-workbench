export const products = [
  {
    name: "AccessProof",
    slug: "accessproof",
    number: "01",
    category: "ACCESS CONTROL",
    headline: "Test the boundaries of trust.",
    description:
      "Give colleagues the right view of shared work, and catch permissions that expose another team’s records.",
    workflow:
      "Choose identity → probe permission → inspect evidence → test correction",
    endpoint: "probe_access",
  },
  {
    name: "EventMedic",
    slug: "eventmedic",
    number: "02",
    category: "EVENT RELIABILITY",
    headline: "Recover the stream. Preserve the truth.",
    description:
      "Keep rental availability correct when checkout and return messages repeat or arrive late.",
    workflow:
      "Inspect ledger → recover dependencies → reconcile receipts → verify stock",
    endpoint: "recover_events",
  },
  {
    name: "ErasureCheck",
    slug: "erasurecheck",
    number: "03",
    category: "RESOURCE LIFECYCLE",
    headline: "Verify what deletion leaves behind.",
    description:
      "Close an account without leaving its files behind or letting a delayed export recreate them.",
    workflow:
      "Enumerate resources → approve exact scope → erase → release delayed export",
    endpoint: "verify_erasure",
  },
  {
    name: "ImportRescue",
    slug: "importrescue",
    number: "04",
    category: "DATA INTEGRITY",
    headline: "Turn supplier files into trusted stock.",
    description:
      "Review messy CSV rows before they enter your records, and prevent repeated files from doubling the totals.",
    workflow:
      "Inspect supplier sample → dry-run mapping → review stock diff → approve commit",
    endpoint: "dry_run_import",
  },
  {
    name: "EconomyBreaker",
    slug: "economybreaker",
    number: "05",
    category: "CONCURRENCY TESTING",
    headline: "Make the race reproducible.",
    description:
      "Stop simultaneous crafting requests and retried transfers from creating extra virtual items.",
    workflow:
      "Select exploit → coordinate actions → inspect conservation → replay correction",
    endpoint: "verify_economy",
  },
] as const;
export type ProductProps = {
  onImport?: (source: {
    csv: string;
    mapping: {
      version: 1;
      sku: string;
      quantity: string;
      unit: string;
      unit_column: string | null;
      receipt: string;
      pack_version: number;
    };
  }) => void;
  scenario: string;
  onScenario: (value: string) => void;
};
