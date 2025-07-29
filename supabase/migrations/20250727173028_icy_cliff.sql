/*
  # OMAGA Database Schema
  
  Database schema untuk sistem ojek mahasiswa OMAGA dengan fitur lengkap:
  - User management dengan role-based access
  - Driver management dengan status online/offline
  - Order management dengan tracking status
  - Image storage untuk bukti pesanan
  
  ## Tables:
  1. users - Data pengguna dengan role system
  2. drivers - Data driver dengan status ketersediaan
  3. orders - Data pesanan dengan tracking lengkap
  4. images - Storage untuk gambar bukti pesanan
  
  ## Security:
  - Row Level Security enabled untuk semua tabel
  - Policies untuk mengatur akses berdasarkan role
  - Authentication integration dengan Supabase Auth
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  wa_number text NOT NULL,
  role text NOT NULL DEFAULT 'pengguna' CHECK (role IN ('admin', 'driver', 'pengguna')),
  created_at timestamptz DEFAULT now()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  created_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('delivery', 'ride')),
  pickup_addr text NOT NULL,
  dest_addr text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Images table for order attachments
CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for drivers table
CREATE POLICY "Drivers can manage own status"
  ON drivers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Everyone can read driver status"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage all drivers"
  ON drivers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for orders table
CREATE POLICY "Users can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can read all pending orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND driver_id IS NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'driver'
    )
  );

CREATE POLICY "Drivers can read assigned orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update assigned orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can accept pending orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending' AND driver_id IS NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'driver'
    )
  );

CREATE POLICY "Admin can read all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update all orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for images table
CREATE POLICY "Order owners can manage images"
  ON images
  FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Assigned drivers can manage images"
  ON images
  FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE driver_id IN (
        SELECT id FROM drivers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin can manage all images"
  ON images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_images_order_id ON images(order_id);

-- Function to automatically create driver record when user role is changed to driver
CREATE OR REPLACE FUNCTION create_driver_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'driver' AND OLD.role != 'driver' THEN
    INSERT INTO drivers (user_id, status)
    VALUES (NEW.id, 'offline')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role != 'driver' AND OLD.role = 'driver' THEN
    DELETE FROM drivers WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic driver record management
DROP TRIGGER IF EXISTS trigger_create_driver_on_role_change ON users;
CREATE TRIGGER trigger_create_driver_on_role_change
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_driver_on_role_change();

-- Insert default admin user (optional)
-- Note: This should be done after setting up Supabase Auth
-- INSERT INTO users (id, name, phone, wa_number, role) 
-- VALUES ('admin-uuid-here', 'Admin OMAGA', '081234567890', '081234567890', 'admin')
-- ON CONFLICT (id) DO NOTHING;