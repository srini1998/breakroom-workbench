import {
  ArrowUpRight,
  ShieldCheck,
  Radio,
  ScanLine,
  FileInput,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { products } from "./products.ts";
const icons = [ShieldCheck, Radio, ScanLine, FileInput, Boxes];
export default function HomePage({
  navigate,
  storageAvailable,
}: {
  navigate: (url: string) => void;
  storageAvailable: boolean;
}) {
  return (
    <>
      <section className="hub-heading">
        <div className="eyebrow">WELCOME TO BREAKROOM</div>
        <h1>
          Real problems.
          <br />
          Useful tools.
        </h1>
        <p>
          See what each product does through practical workflows and attributed
          public datasets. Open the engineering workbench when you want to
          inspect the agents and verification.
        </p>
        <div className="hub-context">
          <span>Practical workflows</span>
          <span>Real public datasets</span>
          <span>Agent workbenches on the side</span>
        </div>
      </section>
      <section className="product-directory" aria-label="Verification products">
        <a
          className="product-entry switchboard-feature"
          href="/switchboard"
          onClick={(e) => {
            e.preventDefault();
            navigate("/switchboard");
          }}
        >
          <span className="product-index">FEATURED / SWITCHBOARD</span>
          <div className="product-entry-icon">
            <Radio size={23} />
          </div>
          <div className="product-entry-copy">
            <span className="eyebrow">REALTIME TRANSITION</span>
            <h2>Switchboard</h2>
            <p>
              Will your live updates reach the right people? Try a real public
              earthquake feed and check delivery before changing the route.
            </p>
            <small>
              Actual USGS observations · real Supabase delivery · recorded,
              inspectable results
            </small>
          </div>
          <ArrowUpRight size={22} />
        </a>
        {products.map((p, i) => {
          const Icon = icons[i];
          return (
            <a
              className="product-entry"
              key={p.slug}
              data-lab={p.slug}
              href={"/" + p.slug}
              onClick={(e) => {
                e.preventDefault();
                navigate("/" + p.slug);
              }}
            >
              <span className="product-index">LAB {p.number}</span>
              <div className="product-entry-icon">
                <span className="lab-orbit" />
                <Icon size={23} />
              </div>
              <div className="product-entry-copy">
                <span className="eyebrow">{p.category}</span>
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <small>{p.workflow}</small>
                {p.slug === "erasurecheck" && !storageAvailable && (
                  <span className="service-required">
                    Real local Storage setup required
                  </span>
                )}
              </div>
              <ArrowUpRight className="product-entry-arrow" size={22} />
            </a>
          );
        })}
      </section>
      <a
        className="product-fit-link"
        href="/product-fit"
        onClick={(e) => {
          e.preventDefault();
          navigate("/product-fit");
        }}
      >
        <span>
          <strong>Could these become useful Supabase tooling?</strong>
          <small>
            Facts, product fit and a working permission-regression CLI.
          </small>
        </span>
        <ArrowUpRight size={22} />
      </a>
      <div className="hub-principle">
        <ShieldCheck size={22} />
        <div>
          <h2>Results you can follow back to the action.</h2>
          <p>
            Every run separates execution status from verdict, preserves its
            observations, and names the limits of what was tested.
          </p>
        </div>
      </div>
    </>
  );
}
