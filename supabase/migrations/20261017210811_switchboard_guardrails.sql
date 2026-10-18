create unique index switch_one_active_workspace on switch_runs(workspace_id) where status in ('queued','running');
