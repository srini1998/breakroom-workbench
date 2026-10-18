import AccessProofPage from "../products/accessproof/Page.tsx";
import EventMedicPage from "../products/eventmedic/Page.tsx";
import ErasureCheckPage from "../products/erasurecheck/Page.tsx";
import ImportRescuePage from "../products/importrescue/Page.tsx";
import EconomyBreakerPage from "../products/economybreaker/Page.tsx";
import type { ProductProps } from "./products.ts";
const pages: Record<string, React.ComponentType<ProductProps>> = {
  AccessProof: AccessProofPage,
  EventMedic: EventMedicPage,
  ErasureCheck: ErasureCheckPage,
  ImportRescue: ImportRescuePage,
  EconomyBreaker: EconomyBreakerPage,
};
export default function ProductPage({
  name,
  ...props
}: ProductProps & { name: string }) {
  const Page = pages[name];
  return Page ? <Page {...props} /> : null;
}
