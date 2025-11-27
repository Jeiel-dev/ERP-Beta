
import { User, UserRole, Product, Sale, SaleStatus, UnitConfig, SaleItem, Seller } from '../types';
import { supabase } from './supabase';

// --- MAPPERS (DB snake_case -> App camelCase) ---

const mapUser = (data: any): User => ({
  id: data.id,
  name: data.name,
  username: data.username,
  role: data.role as UserRole,
  active: data.active,
  password: data.password
});

const mapSeller = (data: any): Seller => ({
  id: data.id,
  name: data.name,
  active: data.active
});

const mapProduct = (data: any): Product => ({
  id: data.id,
  code: data.code || '',
  name: data.name,
  description: data.description || '',
  price: Number(data.price),
  stock: Number(data.stock),
  category: data.category || '',
  unit: data.unit || 'UNID',
  active: data.active
});

const mapSale = (data: any): Sale => ({
  id: data.id,
  sellerId: data.seller_id,
  sellerName: data.seller_name,
  salespersonId: data.salesperson_id,
  salespersonName: data.salesperson_name,
  cashierId: data.cashier_id,
  cashierName: data.cashier_name,
  items: data.items || [], // JSONB field
  totalValue: Number(data.total_value),
  status: data.status as SaleStatus,
  createdAt: data.created_at,
  finishedAt: data.finished_at,
  clientName: data.client_name,
  discount: Number(data.discount || 0),
  freight: Number(data.freight || 0),
  otherCosts: Number(data.other_costs || 0),
  payments: data.payments, // JSONB field
  installments: data.installments,
  observation: data.observation,
  deliveryAddress: data.delivery_address,
  purchaseOrder: data.purchase_order,
  customerEmail: data.customer_email,
  cashierIdent: data.cashier_ident
});

// --- UNITS CONFIGURATION ---
const DEFAULT_UNITS: UnitConfig[] = [
  { code: 'UNID', name: 'Unidade', active: true },
  { code: 'KG', name: 'Quilograma', active: true },
  { code: 'LT', name: 'Litro', active: true },
  { code: 'MT', name: 'Metro', active: true },
  { code: 'CX', name: 'Caixa', active: true },
  { code: 'PAR', name: 'Par', active: true },
  { code: 'PC', name: 'Peça', active: true },
  { code: 'DZ', name: 'Dúzia', active: false },
  { code: 'ML', name: 'Mililitro', active: false },
  { code: 'G', name: 'Grama', active: false },
];

export const getUnits = (): UnitConfig[] => {
  const stored = localStorage.getItem('erp_units_config');
  if (stored) {
    return JSON.parse(stored);
  }
  return DEFAULT_UNITS;
};

export const saveUnits = (units: UnitConfig[]) => {
  localStorage.setItem('erp_units_config', JSON.stringify(units));
};

export const toggleUnitActive = (code: string) => {
  const units = getUnits();
  const newUnits = units.map(u => u.code === code ? { ...u, active: !u.active } : u);
  saveUnits(newUnits);
  return newUnits;
};


// --- USERS ---

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*').order('name');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data.map(mapUser);
};

export const createUser = async (user: Omit<User, 'id'> & { password?: string }): Promise<User> => {
  const { data, error } = await supabase.from('users').insert({
    name: user.name,
    username: user.username,
    role: user.role,
    password: user.password || '123',
    active: true
  }).select().single();

  if (error) throw new Error(error.message);
  return mapUser(data);
};

export const updateUser = async (user: User): Promise<User> => {
  const { data, error } = await supabase.from('users').update({
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active
  }).eq('id', user.id).select().single();

  if (error) throw new Error(error.message);
  return mapUser(data);
};

export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- SELLERS (SUB-SALESPERSONS) ---

export const getSellers = async (): Promise<Seller[]> => {
  const { data, error } = await supabase.from('sellers').select('*').order('name');
  if (error) {
    console.error('Error fetching sellers:', error);
    return [];
  }
  return data.map(mapSeller);
};

export const createSeller = async (name: string): Promise<Seller> => {
  const { data, error } = await supabase.from('sellers').insert({
    name,
    active: true
  }).select().single();

  if (error) throw new Error(error.message);
  return mapSeller(data);
};

export const updateSeller = async (seller: Seller): Promise<Seller> => {
  const { data, error } = await supabase.from('sellers').update({
    name: seller.name,
    active: seller.active
  }).eq('id', seller.id).select().single();

  if (error) throw new Error(error.message);
  return mapSeller(data);
};

export const deleteSeller = async (id: string): Promise<void> => {
  const { error } = await supabase.from('sellers').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const toggleSellerActive = async (id: string): Promise<Seller> => {
  const { data: current } = await supabase.from('sellers').select('active').eq('id', id).single();
  if (!current) throw new Error("Vendedor não encontrado");

  const { data, error } = await supabase
    .from('sellers')
    .update({ active: !current.active })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapSeller(data);
};


// --- PRODUCTS ---

export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data.map(mapProduct);
};

export const saveProduct = async (product: Product): Promise<Product> => {
  const payload = {
    code: product.code,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    category: product.category,
    unit: product.unit || 'UNID',
    active: product.active ?? true
  };

  let result;
  if (product.id) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', product.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    result = data;
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    result = data;
  }
  return mapProduct(result);
};

export const toggleProductActive = async (id: string): Promise<Product> => {
  const { data: current } = await supabase.from('products').select('active').eq('id', id).single();
  if (!current) throw new Error("Produto não encontrado");

  const { data, error } = await supabase
    .from('products')
    .update({ active: !current.active })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data);
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- SALES ---

export const getSales = async (): Promise<Sale[]> => {
  const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
  return data.map(mapSale);
};

export const createSale = async (saleData: Partial<Sale>): Promise<Sale> => {
  const payload = {
    seller_id: saleData.sellerId,
    seller_name: saleData.sellerName,
    salesperson_id: saleData.salespersonId,
    salesperson_name: saleData.salespersonName,
    client_name: saleData.clientName,
    status: saleData.status || SaleStatus.PENDING,
    total_value: saleData.totalValue,
    discount: saleData.discount,
    freight: saleData.freight,
    other_costs: saleData.otherCosts,
    items: saleData.items,
    payments: saleData.payments,
    installments: saleData.installments,
    observation: saleData.observation,
    delivery_address: saleData.deliveryAddress,
    purchase_order: saleData.purchaseOrder,
    customer_email: saleData.customerEmail,
    cashier_ident: saleData.cashierIdent
  };

  const { data, error } = await supabase.from('sales').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return mapSale(data);
};

export const updateSale = async (saleData: Partial<Sale> & { id: string }): Promise<Sale> => {
  const payload: Record<string, any> = {};
  
  // Conditional Mapping to avoid overwriting with undefined
  if (saleData.items) payload.items = saleData.items;
  if (saleData.clientName !== undefined) payload.client_name = saleData.clientName;
  if (saleData.totalValue !== undefined) payload.total_value = saleData.totalValue;
  if (saleData.discount !== undefined) payload.discount = saleData.discount;
  if (saleData.freight !== undefined) payload.freight = saleData.freight;
  if (saleData.otherCosts !== undefined) payload.other_costs = saleData.otherCosts;
  if (saleData.payments) payload.payments = saleData.payments;
  if (saleData.installments) payload.installments = saleData.installments;
  if (saleData.observation !== undefined) payload.observation = saleData.observation;
  if (saleData.deliveryAddress !== undefined) payload.delivery_address = saleData.deliveryAddress;
  if (saleData.customerEmail !== undefined) payload.customer_email = saleData.customerEmail;
  if (saleData.purchaseOrder !== undefined) payload.purchase_order = saleData.purchaseOrder;
  if (saleData.cashierIdent !== undefined) payload.cashier_ident = saleData.cashierIdent;
  if (saleData.salespersonId !== undefined) payload.salesperson_id = saleData.salespersonId;
  if (saleData.salespersonName !== undefined) payload.salesperson_name = saleData.salespersonName;
  if (saleData.status) payload.status = saleData.status;

  const { data, error } = await supabase
    .from('sales')
    .update(payload)
    .eq('id', saleData.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapSale(data);
};

export const completeSale = async (saleId: string, cashierId: string, cashierName: string): Promise<Sale> => {
  // 1. Fetch current sale state
  const { data: saleRaw, error: fetchError } = await supabase.from('sales').select('*').eq('id', saleId).single();
  if (fetchError || !saleRaw) throw new Error("Venda não encontrada");
  const sale = mapSale(saleRaw);

  if (sale.status === SaleStatus.COMPLETED) throw new Error("Venda já concluída anteriormente.");

  // 2. Prepare items with discount distribution (if any)
  let finalItems = sale.items;
  let finalDiscount = sale.discount;

  if (sale.discount && sale.discount > 0) {
    const subTotal = sale.items.reduce((acc, item) => acc + item.total, 0);
    if (subTotal > 0) {
      const factor = (subTotal - sale.discount) / subTotal;
      finalItems = sale.items.map(item => {
        const netUnitPrice = item.unitPrice * factor;
        return {
          ...item,
          unitPrice: netUnitPrice,
          total: netUnitPrice * item.quantity
        };
      });
      finalDiscount = 0; // Clear global discount as it's distributed to items
    }
  }

  // 3. Stock Validation & Update (Server-side Check)
  for (const item of finalItems) {
    const { data: prod } = await supabase.from('products').select('stock, name').eq('id', item.productId).single();
    
    if (!prod) throw new Error(`Produto não encontrado: ${item.productName}`);
    
    if (prod.stock < item.quantity) {
      throw new Error(`Estoque insuficiente para '${prod.name}'. Disponível: ${prod.stock}`);
    }
    
    // Decrement stock
    await supabase.from('products').update({ stock: prod.stock - item.quantity }).eq('id', item.productId);
  }

  // 4. Finalize Sale
  const { data: updatedSale, error: updateError } = await supabase
    .from('sales')
    .update({
      status: SaleStatus.COMPLETED,
      cashier_id: cashierId,
      cashier_name: cashierName,
      finished_at: new Date().toISOString(),
      items: finalItems,
      discount: finalDiscount
    })
    .eq('id', saleId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);
  return mapSale(updatedSale);
};

export const cancelSale = async (saleId: string): Promise<Sale> => {
  const { data: saleRaw, error: fetchError } = await supabase.from('sales').select('*').eq('id', saleId).single();
  if (fetchError || !saleRaw) throw new Error("Venda não encontrada");
  const sale = mapSale(saleRaw);

  // If sale was completed, return items to stock
  if (sale.status === SaleStatus.COMPLETED) {
    for (const item of sale.items) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
      if (prod) {
        await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.productId);
      }
    }
  }

  const { data, error } = await supabase
    .from('sales')
    .update({ status: SaleStatus.CANCELLED })
    .eq('id', saleId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapSale(data);
};
