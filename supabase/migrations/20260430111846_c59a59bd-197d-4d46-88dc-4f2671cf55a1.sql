-- Profiles table (user settings + business type)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT,
  business_name TEXT,
  labor_rate_hour NUMERIC NOT NULL DEFAULT 10,
  machine_rate_hour NUMERIC NOT NULL DEFAULT 2,
  profit_margin NUMERIC NOT NULL DEFAULT 30,
  monthly_work_hours NUMERIC NOT NULL DEFAULT 160,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fixed monthly costs
CREATE TABLE public.fixed_costs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fc_select" ON public.fixed_costs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fc_insert" ON public.fixed_costs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fc_update" ON public.fixed_costs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fc_delete" ON public.fixed_costs FOR DELETE USING (auth.uid() = user_id);

-- Ingredients / supplies bought
CREATE TABLE public.ingredients (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  package_price NUMERIC NOT NULL DEFAULT 0,
  package_quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'g',
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ing_select" ON public.ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ing_insert" ON public.ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ing_update" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ing_delete" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);

-- Recipes (saved cost calculations)
CREATE TABLE public.recipes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  labor_minutes NUMERIC NOT NULL DEFAULT 0,
  machine_minutes NUMERIC NOT NULL DEFAULT 0,
  ingredients_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  ingredient_cost NUMERIC NOT NULL DEFAULT 0,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  machine_cost NUMERIC NOT NULL DEFAULT 0,
  fixed_cost_share NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  suggested_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_select" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rec_insert" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rec_update" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rec_delete" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- Orders (customer orders with components)
CREATE TABLE public.orders (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  product_description TEXT,
  delivery_date DATE,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  decoration_notes TEXT,
  decoration_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ord_select" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ord_insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ord_update" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ord_delete" ON public.orders FOR DELETE USING (auth.uid() = user_id);