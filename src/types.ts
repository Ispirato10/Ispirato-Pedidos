export interface ProductPriceTiers {
  base: number;
  bulk12: number;
  bulk500: number;
}

export interface Product {
  id: string; // SKU or generated id
  name: string;
  description: string;
  image: string;
  prices: ProductPriceTiers;
  icon?: string;
  minQty?: number;
  active: boolean;
  category?: string;
  createdAt?: string;
}

export interface PaymentMethodOption {
  id: string;
  label: string;
  instructions: string;
  active?: boolean;
}

export interface AppSettings {
  whatsappNumber: string;
  minimumOrderQty: number;
  welcomeMessage: string;
  customOrderText: string;
  adminEmails: string[];
  // Novos campos customizáveis para o formulário
  formTitle?: string;
  formHelpMessage?: string;
  formInvoiceLabel?: string;
  formInvoiceNoLabel?: string;
  formInvoiceYesLabel?: string;
  paymentMethods?: PaymentMethodOption[];
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  tierName: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  items: OrderItem[];
  total: number;
  totalQuantity: number;
  paymentMethod: string;
  needsInvoice: boolean;
  status: 'pending' | 'completed' | 'cancelled';
}
