import React, { useState } from 'react';
import { User, Mail, CreditCard, FileText, Info, AlertTriangle, Send } from 'lucide-react';
import { AppSettings, PaymentMethodOption } from '../types';

interface OrderFormProps {
  settings: AppSettings;
  totalQuantity: number;
  totalValue: number;
  currentUser: { uid: string; displayName?: string | null; email?: string | null; isAnonymous: boolean } | null;
  onSubmit: (formData: {
    name: string;
    email: string;
    paymentMethod: string;
    needsInvoice: boolean;
  }) => void;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'pix', label: 'PIX à vista (CNPJ: 40.587.128/0001-18)', instructions: 'Após a confirmação do pedido, efetue o PIX para a chave CNPJ: 40.587.128/0001-18 (Ispirato Produtos Naturais). Envie o comprovante na sequência.', active: true },
  { id: 'dinheiro', label: 'Dinheiro na entrega', instructions: 'O pagamento integral será conferido e efetuado em espécie no momento da entrega dos produtos na sede da revendedora.', active: true },
  { id: 'boleto-30', label: 'Faturamento: Boleto Bancário 30 dias', instructions: 'Faturamento especial faturado para 30 dias mediante aprovação cadastral de atacado. Disponível somente para parceiros autorizados antigos.', active: true },
  { id: 'boleto-30-60', label: 'Faturamento: Boleto Bancário Duplo (30/60 dias)', instructions: 'Faturamento em duas parcelas de boleto bancário (30 e 60 dias). Sujeito a análise prévia de crédito de CNPJ de atacado.', active: true }
];

export default function OrderForm({ settings, totalQuantity, totalValue, currentUser, onSubmit }: OrderFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [needsInvoice, setNeedsInvoice] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      if (!currentUser.isAnonymous) {
        setEmail(currentUser.email || '');
        setName(currentUser.displayName || '');
      } else {
        setName('Revendedor Anônimo');
      }
    }
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalQuantity < settings.minimumOrderQty) {
      alert(`O pedido mínimo é de ${settings.minimumOrderQty} itens.`);
      return;
    }
    onSubmit({ name, email, paymentMethod, needsInvoice });
  };

  const isMinMet = totalQuantity >= settings.minimumOrderQty;

  const paymentMethodsList = (settings.paymentMethods && settings.paymentMethods.length > 0 
    ? settings.paymentMethods 
    : DEFAULT_PAYMENT_METHODS).filter(method => method.active !== false);

  const selectedPaymentInfo = paymentMethodsList.find(m => m.id === paymentMethod);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 text-left">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
        <User className="text-emerald-600 w-4.5 h-4.5" />
        {settings.formTitle || 'Identificação do Revendedor'}
      </h2>

      {currentUser ? (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg p-2.5 mb-4 text-[10px] font-bold flex items-center justify-between">
          <span>✓ Vinculado a: {currentUser.isAnonymous ? 'Sua Sessão Anônima' : currentUser.email}</span>
          <span className="text-emerald-600 bg-white px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wide text-[8px] font-black shrink-0">Pedido Salvo Histórico</span>
        </div>
      ) : (
        <div className="bg-slate-50 text-slate-500 border border-slate-200/60 rounded-lg p-2.5 mb-4 text-[10px] font-semibold leading-relaxed">
          {settings.formHelpMessage || (
            <>
              💡 Faça login com <span className="font-extrabold text-emerald-600">Google</span> ou de forma <span className="font-extrabold text-[#0F172A]">Anônima</span> no topo do aplicativo para salvar este pedido no seu histórico e acompanhar seu painel pessoal!
            </>
          )}
        </div>
      )}

      <div className="space-y-3.5">
        {/* Name input */}
        <div className="space-y-1 text-left">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            Nome Completo ou Razão Social *
          </label>
          <input
            type="text"
            className="w-full border border-slate-200 focus:border-emerald-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold text-slate-800 placeholder:text-slate-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo ou Razão Social"
            required
          />
        </div>

        {/* Email input */}
        <div className="space-y-1 text-left">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            E-mail para Recebimento da Cópia *
          </label>
          <input
            type="email"
            className="w-full border border-slate-200 focus:border-emerald-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold text-slate-800 placeholder:text-slate-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="revendedor@ispirato.com"
            required
          />
        </div>

        {/* Payment selector */}
        <div className="space-y-1 text-left">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            Forma de Pagamento de Revenda *
          </label>
          <select
            className="w-full border border-slate-200 focus:border-emerald-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 font-bold text-slate-800 bg-white"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
          >
            <option value="" className="font-semibold text-slate-400">Escolha a condição de faturamento</option>
            {paymentMethodsList.map((method) => (
              <option key={method.id} value={method.id} className="font-bold text-slate-800">
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {/* Needs invoice selector */}
        <div className="space-y-1 text-left">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            {settings.formInvoiceLabel || 'Precisa de Nota Fiscal Eletrônica (NF-e)?'} *
          </label>
          <select
            className="w-full border border-slate-200 focus:border-emerald-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 font-bold text-slate-800 bg-white"
            value={needsInvoice ? 'sim' : 'nao'}
            onChange={(e) => setNeedsInvoice(e.target.value === 'sim')}
            required
          >
            <option value="nao" className="font-semibold text-slate-800">
              {settings.formInvoiceNoLabel || 'Não (Gerar somente Recibo / Sem NF-e)'}
            </option>
            <option value="sim" className="font-semibold text-slate-800">
              {settings.formInvoiceYesLabel || 'Sim (Com Nota Fiscal Eletrônica - NF-e)'}
            </option>
          </select>
        </div>

        {/* Payment instructions */}
        {paymentMethod && selectedPaymentInfo && (
          <div className="p-3 bg-emerald-50/50 border-l-2 border-emerald-600 rounded-lg text-left space-y-1 animate-fade-in">
            <div className="flex items-center gap-1 font-bold text-emerald-900 text-[10px]">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              Condições da Forma Selecionada:
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              <span>{selectedPaymentInfo.instructions}</span>
            </p>
          </div>
        )}

        {/* Quantities warnings and restrictions */}
        {!isMinMet && totalQuantity > 0 && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2.5 text-left animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-red-800">Pedido Mínimo Não Atingido</p>
              <p className="text-[10px] text-red-600 leading-relaxed mt-0.5 font-medium">
                Para consolidar as condições especiais, selecione pelo menos <strong className="font-extrabold">{settings.minimumOrderQty} unidades</strong>. Atualmente você possui <strong className="font-extrabold">{totalQuantity} un</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* The submission and WhatsApp action trigger */}
      <div className="mt-5 space-y-3">
        <button
          type="submit"
          disabled={!isMinMet}
          className="submit-button cursor-pointer"
          style={{ height: '48px', padding: '0 1.5rem', borderRadius: '8px' }}
        >
          {/* Neon animated borders */}
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          
          <span className="relative z-10 flex items-center justify-center gap-1 text-xs font-black uppercase tracking-wider text-white">
            <Send className="w-4 h-4 shrink-0" />
            {totalQuantity > 0 
              ? `Fechar via WhatsApp (${totalQuantity} un)`
              : 'Adicione produtos'
            }
          </span>
        </button>

        <p className="text-[9px] text-slate-400 text-center leading-relaxed">
          🔒 Seus dados estão seguros. Ao clicar, o pedido será formatado profissionalmente e enviado direto para a equipe de faturamento da Ispirato.
        </p>
      </div>
    </form>
  );
}
