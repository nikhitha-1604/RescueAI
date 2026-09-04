export const LAST_SESSION_KEY = "rescueai:last-session";

export type StoredSession = {
  checkoutId: number;
  amount: number;
  customerName: string;
  analysis?: {
    probability: number;
    riskLevel: string;
    likelyReason: string;
    usedFallback: boolean;
    aiNotice?: string;
  };
  decision?: {
    action: string;
    title: string;
    reason: string;
    usedFallback: boolean;
    aiNotice?: string;
  };
  guardrailsPassed?: boolean;
  rescued?: boolean;
  stopReason?: string;
  timeline?: { label: string }[];
};

export function saveLastSession(data: StoredSession) {
  sessionStorage.setItem(LAST_SESSION_KEY, JSON.stringify(data));
}

export function readLastSession(): StoredSession | null {
  const raw = sessionStorage.getItem(LAST_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}
