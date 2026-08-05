export interface InteractionRequest {
  id: string;
  businessId: string;
  name: string;
  contact: string;
  message: string;
  createdAt: string;
}

function key(kind: "reservations" | "inquiries"): string {
  return `maum:${kind}`;
}

function load(kind: "reservations" | "inquiries"): InteractionRequest[] {
  try {
    const raw = localStorage.getItem(key(kind));
    return raw ? (JSON.parse(raw) as InteractionRequest[]) : [];
  } catch {
    return [];
  }
}

export function createInteraction(
  kind: "reservations" | "inquiries",
  input: { businessId: string; name: string; contact: string; message: string }
): InteractionRequest {
  const request: InteractionRequest = {
    id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const list = load(kind);
  list.unshift(request);
  localStorage.setItem(key(kind), JSON.stringify(list));
  return request;
}
