import { useEffect, useState } from "react";
export function usePublicData(id: string) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    fetch("/api/product-data/" + id)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "Dataset unavailable");
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return { data, error };
}
export function DataSource({ data }: { data: any }) {
  return (
    <details className="source-note">
      <summary>
        Real data · {data.name} · retrieved{" "}
        {new Date(data.retrieved_at).toLocaleString()}
      </summary>
      <p>{data.period}</p>
      <p>{data.transformation}</p>
      <p>
        {data.attribution} · {data.license}
      </p>
      <a href={data.url} target="_blank" rel="noreferrer">
        Original source ↗
      </a>
      <small>Snapshot SHA256 {data.content_hash}</small>
    </details>
  );
}
export default function RealData({
  id,
  children,
}: {
  id: string;
  children: (data: any) => React.ReactNode;
}) {
  const { data, error } = usePublicData(id);
  return error ? (
    <p role="alert" className="error-banner">
      Public dataset unavailable: {error}. Technical tools remain available.
    </p>
  ) : data ? (
    <>
      {children(data)}
      <DataSource data={data} />
    </>
  ) : (
    <div className="data-loading" role="status">
      Loading the recorded public dataset…
    </div>
  );
}
