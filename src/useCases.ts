export const useCases: Record<
  string,
  {
    title: string;
    subtitle: string;
    audience: string;
    problem: string;
    agent: string;
    example: string;
    steps: string[];
    limit: string;
  }
> = {
  accessproof: {
    title: "Give each teammate the right view.",
    subtitle: "A shared work desk, without sharing everything.",
    audience:
      "Teams building customer portals, agency workspaces or internal tools",
    problem:
      "A teammate needs one project, a contractor needs one assigned item, and another client’s records must stay private. A policy that looks sensible can still expose the wrong row.",
    agent:
      "The verification agent signs in as supported test roles, tries bounded reads and changes, and compares what happened with the permission rules. It reports a specific forbidden action that succeeded; it does not infer who should have access.",
    example:
      "An agency has two clients. A member can read their own client’s work. A contractor sees only the assigned issue. Neither may open the other client’s work; only the owner may update the local copy.",
    steps: [
      "Import public issue titles into two example teams.",
      "Preview a colleague’s view and ask the server whether an action is allowed.",
      "Use the technical workbench to exercise real Auth identities and database policies.",
    ],
    limit:
      "Issue titles are real public records. Team assignments and colleague roles are fictional examples. This role preview is not an authentication system; actual Supabase policy tests are in the workbench.",
  },
  eventmedic: {
    title: "One ride. One inventory change.",
    subtitle: "Recover messy deliveries without losing track of the bikes.",
    audience:
      "Rental platforms, booking systems and event-driven inventory apps",
    problem:
      "A checkout message arrives twice, a return arrives first, or a worker stops after saving a change. Counting every delivery as a new event quietly corrupts the number of available items.",
    agent:
      "The verification agent inspects pending operations and saved receipts, delivers supported events in an order that respects dependencies, then checks stock. A durable receipt makes a repeated delivery safe.",
    example:
      "A rental station starts with the number of bikes in a real Citi Bike snapshot. A local checkout removes one bike. Sending that same request again must not remove a second bike. Returning it restores one bike.",
    steps: [
      "Choose a station with a real recorded availability count.",
      "Create a local checkout, resend it and return the bike.",
      "Read the resulting availability and saved receipt; use the lab for interrupted/reordered scenarios.",
    ],
    limit:
      "Station names and starting availability are real observations at the stated time. Your clicks simulate rides in this local app; they never reserve bikes or change Citi Bike.",
  },
  erasurecheck: {
    title: "Close an account. Keep it closed.",
    subtitle: "Check the files and jobs a delete button can miss.",
    audience: "Apps with user uploads, generated exports and background jobs",
    problem:
      "Deleting a profile row can leave files behind. Worse, a queued export can recreate deleted data. Shared team files and other accounts must survive the cleanup.",
    agent:
      "The verification agent inventories supported owned resources and proposes an exact plan. After your approval, a worker deletes owned data and tries releasing delayed work. Independent checks confirm what remains.",
    example:
      "An example shopper has a profile, an attachment and an export referencing real public retail product names. Closing the fictional account should remove its owned records and files, stop the delayed export and preserve the shared handover file.",
    steps: [
      "Create a fictional account and real local Storage resources.",
      "Review exactly which resources will be deleted or preserved.",
      "Approve the displayed plan and inspect actual deletion and delayed-job checks.",
    ],
    limit:
      "The account is synthetic. Public product names are not customer data. This checks supported live resources; it is not a GDPR certification, backup audit or deletion of a real person’s account.",
  },
  importrescue: {
    title: "Turn a spreadsheet into usable records.",
    subtitle: "Catch the mistakes before they reach your ledger.",
    audience:
      "Retail operations, inventory teams and developers importing supplier files",
    problem:
      "Files arrive with different column names, repeated lines and quantities that are not safe to import. A half-imported batch or a repeated upload can double the numbers.",
    agent:
      "The verification agent inspects the supported file and declared conversion facts, proposes a mapping and dry-runs the whole batch. It asks for exact approval before the worker commits supported stock changes. Unknown facts cause rejection.",
    example:
      "Import a small real historical sales sample from UCI into a local sales ledger. Map SKU, quantity and source-row columns, review the totals, then commit once. Uploading the same rows again must not duplicate them.",
    steps: [
      "Load the real historical CSV or upload a bounded file using its catalog.",
      "Map the columns and preview every accepted line and unit total.",
      "Approve the exact staged batch; repeated source rows are deduplicated or rejected on conflict.",
    ],
    limit:
      "The public sample records sales in 2010–2011, not current supplier deliveries. This practical page imports a local sales ledger; the workbench separately tests supported inventory pack conversions. Customer and invoice identifiers are excluded.",
  },
  economybreaker: {
    title: "Keep a crafting race from creating wealth.",
    subtitle:
      "Make game inventory obey the rules, even under simultaneous requests.",
    audience: "Game backends, crafting systems and virtual-item economies",
    problem:
      "Two crafting requests can both spend the same ingredients. A retried request can mint another item. A transfer that stops halfway can leave the economy richer or poorer.",
    agent:
      "The verification agent coordinates bounded withdrawal, craft and transfer traces, checks conserved inventory value, reduces a failing trace, and runs the same trace against a correction. It cannot change the expected recipe or certify an entire game.",
    example:
      "The real Minetest Game rule needs nine steel ingots for one steel block. Start a fictional player with nine ingots and send two craft requests together. Only one can succeed. A replay must not make a second block.",
    steps: [
      "Use a recipe fact from a pinned open-source game revision.",
      "Launch two real concurrent local requests against the same saved inventory.",
      "Check that value is conserved, retry a receipt and transfer the crafted item atomically.",
    ],
    limit:
      "Recipe facts are real. Player balances and actions are authored examples. This is not live player telemetry, real money, or proof that every game mechanic is safe.",
  },
};
