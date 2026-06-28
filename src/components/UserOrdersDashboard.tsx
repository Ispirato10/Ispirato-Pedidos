import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Calendar, DollarSign, CreditCard, FileText, 
  MessageCircle, CheckCircle, Clock, X, ArrowLeft, RefreshCw, Layers 
} from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Order, AppSettings } from '../types';

interface UserOrdersDashboardProps {
  currentUser: { uid: string; email?: string | null; isAnonymous: boolean } | null;
  settings: AppSettings;
  onClose: () => void;
}

export default function UserOrdersDashboard({ 
  currentUser, 
  settings, 
  onClose 
}: UserOrdersDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchUserOrders();
    }
  }, [currentUser]);

  const fetchUserOrders = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const ordersCol = collection(db, 'orders');
      // Create a query specifically for this user's orders
      const q = query(ordersCol, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const ordersList: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        ordersList.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      
      // Sort by date descending
      ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ordersList);
    } catch (err: any) {
      console.error('Error fetching user orders:', err);
      const isUserAdmin = currentUser?.email === 'sac@lojaispirato.com.br' || currentUser?.email === 'contaparaplugns@gmail.com';
      if (isUserAdmin) {
        // Fallback in case of index issues: try listing and filtering locally (safe for admins)
        try {
          const querySnapshot = await getDocs(collection(db, 'orders'));
          const ordersList: Order[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.userId === currentUser.uid) {
              ordersList.push({ id: docSnap.id, ...data } as Order);
            }
          });
          ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(ordersList);
        } catch (innerErr) {
          handleFirestoreError(innerErr, OperationType.LIST, 'orders');
        }
      } else {
        setOrders([]);
        if (err?.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Concluído
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
            <X className="w-3 h-3" /> Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Processando
          </span>
        );
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX à Vista';
      case 'dinheiro': return 'Espécie na entrega';
      case 'boleto-30': return 'Boleto (30 dias)';
      case 'boleto-30-60': return 'Boleto Duplo (30/60 dias)';
      default: return method;
    }
  };

  const handleResendToWhatsapp = (order: Order) => {
    let msg = `*REENVIO DE PEDIDO DE ATACADO - ISPIRATO*\n`;
    msg += `\uD83C\uDD94 *ID do Pedido:* ${order.id.slice(0, 8)}...\n\n`;
    msg += `\uD83D\uDC64 *Revendedor:* ${order.userName}\n`;
    msg += `\uD83D\uDCE7 *E-mail:* ${order.userEmail}\n`;
    msg += `\uD83D\uDCB3 *Faturamento:* ${getPaymentMethodLabel(order.paymentMethod)}\n`;
    msg += `\uD83D\uDCC4 *Nota Fiscal:* ${order.needsInvoice ? 'Sim, emitir NF-e' : 'Não necessita'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `\uD83D\uDCE6 *ITENS DO PEDIDO:*\n`;

    order.items.forEach(item => {
      msg += `\n• *${item.name}*\n`;
      msg += `  Lote: ${item.quantity} un × R$ ${item.price.toFixed(2)} (${item.tierName || 'Atacado'})\n`;
      msg += `  Subtotal: R$ ${item.subtotal.toFixed(2)}\n`;
    });

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `\uD83D\uDCB0 *TOTAL GERAL: R$ ${order.total.toFixed(2)}*\n`;
    msg += `\uD83D\uDCE6 *Total Itens:* ${order.totalQuantity} unidades\n\n`;
    msg += `_Este é um reenvio de histórico de pedido salvo._`;

    const cleanNumber = settings.whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 shadow-xs">
        <Layers className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-extrabold text-slate-800">Identificação Necessária</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Faça login com o Google ou crie um acesso Anônimo temporário para salvar e acompanhar seus pedidos anteriores.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
        >
          Voltar ao Catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Top Banner Navigation Row */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-all cursor-pointer"
            title="Voltar ao catálogo"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Meus Pedidos Salvos
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold">
              Histórico de orçamentos e faturamentos registrados por {currentUser.isAnonymous ? 'esta conta anônima' : currentUser.email}.
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchUserOrders}
          className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-600 transition-all cursor-pointer"
          title="Atualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-bold">Consultando seu histórico na nuvem...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Nenhum pedido localizado</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Seus pedidos enviados através desta conta serão listados aqui. Monte seu lote no catálogo e envie para salvar seu primeiro orçamento!
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Começar a Comprar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Orders List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Pedidos Realizados ({orders.length})</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isSelected 
                        ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/10' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 font-mono">
                        ID: #{order.id.slice(0, 6).toUpperCase()}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">{formatDate(order.createdAt).split(' ')[0]}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span>{order.totalQuantity} un. de produtos</span>
                      <span className="text-emerald-600 underline font-extrabold hover:text-emerald-700">Ver detalhes →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Detail View */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                
                {/* Header detail */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 font-mono bg-slate-200/60 px-2 py-0.5 rounded">
                        ID #{selectedOrder.id.toUpperCase()}
                      </span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Enviado em {formatDate(selectedOrder.createdAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleResendToWhatsapp(selectedOrder)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    Reenviar no WhatsApp
                  </button>
                </div>

                {/* Details grid */}
                <div className="p-6 space-y-6">
                  
                  {/* Info block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase">Revendedor</p>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedOrder.userName}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{selectedOrder.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase">Faturamento Escolhido</p>
                      <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        {getPaymentMethodLabel(selectedOrder.paymentMethod)}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {selectedOrder.needsInvoice ? 'Precisa de Nota Fiscal (NF-e)' : 'Somente Recibo'}
                      </p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Produtos do Orçamento</h4>
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between gap-4 bg-white text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {item.quantity} unidades × R$ {item.price.toFixed(2)} ({item.tierName || 'Atacado'})
                            </p>
                          </div>
                          <span className="font-extrabold text-slate-800 shrink-0">
                            R$ {item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals card */}
                  <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total do Pedido</p>
                      <p className="text-xs text-slate-500 font-semibold">{selectedOrder.totalQuantity} unidades solicitadas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">
                        R$ {selectedOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold">Lote Especial Atacado</p>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 border-dashed flex flex-col items-center justify-center min-h-[300px]">
                <Layers className="w-8 h-8 text-slate-200 mb-3 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-600">Selecione um pedido</h4>
                <p className="text-[11px] text-slate-400 mt-1">Escolha um pedido ao lado para visualizar os detalhes completos.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
