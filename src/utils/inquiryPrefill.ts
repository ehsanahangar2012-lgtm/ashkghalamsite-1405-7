export interface InquiryPrefillPayload {
  sourceLabel?: string;
  boxType?: string;
  fluteType?: string;
  dimensions?: string;
  quantity?: string;
  notes?: string;
  createdAt?: number;
}

const STORAGE_KEY = 'ashk_inquiry_prefill';

export function saveInquiryPrefill(payload: InquiryPrefillPayload): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...payload, createdAt: Date.now() })
    );
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function consumeInquiryPrefill(): InquiryPrefillPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as InquiryPrefillPayload;
    // Ignore stale prefills older than 30 minutes
    if (parsed.createdAt && Date.now() - parsed.createdAt > 30 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
