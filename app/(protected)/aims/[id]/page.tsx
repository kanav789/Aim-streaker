"use client";

import { use } from "react";
import AimDetailsView from "@/views/aims/details";

type Params = Promise<{ id: string }>;

export default function AimDetailsPage({ params }: { params: Params }) {
  const resolvedParams = use(params);
  return <AimDetailsView aimId={resolvedParams.id} />;
}
