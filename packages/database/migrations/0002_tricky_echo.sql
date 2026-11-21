DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;
  END IF;

  UPDATE "users" SET "email_verified_at" = "created_at"
  WHERE "created_at" < '2026-11-18 11:35:00+00'::timestamptz
     OR EXISTS (SELECT 1 FROM "sessions" WHERE "sessions"."user_id" = "users"."id");
END $$;
