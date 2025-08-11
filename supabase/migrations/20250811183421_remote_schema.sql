/************************************************************
 * SKEMA DATABASE OJEK MAHASISWA (OMAGA)
 ************************************************************/

-- =============================================
-- SECTION 1: EXTENSIONS
-- Mengaktifkan ekstensi yang dibutuhkan oleh Supabase.
-- =============================================
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- =============================================
-- SECTION 2: FUNCTIONS & TRIGGERS
-- Fungsi-fungsi RPC dan helper untuk automasi.
-- =============================================

-- Function untuk handle user baru, menyalin data dari auth.users ke public.users
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() 
RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, name, wa_number)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'wa_number');
  RETURN new;
END;
$$;

-- Function untuk membuat/menghapus record 'drivers' saat role user berubah
CREATE OR REPLACE FUNCTION "public"."handle_driver_role_change"() 
RETURNS "trigger"
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

-- Function untuk otomatis mengisi kolom 'updated_at'
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- AMAN: Function untuk memanggil Edge Function notifikasi
CREATE OR REPLACE FUNCTION public.panggil_notifikasi_pesanan_baru()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fyldwjtxvppmaixcupao.supabase.co/functions/v1/notify-driver-on-order',
    body := jsonb_build_object('record', NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk mendapatkan role user
CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") 
RETURNS "text"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_id);
END;
$$;

-- Function RPC untuk dashboard admin
CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_overview"() 
RETURNS TABLE("total_users" bigint, "total_drivers" bigint, "active_drivers" bigint, "total_orders" bigint, "completed_orders" bigint, "pending_orders" bigint)
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

-- Function RPC untuk dashboard driver
CREATE OR REPLACE FUNCTION "public"."get_driver_orders"("p_driver_user_id" "uuid") 
RETURNS TABLE("id" "uuid", "user_id" "uuid", "driver_id" "uuid", "type" "text", "pickup_addr" "text", "dest_addr" "text", "notes" "text", "status" "text", "created_at" timestamp with time zone, "completed_at" timestamp with time zone, "updated_at" timestamp with time zone, "user" json)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
declare
    v_driver_id uuid;
begin
    select d.id into v_driver_id from public.drivers d where d.user_id = p_driver_user_id;
    return query
    select
        o.id, o.user_id, o.driver_id, o.type, o.pickup_addr, o.dest_addr, o.notes, o.status,
        o.created_at, o.completed_at, o.updated_at,
        json_build_object(
            'id', u.id,
            'name', au.raw_user_meta_data->>'full_name',
            'wa_number', u.wa_number
        ) as "user"
    from
        public.orders o
    join
        public.users u on o.user_id = u.id
    join
        auth.users au on o.user_id = au.id
    where
        o.driver_id = v_driver_id
        or (o.status = 'pending' and o.driver_id is null);
end;
$$;

-- Function RPC untuk mendapatkan driver yang online
CREATE OR REPLACE FUNCTION "public"."get_online_drivers"() 
RETURNS TABLE("id" "uuid", "user_id" "uuid", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "user" json)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id, d.user_id, d.status, d.created_at, d.updated_at,
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

-- =============================================
-- SECTION 3: TABLES
-- Definisi struktur tabel utama.
-- =============================================
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL PRIMARY KEY,
    "name" "text",
    "wa_number" "text" NOT NULL,
    "role" "text" DEFAULT 'pengguna'::"text" NOT NULL,
    "profile_picture_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE "public"."users" IS 'Menyimpan data profil publik pengguna.';

CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL UNIQUE,
    "status" "text" DEFAULT 'offline'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE "public"."drivers" IS 'Data spesifik untuk driver, seperti status online/offline.';

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL,
    "driver_id" "uuid",
    "type" "text" NOT NULL,
    "pickup_addr" "text" NOT NULL,
    "dest_addr" "text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT "orders_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."orders" IS 'Merekam semua transaksi pesanan.';

CREATE TABLE IF NOT EXISTS "public"."images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL PRIMARY KEY,
    "order_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- =============================================
-- SECTION 4: INDEXES
-- Index untuk mempercepat query database.
-- =============================================
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "public"."users" USING "btree" ("role");
CREATE INDEX IF NOT EXISTS "idx_drivers_status" ON "public"."drivers" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_drivers_user_id" ON "public"."drivers" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "public"."orders" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_orders_driver_id" ON "public"."orders" USING "btree" ("driver_id");
CREATE INDEX IF NOT EXISTS "idx_images_order_id" ON "public"."images" USING "btree" ("order_id");

-- =============================================
-- SECTION 5: TRIGGERS
-- Menjalankan fungsi secara otomatis berdasarkan event database.
-- =============================================
-- Trigger untuk mengisi 'updated_at'
CREATE OR REPLACE TRIGGER "handle_users_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "handle_drivers_update" BEFORE UPDATE ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "handle_orders_update" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- Trigger untuk sinkronisasi role ke tabel drivers
CREATE OR REPLACE TRIGGER "on_user_role_changed" AFTER UPDATE OF "role" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_driver_role_change"();

-- AMAN: Trigger untuk mengirim notifikasi pesanan baru
CREATE OR REPLACE TRIGGER "on_new_order_notify"
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.panggil_notifikasi_pesanan_baru();

-- =============================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- Aturan keamanan untuk setiap tabel.
-- =============================================
-- RLS for users table
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pengguna dapat melihat profil sendiri dan profil driver" ON "public"."users" FOR SELECT TO "authenticated" USING ((auth.uid() = id) OR (role = 'driver'::text));
CREATE POLICY "Pengguna dapat memperbarui profil sendiri" ON "public"."users" FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin dapat melihat semua profil" ON "public"."users" FOR SELECT USING (get_user_role(auth.uid()) = 'admin'::text);
CREATE POLICY "Admin dapat memperbarui semua profil" ON "public"."users" FOR UPDATE USING (get_user_role(auth.uid()) = 'admin'::text);

-- RLS for drivers table
ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Semua dapat melihat data driver" ON "public"."drivers" FOR SELECT USING (true);
CREATE POLICY "Driver dapat memperbarui status sendiri" ON "public"."drivers" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin dapat mengelola semua driver" ON "public"."drivers" USING (get_user_role(auth.uid()) = 'admin'::text);

-- RLS for orders table
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own orders" ON "public"."orders" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Drivers can access relevant orders" ON "public"."orders" FOR SELECT USING (get_user_role(auth.uid()) = 'driver'::text AND (status = 'pending' OR driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())));
CREATE POLICY "Admins have full access to all orders" ON "public"."orders" FOR ALL USING (get_user_role(auth.uid()) = 'admin'::text);

-- BARU: RLS for images table
ALTER TABLE "public"."images" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can manage images" ON "public"."images" FOR ALL
USING (
  (get_user_role(auth.uid()) = 'admin'::text) OR
  (order_id IN (
    SELECT id FROM public.orders 
    WHERE 
      user_id = auth.uid() OR 
      driver_id = (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  ))
);
