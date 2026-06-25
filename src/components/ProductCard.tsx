import React from 'react';
import { Sparkles, Minus, Plus, Tag, Layers, Flame } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: string;
  product: Product;
  quantity: number;
  totalCartQuantity: number;
  onQuantityChange: (productId: string, newQty: number) => void;
}

export default function ProductCard({ product, quantity, totalCartQuantity, onQuantityChange }: ProductCardProps) {
  
  const getActiveTier = (qty: number) => {
    if (qty === 0) return null;
    if (qty >= 500 && product.prices.bulk500) return 'bulk500';
    if (qty >= 12) return 'bulk12';
    return 'base';
  };

  const activeTier = getActiveTier(quantity);
  
  const getPriceByQty = (qty: number) => {
    if (qty >= 500 && product.prices.bulk500) return product.prices.bulk500;
    if (qty >= 12) return product.prices.bulk12;
    return product.prices.base;
  };

  const currentPrice = getPriceByQty(quantity);
  const subtotal = quantity * currentPrice;

  // Calculate discount percentage helper
  const getDiscountPercentage = (from: number, to: number) => {
    return Math.round(((from - to) / from) * 100);
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between group ${
      quantity > 0 
        ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-lg shadow-emerald-500/5 -translate-y-0.5' 
        : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 shadow-2xs'
    }`}>
      {/* Product Image Stage */}
      <div className="h-40 bg-linear-to-b from-slate-50 to-white flex items-center justify-center relative p-4 border-b border-slate-100 overflow-hidden">
        <img 
          src={product.image || 'https://via.placeholder.com/300'} 
          alt={product.name}
          className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-108"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300';
          }}
          referrerPolicy="no-referrer"
        />
        
        {/* Category Badge & Special Tags */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {product.category || 'Natural'}
          </span>
          {quantity > 0 && (
            <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              No Carrinho
            </span>
          )}
        </div>

        {product.prices.bulk500 && (
          <span className="absolute top-3 right-3 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold py-1 px-2 rounded-full border border-emerald-200/50 shadow-2xs uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 animate-spin-slow" />
            Super Lotes
          </span>
        )}
      </div>

      {/* Card Body Info */}
      <div className="p-4 flex-1 flex flex-col justify-between font-sans">
        <div className="text-left space-y-1">
          <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>
          <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Dynamic Discount & Tier Progress Bar */}
        {quantity > 0 && (
          <div className="mt-3 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 text-[11px] text-left space-y-1.5 animate-fade-in">
            {quantity < 12 ? (
              <div>
                <p className="text-slate-600 font-medium">
                  Faltam <strong className="text-emerald-600 font-extrabold">{12 - quantity} un.</strong> para o preço de <strong className="text-emerald-700 font-bold">Atacado</strong>!
                </p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${(quantity / 12) * 100}%` }} />
                </div>
              </div>
            ) : quantity >= 12 && quantity < 500 && product.prices.bulk500 ? (
              <div>
                <p className="text-slate-600 font-medium flex items-center gap-1">
                  <span>🎉 Atacado ativado! Faltam</span>
                  <strong className="text-amber-600 font-extrabold">{500 - quantity} un.</strong>
                  <span>para o</span>
                  <strong className="text-amber-700 font-bold">Atacadão</strong>
                </p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${(quantity / 500) * 100}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-emerald-700 font-extrabold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                <span>Nível Máximo de Desconto Ativado!</span>
              </p>
            )}
          </div>
        )}

        {/* Dense Pricing Matrix */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-left">
          {/* Base Unit Price Tier */}
          <div className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs transition-all duration-300 ${
            activeTier === 'base' 
              ? 'bg-emerald-600 border-emerald-600 text-white font-extrabold shadow-md shadow-emerald-600/10 scale-[1.015]' 
              : 'bg-slate-50/70 border-slate-100 text-slate-500'
          }`}>
            <span className="flex items-center gap-1.5">
              <Tag className={`w-3.5 h-3.5 ${activeTier === 'base' ? 'text-white' : 'text-slate-400'}`} />
              1 a 11 un (Base)
            </span>
            <span className="font-mono font-extrabold">R$ {product.prices.base.toFixed(2)}</span>
          </div>

          {/* Wholesale 12+ Tier */}
          <div className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs transition-all duration-300 ${
            activeTier === 'bulk12' 
              ? 'bg-emerald-600 border-emerald-600 text-white font-extrabold shadow-md shadow-emerald-600/10 scale-[1.015]' 
              : 'bg-slate-50/70 border-slate-100 text-slate-500'
          }`}>
            <span className="flex items-center gap-1.5">
              <Layers className={`w-3.5 h-3.5 ${activeTier === 'bulk12' ? 'text-white' : 'text-slate-400'}`} />
              12+ un (Atacado)
              {product.prices.bulk12 < product.prices.base && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${activeTier === 'bulk12' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  -{getDiscountPercentage(product.prices.base, product.prices.bulk12)}%
                </span>
              )}
            </span>
            <span className="font-mono font-extrabold">R$ {product.prices.bulk12.toFixed(2)}</span>
          </div>

          {/* Atacadão 500+ Tier */}
          {product.prices.bulk500 && (
            <div className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs transition-all duration-300 ${
              activeTier === 'bulk500' 
                ? 'bg-amber-500 border-amber-500 text-white font-extrabold shadow-md shadow-amber-500/10 scale-[1.015]' 
                : 'bg-slate-50/70 border-slate-100 text-slate-500'
            }`}>
              <span className="flex items-center gap-1.5">
                <Flame className={`w-3.5 h-3.5 ${activeTier === 'bulk500' ? 'text-white' : 'text-orange-400'}`} />
                500+ un (Atacadão)
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${activeTier === 'bulk500' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                  -{getDiscountPercentage(product.prices.base, product.prices.bulk500)}%
                </span>
              </span>
              <span className="font-mono font-extrabold">R$ {product.prices.bulk500.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Quantity control and total summary footer */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Quantidade</span>
            
            <div className="flex items-center bg-slate-100 border border-slate-200/60 rounded-xl p-1 transition-all focus-within:ring-2 focus-within:ring-emerald-500/10">
              <button
                type="button"
                onClick={() => onQuantityChange(product.id, Math.max(0, quantity - 1))}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
                disabled={quantity <= 0}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              
              <input
                type="number"
                min="0"
                className="w-11 h-7 border-none bg-transparent focus:outline-none text-center text-xs font-extrabold text-slate-800"
                value={quantity || ''}
                onChange={(e) => onQuantityChange(product.id, Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />

              <button
                type="button"
                onClick={() => onQuantityChange(product.id, quantity + 1)}
                className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {quantity > 0 && (
            <div className="mt-2.5 bg-emerald-50/50 rounded-xl p-2 flex justify-between items-center text-[11px] border border-emerald-100/30 animate-fade-in">
              <span className="text-slate-500 font-bold">Subtotal do Item</span>
              <span className="font-mono font-extrabold text-emerald-600 text-xs">R$ {subtotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
