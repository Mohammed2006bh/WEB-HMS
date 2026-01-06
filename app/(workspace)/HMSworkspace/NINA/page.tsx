import { Suspense } from "react";
import NinaWorkspaceClient from "./NinaWorkspaceClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading NINA…</div>}>
      <NinaWorkspaceClient />
    </Suspense>
  );
}
