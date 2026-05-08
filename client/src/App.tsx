import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";

function Home() {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((body) => setData(JSON.stringify(body)))
      .catch((err) => setData(String(err)));
  }, []);

  return <pre>{data ?? "Loading..."}</pre>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
