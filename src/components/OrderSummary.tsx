import React from 'react';
import { ClipboardList, ShoppingBag } from 'lucide-react';
import { Product } from '../types';

interface OrderSummaryProps {
  products: Product[];
  quantities: Record<string, number>;
  paymentMethod: string;
  needsInvoice: boolean;
}

export default function OrderSummary({ products, quantities, paymentMethod, needsInvoice }: OrderSummaryProps) {
  const selectedItems = products.filter(p => (quantities[p.id] || 0) > 0);
  const totalQuantity = selectedItems.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);

  const getActiveTier = (qty: number) => {
    if (qty >= 500) return 'bulk500';
    if (qty >= 12) return 'bulk12';
    return 'base';
  };

  const getTierName = (tier: string | null) => {
    switch (tier) {
      case 'base': return 'Unitário';
      case 'bulk12': return 'Atacado';
      case 'bulk500': return 'Atacadão';
      default: return '';
    }
  };

  const getPriceByTier = (product: Product, tier: string) => {
    if (tier === 'bulk500' && product.prices.bulk500) return product.prices.bulk500;
    if (tier === 'bulk12') return product.prices.bulk12;
    return product.prices.base;
  };

  const totalValue = selectedItems.reduce((sum, p) => {
    const qty = quantities[p.id] || 0;
    const tier = getActiveTier(qty);
    return sum + (getPriceByTier(p, tier) * qty);
  }, 0);

  if (totalQuantity === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in text-left font-sans">
      <div className="bg-[#0F172A] p-4 text-white border-b border-slate-800">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-400" />
          Resumo Parcial de Atacado
        </h2>
        <p className="text-slate-400 text-[10px] mt-0.5">Detalhamento dos lotes selecionados</p>
        
        {paymentMethod && (
          <div className="mt-2.5 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700 text-[10px] space-y-1 font-medium">
            <p>💳 Condição: <strong className="font-extrabold text-emerald-300">{
              paymentMethod === 'pix' ? 'PIX à Vista (CNPJ)' :
              paymentMethod === 'dinheiro' ? 'Espécie (Entrega)' :
              paymentMethod === 'boleto-30' ? 'Boleto Bancário 30 dias' :
              paymentMethod === 'boleto-30-60' ? 'Boleto Duplo (30/60 dias)' :
              paymentMethod
            }</strong></p>
            <p>📄 Faturamento: <strong className="font-extrabold text-emerald-300">{needsInvoice ? 'Com Nota Fiscal (NF-e)' : 'Sem Nota Fiscal'}</strong></p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        {selectedItems.map((prod) => {
          const qty = quantities[prod.id];
          const tier = getActiveTier(qty);
          const unitPrice = getPriceByTier(prod, tier);
          const subtotal = unitPrice * qty;

          return (
            <div key={prod.id} className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all duration-200">
              <img 
                src={prod.image || 'https://via.placeholder.com/100'} 
                alt={prod.name} 
                className="w-10 h-10 object-contain bg-white rounded-lg border border-slate-200 p-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-0.5">
                  <span>{qty} un × R$ {unitPrice.toFixed(2)}</span>
                  <span className={`px-1 py-0.5 rounded-xs text-[9px] font-extrabold ${
                    tier === 'bulk500' ? 'bg-amber-100 text-amber-700' :
                    tier === 'bulk12' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {getTierName(tier)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold text-slate-900">R$ {subtotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })}

        <div className="bg-emerald-600 text-white rounded-xl p-3.5 flex justify-between items-center shadow-md shadow-emerald-600/10 mt-4 transition-all hover:scale-[1.01]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-100" />
            <div className="text-left">
              <p className="text-[9px] uppercase font-bold tracking-wider text-emerald-200">Total do Lote</p>
              <p className="text-[10px] font-semibold text-emerald-100">{totalQuantity} un. selecionadas</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black tracking-tight font-mono">R$ {totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
