export type TrialLibraryData = {
	readings: { id: string; product_id: string; created_at: string; version?: string }[];
	unavailable: boolean;
	pagination?: { before: string | null; next: string | null; expired: boolean };
};

export const TRIAL_LIBRARY_PAGE_SIZE = 50;
