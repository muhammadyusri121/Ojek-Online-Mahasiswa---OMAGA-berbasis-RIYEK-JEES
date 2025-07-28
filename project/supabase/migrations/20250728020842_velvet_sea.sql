/*
  # OMAGA Database Schema - Improved Version
  
  Perbaikan database untuk sistem ojek mahasiswa OMAGA dengan:
  - Pemisahan data auth dan profil yang jelas
  - Trigger otomatis untuk pembuatan profil
  - RLS yang diperkuat dengan helper functions
  - Support untuk foto profil
  
  ## Tables:
  1. users - Data profil publik (wa_number, role, profile_picture_url)
  2. drivers - Data driver dengan status ketersediaan
  3. orders - Data pesanan dengan tracking lengkap
  4. order_images - Storage untuk gambar bukti pesanan
  
  ## Security:
  - Row Level Security dengan helper functions
  - Trigger otomatis untuk pembuatan profil
  - Policies berdasarkan role yang aman
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to get user role safely
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.users 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table (hanya data profil publik)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wa_number text NOT NULL,
  role text NOT NULL DEFAULT 'pengguna' CHECK (role IN ('admin', 'driver', 'pengguna')),
  profile_picture_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('delivery', 'ride')),
  pickup_addr text NOT NULL,
  dest_addr text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Order images table
CREATE TABLE IF NOT EXISTS public.order_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  url text NOT NULL,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, wa_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'wa_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pengguna')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to automatically create driver record when role changes
CREATE OR REPLACE FUNCTION handle_role_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'driver' AND (OLD.role IS NULL OR OLD.role != 'driver') THEN
    INSERT INTO public.drivers (user_id, status)
    VALUES (NEW.id, 'offline')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role != 'driver' AND OLD.role = 'driver' THEN
    DELETE FROM public.drivers WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for driver management
DROP TRIGGER IF EXISTS on_user_role_changed ON public.users;
CREATE TRIGGER on_user_role_changed
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_role_change();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can update all profiles"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for drivers table
CREATE POLICY "Drivers can manage own status"
  ON public.drivers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Everyone can read driver status"
  ON public.drivers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage all drivers"
  ON public.drivers
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for orders table
CREATE POLICY "Users can read own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can read available orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    (status = 'pending' AND driver_id IS NULL AND get_user_role(auth.uid()) = 'driver') OR
    (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
  );

CREATE POLICY "Drivers can update assigned orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()) OR
    (status = 'pending' AND driver_id IS NULL AND get_user_role(auth.uid()) = 'driver')
  );

CREATE POLICY "Admin can manage all orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for order_images table
CREATE POLICY "Order participants can manage images"
  ON public.order_images
  FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE user_id = auth.uid() OR 
            driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_images_order_id ON public.order_images(order_id);

-- Storage bucket for profile pictures (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('order-images', 'order-images', true);

-- Storage policies (run these in Supabase dashboard)
-- CREATE POLICY "Users can upload own profile picture" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (
--     bucket_id = 'profile-pictures' AND 
--     auth.uid()::text = (storage.foldername(name))[1] AND
--     (get_user_role(auth.uid()) = 'admin' OR get_user_role(auth.uid()) = 'driver')
--   );

-- CREATE POLICY "Users can view profile pictures" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'profile-pictures');

-- CREATE POLICY "Users can update own profile picture" ON storage.objects
--   FOR UPDATE TO authenticated USING (
--     bucket_id = 'profile-pictures' AND 
--     auth.uid()::text = (storage.foldername(name))[1] AND
--     (get_user_role(auth.uid()) = 'admin' OR get_user_role(auth.uid()) = 'driver')
--   );

-- CREATE POLICY "Order participants can upload images" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'order-images');

-- CREATE POLICY "Everyone can view order images" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'order-images');