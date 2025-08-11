

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_order"("order_id" "uuid", "driver_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  driver_internal_id uuid;
BEGIN
  -- 1. Cari ID internal driver dari tabel 'drivers' berdasarkan user_id-nya
  SELECT id INTO driver_internal_id FROM public.drivers WHERE user_id = driver_user_id;

  -- 2. Lakukan UPDATE pada tabel 'orders' dengan hak akses penuh
  IF driver_internal_id IS NOT NULL THEN
    UPDATE public.orders
    SET
      driver_id = driver_internal_id,
      status = 'accepted'
    WHERE
      id = order_id AND status = 'pending' AND driver_id IS NULL;
  END IF;
END;
$$;


ALTER FUNCTION "public"."accept_order"("order_id" "uuid", "driver_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_driver_on_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  IF NEW.role = 'driver' AND OLD.role != 'driver' THEN
    INSERT INTO drivers (user_id, status)
    VALUES (NEW.id, 'offline')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role != 'driver' AND OLD.role = 'driver' THEN
    DELETE FROM drivers WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."create_driver_on_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_overview"() RETURNS TABLE("total_users" bigint, "total_drivers" bigint, "active_drivers" bigint, "total_orders" bigint, "completed_orders" bigint, "pending_orders" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.users) AS total_users,
        (SELECT count(*) FROM public.users WHERE role = 'driver') AS total_drivers,
        (SELECT count(*) FROM public.drivers WHERE status = 'online') AS active_drivers,
        (SELECT count(*) FROM public.orders) AS total_orders,
        (SELECT count(*) FROM public.orders WHERE status = 'completed') AS completed_orders,
        (SELECT count(*) FROM public.orders WHERE status IN ('pending', 'accepted', 'in_progress')) AS pending_orders;
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"() RETURNS TABLE("total_users" bigint, "active_drivers" bigint, "total_orders" bigint, "completed_orders" bigint, "pending_orders" bigint, "today_orders" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.users) AS total_users,
        (SELECT count(*) FROM public.drivers WHERE status = 'online') AS active_drivers,
        (SELECT count(*) FROM public.orders) AS total_orders,
        (SELECT count(*) FROM public.orders WHERE status = 'completed') AS completed_orders,
        (SELECT count(*) FROM public.orders WHERE status IN ('pending', 'accepted', 'in_progress')) AS pending_orders,
        (SELECT count(*) FROM public.orders WHERE created_at >= (now() at time zone 'utc')::date) AS today_orders;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_orders"("p_driver_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "driver_id" "uuid", "type" "text", "pickup_addr" "text", "dest_addr" "text", "notes" "text", "status" "text", "created_at" timestamp with time zone, "completed_at" timestamp with time zone, "updated_at" timestamp with time zone, "user" json)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
    v_driver_id uuid;
begin
    -- Ambil ID driver dari user_id yang sedang login
    select d.id into v_driver_id from public.drivers d where d.user_id = p_driver_user_id;

    return query
    select
        o.id,
        o.user_id,
        o.driver_id,
        o.type,
        o.pickup_addr,
        o.dest_addr,
        o.notes,
        o.status,
        o.created_at,
        o.completed_at,
        o.updated_at,
        -- Membuat objek JSON yang berisi detail pemesan
        json_build_object(
            'id', u.id,
            'name', au.raw_user_meta_data->>'full_name', -- Mengambil nama dari metadata auth
            'wa_number', u.wa_number
        ) as "user"
    from
        public.orders o
    join
        public.users u on o.user_id = u.id
    join
        auth.users au on o.user_id = au.id -- Bergabung dengan auth.users untuk mendapatkan nama
where
    -- Kondisi: Pesanan yang ditugaskan ke driver ini ATAU pesanan yang masih pending
    o.driver_id = v_driver_id
    or (o.status = 'pending' and o.driver_id is null);
end;
$$;


ALTER FUNCTION "public"."get_driver_orders"("p_driver_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_online_drivers"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "user" json)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.user_id,
        d.status,
        d.created_at,
        d.updated_at,
        -- Membuat objek JSON dari data profil pengguna (user)
        json_build_object(
            'id', u.id,
            'name', u.name,
            'wa_number', u.wa_number,
            'profile_picture_url', u.profile_picture_url
        ) AS "user"
    FROM
        public.drivers AS d
    LEFT JOIN
        public.users AS u ON d.user_id = u.id
    WHERE
        d.status = 'online';
END;
$$;


ALTER FUNCTION "public"."get_online_drivers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_id);
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_driver_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF new.role = 'driver' AND old.role <> 'driver' THEN
    INSERT INTO public.drivers (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF new.role <> 'driver' AND old.role = 'driver' THEN
    DELETE FROM public.drivers WHERE user_id = new.id;
  END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_driver_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, name, wa_number)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'wa_number');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'offline'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


COMMENT ON TABLE "public"."drivers" IS 'Data spesifik untuk driver, seperti status online/offline.';



CREATE TABLE IF NOT EXISTS "public"."images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "driver_id" "uuid",
    "type" "text" NOT NULL,
    "pickup_addr" "text" NOT NULL,
    "dest_addr" "text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'Merekam semua transaksi pesanan.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "wa_number" "text" NOT NULL,
    "role" "text" DEFAULT 'pengguna'::"text" NOT NULL,
    "profile_picture_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Menyimpan data profil publik pengguna.';



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_drivers_status" ON "public"."drivers" USING "btree" ("status");



CREATE INDEX "idx_drivers_user_id" ON "public"."drivers" USING "btree" ("user_id");



CREATE INDEX "idx_images_order_id" ON "public"."images" USING "btree" ("order_id");



CREATE INDEX "idx_orders_driver_id" ON "public"."orders" USING "btree" ("driver_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "KirimNotifikasiPesananBaru." AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://fyldwjtxvppmaixcupao.supabase.co/functions/v1/notify-driver-on-order', 'POST', '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bGR3anR4dnBwbWFpeGN1cGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ5NDExNywiZXhwIjoyMDY5MDcwMTE3fQ.GhHDMZ2ehclRxb8r2RPsyKwszjKqV2n_NiuQrO8xK5Y"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "handle_drivers_update" BEFORE UPDATE ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_orders_update" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_users_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_user_role_changed" AFTER UPDATE OF "role" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_driver_role_change"();



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin dapat melihat semua profil" ON "public"."users" FOR SELECT USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"text"));



CREATE POLICY "Admin dapat memperbarui semua profil" ON "public"."users" FOR UPDATE USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"text"));



CREATE POLICY "Admin dapat mengelola semua driver" ON "public"."drivers" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to all orders" ON "public"."orders" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Driver dapat memperbarui status sendiri" ON "public"."drivers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Drivers can access relevant orders" ON "public"."orders" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'driver'::"text")))) AND ((("status" = 'pending'::"text") AND ("driver_id" IS NULL)) OR ("driver_id" IN ( SELECT "drivers"."id"
   FROM "public"."drivers"
  WHERE ("drivers"."user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'driver'::"text")))) AND ((("status" = 'pending'::"text") AND ("driver_id" IS NULL)) OR ("driver_id" IN ( SELECT "drivers"."id"
   FROM "public"."drivers"
  WHERE ("drivers"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Pengguna dapat melihat profil sendiri dan profil driver" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") OR ("role" = 'driver'::"text")));



CREATE POLICY "Pengguna dapat memperbarui profil sendiri" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Semua dapat melihat data driver" ON "public"."drivers" FOR SELECT USING (true);



CREATE POLICY "Users can manage their own orders" ON "public"."orders" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_order"("order_id" "uuid", "driver_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_order"("order_id" "uuid", "driver_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_order"("order_id" "uuid", "driver_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_driver_on_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_driver_on_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_driver_on_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_driver_orders"("p_driver_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_driver_orders"("p_driver_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_driver_orders"("p_driver_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_online_drivers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_online_drivers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_online_drivers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_driver_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_driver_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_driver_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."drivers" TO "anon";
GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."images" TO "anon";
GRANT ALL ON TABLE "public"."images" TO "authenticated";
GRANT ALL ON TABLE "public"."images" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
