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

export function getPaymentMethodLabel(methodId: string, customMethods?: PaymentMethodOption[]): string {
  if (!methodId) return '';
  if (customMethods && customMethods.length > 0) {
    const found = customMethods.find(m => m.id === methodId);
    if (found) return found.label;
  }
  switch (methodId) {
    case 'pix': return 'PIX à Vista (Chave CNPJ: 40.587.128/0001-18)';
    case 'dinheiro': return 'Espécie na entrega';
    case 'boleto-30': return 'Boleto Bancário (30 dias)';
    case 'boleto-30-60': return 'Boleto Duplo (30/60 dias)';
    default: return methodId;
  }
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
