-- Forward fix: stop collection, retain owner inspection/revocation and all source readings.
update public.atv_trial_continuity_policy set collection_enabled = false where singleton;
