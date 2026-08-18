-- uuid-ossp was installed but never used anywhere in the schema —
-- uuid_generate_v4() (or any of its other functions) appears in no
-- migration; gen_random_uuid() (pgcrypto) is the only UUID strategy
-- actually wired up as a column default across every table. Verified
-- via pg_depend before dropping: every dependency on this extension is
-- its own internal functions (deptype 'e'), nothing external references
-- it, so this is a clean removal with zero blast radius.
drop extension if exists "uuid-ossp";
