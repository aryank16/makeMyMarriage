-- Collapse the seven roles to ADMIN and MANAGER.
--
-- Written by hand rather than generated: a generated diff would drop and
-- recreate the enum, which fails while rows still hold the old values. The
-- USING clause maps every existing membership as it converts.
--
-- OWNER and COUPLE ran the wedding, so they become ADMIN. Everyone else
-- becomes MANAGER, which can do all the planning but cannot invite, remove
-- or promote organizers. This widens what a former VIEWER or CONTRIBUTOR
-- may do; there is no narrower role left to map them to.

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MANAGER');

ALTER TABLE "Membership"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (CASE WHEN "role"::text IN ('OWNER', 'COUPLE') THEN 'ADMIN' ELSE 'MANAGER' END)::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
