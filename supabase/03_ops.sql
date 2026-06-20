-- ============================================================================
-- Backpackers Backoffice — Operations module bootstrap
-- ============================================================================
-- Run AFTER supabase/02_crm.sql, ONCE in Supabase SQL Editor.
-- Adds events, projects, tasks + enums + indexes + updated_at triggers + RLS.
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.event_type AS ENUM ('tour', 'team_building', 'workshop', 'meeting', 'retreat', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('planned', 'active', 'on_hold', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'doing', 'blocked', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  pillar_id          uuid NOT NULL,
  type               public.event_type NOT NULL DEFAULT 'other',
  status             public.event_status NOT NULL DEFAULT 'draft',
  name               text NOT NULL,
  description        text,
  location           text,
  start_at           timestamp with time zone,
  end_at             timestamp with time zone,
  capacity           integer,
  attendees_count    integer NOT NULL DEFAULT 0,
  client_contact_id  uuid,
  owner_id           uuid,
  tags               text[] NOT NULL DEFAULT '{}'::text[],
  notes              text,
  created_at         timestamp with time zone DEFAULT now() NOT NULL,
  updated_at         timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.projects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  pillar_id         uuid NOT NULL,
  status            public.project_status NOT NULL DEFAULT 'planned',
  name              text NOT NULL,
  description       text,
  client_contact_id uuid,
  owner_id          uuid,
  start_date        date,
  target_date       date,
  tags              text[] NOT NULL DEFAULT '{}'::text[],
  notes             text,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  updated_at        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  pillar_id     uuid NOT NULL,
  project_id    uuid,
  event_id      uuid,
  status        public.task_status NOT NULL DEFAULT 'todo',
  priority      public.task_priority NOT NULL DEFAULT 'normal',
  title         text NOT NULL,
  description   text,
  assignee_id   uuid,
  due_date      date,
  completed_at  timestamp with time zone,
  created_at    timestamp with time zone DEFAULT now() NOT NULL,
  updated_at    timestamp with time zone DEFAULT now() NOT NULL
);


-- ---------------------------------------------------------------------------
-- 3. Foreign keys
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE public.events ADD CONSTRAINT events_pillar_id_fk
    FOREIGN KEY (pillar_id) REFERENCES public.pillars(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.events ADD CONSTRAINT events_owner_id_fk
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.events ADD CONSTRAINT events_client_contact_id_fk
    FOREIGN KEY (client_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT projects_pillar_id_fk
    FOREIGN KEY (pillar_id) REFERENCES public.pillars(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT projects_owner_id_fk
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT projects_client_contact_id_fk
    FOREIGN KEY (client_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_pillar_id_fk
    FOREIGN KEY (pillar_id) REFERENCES public.pillars(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fk
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_event_id_fk
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_id_fk
    FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS events_pillar_idx          ON public.events USING btree (pillar_id);
CREATE INDEX IF NOT EXISTS events_status_idx          ON public.events USING btree (status);
CREATE INDEX IF NOT EXISTS events_type_idx            ON public.events USING btree (type);
CREATE INDEX IF NOT EXISTS events_start_at_idx        ON public.events USING btree (start_at);
CREATE INDEX IF NOT EXISTS events_owner_idx           ON public.events USING btree (owner_id);
CREATE INDEX IF NOT EXISTS events_client_contact_idx  ON public.events USING btree (client_contact_id);

CREATE INDEX IF NOT EXISTS projects_pillar_idx        ON public.projects USING btree (pillar_id);
CREATE INDEX IF NOT EXISTS projects_status_idx        ON public.projects USING btree (status);
CREATE INDEX IF NOT EXISTS projects_owner_idx         ON public.projects USING btree (owner_id);
CREATE INDEX IF NOT EXISTS projects_target_date_idx   ON public.projects USING btree (target_date);

CREATE INDEX IF NOT EXISTS tasks_pillar_idx           ON public.tasks USING btree (pillar_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx           ON public.tasks USING btree (status);
CREATE INDEX IF NOT EXISTS tasks_project_idx          ON public.tasks USING btree (project_id);
CREATE INDEX IF NOT EXISTS tasks_event_idx            ON public.tasks USING btree (event_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx         ON public.tasks USING btree (assignee_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx         ON public.tasks USING btree (due_date);


-- ---------------------------------------------------------------------------
-- 5. Updated_at triggers (reuse set_updated_at() from 02_crm.sql)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS projects_set_updated_at ON public.projects;
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 6. Row Level Security (same pattern as contacts: admin_grupo full, admin_pilar own pilares, member read-only)
-- ---------------------------------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ----- events -----

DROP POLICY IF EXISTS events_all_admin_grupo ON public.events;
CREATE POLICY events_all_admin_grupo ON public.events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'));

DROP POLICY IF EXISTS events_all_admin_pilar ON public.events;
CREATE POLICY events_all_admin_pilar ON public.events
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND events.pillar_id = ANY (p.pillar_access))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND events.pillar_id = ANY (p.pillar_access))
  );

DROP POLICY IF EXISTS events_select_member ON public.events;
CREATE POLICY events_select_member ON public.events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'member'
        AND events.pillar_id = ANY (p.pillar_access))
  );

-- ----- projects -----

DROP POLICY IF EXISTS projects_all_admin_grupo ON public.projects;
CREATE POLICY projects_all_admin_grupo ON public.projects
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'));

DROP POLICY IF EXISTS projects_all_admin_pilar ON public.projects;
CREATE POLICY projects_all_admin_pilar ON public.projects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND projects.pillar_id = ANY (p.pillar_access))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND projects.pillar_id = ANY (p.pillar_access))
  );

DROP POLICY IF EXISTS projects_select_member ON public.projects;
CREATE POLICY projects_select_member ON public.projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'member'
        AND projects.pillar_id = ANY (p.pillar_access))
  );

-- ----- tasks -----
-- Tasks: members can also UPDATE tasks where they are the assignee (mark as done etc).

DROP POLICY IF EXISTS tasks_all_admin_grupo ON public.tasks;
CREATE POLICY tasks_all_admin_grupo ON public.tasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'));

DROP POLICY IF EXISTS tasks_all_admin_pilar ON public.tasks;
CREATE POLICY tasks_all_admin_pilar ON public.tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND tasks.pillar_id = ANY (p.pillar_access))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND tasks.pillar_id = ANY (p.pillar_access))
  );

DROP POLICY IF EXISTS tasks_select_member ON public.tasks;
CREATE POLICY tasks_select_member ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'member'
        AND tasks.pillar_id = ANY (p.pillar_access))
  );

DROP POLICY IF EXISTS tasks_update_assignee ON public.tasks;
CREATE POLICY tasks_update_assignee ON public.tasks
  FOR UPDATE TO authenticated
  USING (tasks.assignee_id = auth.uid())
  WITH CHECK (tasks.assignee_id = auth.uid());


-- ============================================================================
-- Done. Verify:
--   - Database -> Tables: events, projects, tasks
--   - Authentication -> Policies: events (3), projects (3), tasks (4)
-- ============================================================================
