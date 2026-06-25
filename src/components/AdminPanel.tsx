import React, { useState, useEffect } from 'react';
import { 
  Settings, Database, ClipboardList, Plus, Trash2, Edit2, Check, X, 
  Save, Phone, Info, ShoppingBag, FileText, CheckCircle, RefreshCw, Layers, LogOut, CreditCard
} from 'lucide-react';
import { db, auth, googleProvider, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { Product, AppSettings, Order } from '../types';

interface AdminPanelProps {
  settings: AppSettings;
  onSettingsUpdate: (newSettings: AppSettings) => void;
  products: Product[];
  onProductsUpdate: () => void;
  onClose: () => void;
  onLogout?: () => void;
}

export default function AdminPanel({ 
  settings, 
  onSettingsUpdate, 
  products, 
  onProductsUpdate, 
  onClose,
  onLogout
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'products' | 'orders'>('settings');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);

  // Security check: Verify if the user should even be here
  useEffect(() => {
    const isLocalAdmin = sessionStorage.getItem('isAppAdmin') === 'true';
    const checkAuth = (user: any) => {
      if (user) {
        const isUserAdmin = user.email === 'sac@lojaispirato.com.br' || user.email === 'contaparaplugns@gmail.com';
        if (!isUserAdmin && !isLocalAdmin) {
          onClose();
        }
      } else if (!isLocalAdmin) {
        onClose();
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
      checkAuth(user);
    });
    
    return () => unsubscribe();
  }, [onClose]);

  const isAdminAuthed = firebaseUser && firebaseUser.email === 'contaparaplugns@gmail.com';

  const currentAuthEmail = firebaseUser?.email || 'Nenhum (Modo Local)';
  const isCorrectAdminEmail = firebaseUser?.email === 'contaparaplugns@gmail.com';

  // App Settings edit state
  const [editSettings, setEditSettings] = useState<AppSettings>({ ...settings });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Product edit/create states
  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null); // null if creating or inactive
  const [productForm, setProductForm] = useState<Partial<Product>>({
    id: '',
    name: '',
    description: '',
    image: '',
    prices: { base: 0, bulk12: 0, bulk500: 0 },
    active: true,
    category: 'Suplementos',
    icon: 'fa-leaf'
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  useEffect(() => {
    setEditSettings({
      ...settings,
      formTitle: settings.formTitle || 'Identificação do Revendedor',
      formHelpMessage: settings.formHelpMessage || 'Faça login com Google ou de forma Anônima no topo do aplicativo para salvar este pedido no seu histórico e acompanhar seu painel pessoal!',
      formInvoiceLabel: settings.formInvoiceLabel || 'Precisa de Nota Fiscal Eletrônica (NF-e)?',
      formInvoiceNoLabel: settings.formInvoiceNoLabel || 'Não (Gerar somente Recibo / Sem NF-e)',
      formInvoiceYesLabel: settings.formInvoiceYesLabel || 'Sim (Com Nota Fiscal Eletrônica - NF-e)',
      paymentMethods: settings.paymentMethods && settings.paymentMethods.length > 0 
        ? settings.paymentMethods 
        : [
            { id: 'pix', label: 'PIX à vista (CNPJ: 40.587.128/0001-18)', instructions: 'Após a confirmação do pedido, efetue o PIX para a chave CNPJ: 40.587.128/0001-18 (Ispirato Produtos Naturais). Envie o comprovante na sequência.', active: true },
            { id: 'dinheiro', label: 'Dinheiro na entrega', instructions: 'O pagamento integral será conferido e efetuado em espécie no momento da entrega dos produtos na sede da revendedora.', active: true },
            { id: 'boleto-30', label: 'Faturamento: Boleto Bancário 30 dias', instructions: 'Faturamento especial faturado para 30 dias mediante aprovação cadastral de atacado. Disponível somente para parceiros autorizados antigos.', active: true },
            { id: 'boleto-30-60', label: 'Faturamento: Boleto Bancário Duplo (30/60 dias)', instructions: 'Faturamento em duas parcelas de boleto bancário (30 e 60 dias). Sujeito a análise prévia de crédito de CNPJ de atacado.', active: true }
          ]
    });
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const clearAppCache = async () => {
    if (window.confirm('Isso irá limpar todos os arquivos temporários e recarregar o aplicativo. Deseja continuar?')) {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
        
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        
        // Limpa sessionStorage também
        sessionStorage.clear();
        
        window.location.reload();
      } catch (err) {
        console.error('Erro ao limpar cache:', err);
        alert('Erro ao limpar cache. Tente fechar e abrir o navegador.');
      }
    }
  };

  const handleAddPaymentMethod = () => {
    const currentMethods = editSettings.paymentMethods || [];
    const newMethod = {
      id: 'opcao_' + Date.now(),
      label: 'Nova Forma de Pagamento',
      instructions: 'Instruções para o revendedor após escolher esta forma.',
      active: true
    };
    setEditSettings({
      ...editSettings,
      paymentMethods: [...currentMethods, newMethod]
    });
  };

  const handleRemovePaymentMethod = (id: string) => {
    const currentMethods = editSettings.paymentMethods || [];
    setEditSettings({
      ...editSettings,
      paymentMethods: currentMethods.filter(m => m.id !== id)
    });
  };

  const handlePaymentMethodChange = (id: string, field: 'label' | 'instructions' | 'active', value: any) => {
    const currentMethods = editSettings.paymentMethods || [];
    setEditSettings({
      ...editSettings,
      paymentMethods: currentMethods.map(m => m.id === id ? { ...m, [field]: value } : m)
    });
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const ordersList: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        ordersList.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      // Sort by date desc
      ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ordersList);
    } catch (err: any) {
      console.warn('Erro ao carregar pedidos do Firestore:', err);
      setOrdersError(err.message || String(err));
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    try {
      await setDoc(doc(db, 'settings', 'global'), editSettings);
      onSettingsUpdate(editSettings);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setSettingsError(err.message || 'Falha ao salvar. Verifique se você está autenticado como administrador.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setProductError(null);

    const pid = productForm.id?.trim();
    if (!pid) {
      setProductError('O Código/SKU do produto é obrigatório.');
      setSavingProduct(false);
      return;
    }

    try {
      const cleanProduct: Product = {
        id: pid,
        name: productForm.name || 'Sem Nome',
        description: productForm.description || '',
        image: productForm.image || 'https://via.placeholder.com/300',
        prices: {
          base: Number(productForm.prices?.base) || 0,
          bulk12: Number(productForm.prices?.bulk12) || 0,
          bulk500: Number(productForm.prices?.bulk500) || 0,
        },
        active: productForm.active ?? true,
        category: productForm.category || 'Outros',
        icon: productForm.icon || 'fa-leaf'
      };

      await setDoc(doc(db, 'products', pid), cleanProduct);
      onProductsUpdate();
      
      // Reset form
      setProductForm({
        id: '',
        name: '',
        description: '',
        image: '',
        prices: { base: 0, bulk12: 0, bulk500: 0 },
        active: true,
        category: 'Suplementos',
        icon: 'fa-leaf'
      });
      setIsEditingProduct(null);
      alert('Produto salvo com sucesso!');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `products/${pid}`);
      setProductError('Ocorreu um erro ao salvar o produto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProductClick = (prod: Product) => {
    setIsEditingProduct(prod.id);
    setProductForm({ ...prod });
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza de que deseja excluir este produto permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        onProductsUpdate();
        alert('Produto excluído com sucesso!');
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white px-4 py-4 sm:px-6 sm:py-6 shadow-md flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
            Painel de Configuração Adm
          </h1>
          <p className="text-emerald-100 text-[10px] sm:text-xs mt-0.5 sm:mt-1">Configure o formulário, produtos, preços e gerencie os pedidos</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={onClose}
            className="flex-1 sm:flex-none py-2 px-3 sm:px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer"
          >
            Voltar ao App
          </button>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="flex-1 sm:flex-none py-2.5 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all text-center flex items-center justify-center gap-2 shadow-lg cursor-pointer border-2 border-rose-400 animate-pulse"
                title="Sair da conta de Administrador"
              >
                <LogOut className="w-4 h-4" />
                SAIR DO MODO ADMIN
              </button>
            )}
          </div>
        </div>

      {!isAdminAuthed && (
        <div className="bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs max-w-7xl mx-auto mt-4 px-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <Info className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <div className="text-left">
              <p className="font-bold text-amber-900">Acesso Restrito: Gravação Bloqueada</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Você entrou como administrador local, mas o Firebase não reconhece sua sessão. 
                Para salvar as alterações no banco de dados, você <strong>precisa</strong> estar logado com sua conta Google <strong>contaparaplugns@gmail.com</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await signInWithPopup(auth, googleProvider);
              } catch (err: any) {
                console.error('Login error in admin panel:', err);
                if (err.code === 'auth/popup-blocked') {
                  alert('O pop-up de login foi bloqueado pelo navegador. Por favor, permita pop-ups ou abra o app em uma nova guia.');
                } else {
                  alert('Falha ao autenticar com o Google.');
                }
              }
            }}
            className="w-full sm:w-auto py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap cursor-pointer text-center"
          >
            Entrar com Google Admin
          </button>
        </div>
      )}

      {isAdminAuthed && (
        <div className="bg-emerald-50 border border-emerald-100 p-3 text-emerald-800 text-xs flex items-center justify-between max-w-7xl mx-auto mt-4 px-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Autenticado como: <strong>{currentAuthEmail}</strong></span>
            {isCorrectAdminEmail && <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Admin Oficial</span>}
          </div>
        </div>
      )}

      {/* Central de Ajuda do Firebase para o Gestor */}
      <div className="bg-white border-2 border-dashed border-emerald-200 p-4 sm:p-5 text-slate-700 shadow-sm max-w-7xl mx-auto mt-4 px-4 rounded-3xl">
        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-emerald-600 shrink-0" />
          💡 Central de Suporte do Firebase para o Gestor Ispirato
        </h3>
        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mb-4">
          Como você está usando o seu projeto Firebase pessoal (<strong className="text-slate-800">ispirato-pedidos-pwa</strong>), algumas configurações rápidas precisam ser feitas no seu Console do Firebase para liberar o funcionamento de gravação em tempo real e o login do Google.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Problema 1: Permissões do Firestore */}
          <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-100">
            <p className="font-extrabold text-xs text-emerald-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              1. Liberar Leitura e Escrita (Firestore)
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
              Se os produtos do banco não puderem ser salvos, atualize as regras de segurança:
            </p>
            <ol className="text-[10px] sm:text-[11px] text-slate-600 space-y-1.5 list-decimal list-inside pl-1 font-semibold leading-normal">
              <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-extrabold">Firebase Console</a> e selecione seu projeto.</li>
              <li>No menu esquerdo, clique em <strong>Firestore Database</strong>.</li>
              <li>Clique na aba <strong>Rules (Regras)</strong> no topo.</li>
              <li>Substitua o conteúdo atual pelas regras do arquivo <code>firestore.rules</code> ou altere temporariamente para: <br /><code className="block bg-slate-100 p-1.5 rounded text-[9px] font-mono mt-1 text-slate-700">allow read, write: if true;</code></li>
              <li>Clique em <strong>Publish (Publicar)</strong>.</li>
            </ol>
          </div>

          {/* Problema 2: Domínio Autorizado */}
          <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-100">
            <p className="font-extrabold text-xs text-blue-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              2. Liberar o Login do Google (Authentication)
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
              Para corrigir o erro de domínio não autorizado (<code className="bg-blue-50 text-blue-700 text-[10px] px-1 rounded">auth/unauthorized-domain</code>):
            </p>
            <ol className="text-[10px] sm:text-[11px] text-slate-600 space-y-1.5 list-decimal list-inside pl-1 font-semibold leading-normal">
              <li>No menu lateral esquerdo, clique em <strong>Authentication</strong>.</li>
              <li>Clique na aba <strong>Settings (Configurações)</strong> no topo.</li>
              <li>No menu à esquerda das configurações, clique em <strong>Authorized domains (Domínios autorizados)</strong>.</li>
              <li>Clique em <strong>Add domain (Adicionar domínio)</strong> e adicione o domínio:<br />
                <code className="bg-white border border-blue-100 px-1 py-0.5 rounded text-[9px] font-mono select-all text-blue-800">ispirato-pedidos.vercel.app</code>
              </li>
              <li>Adicione também o domínio do preview do estúdio:<br />
                <code className="bg-white border border-blue-100 px-1 py-0.5 rounded text-[9px] font-mono select-all text-blue-800">ais-dev-pdwwovkddr3rextormz6f3-687343072325.us-east1.run.app</code>
              </li>
            </ol>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-emerald-800 font-extrabold uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            ✅ Bypass Ativo: Você acessou com a senha de gestor local e pode operar mesmo se o Firebase estiver desconfigurado!
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-4 sm:mt-6">
        
        {/* Navigation Tabs - stacked on mobile, row on desktop */}
        <div className="mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 select-none">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full sm:flex-1 py-3 sm:py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-emerald-800 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Opções Gerais
            </button>
            
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full sm:flex-1 py-3 sm:py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'products' 
                  ? 'bg-emerald-800 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Database className="w-4 h-4" />
              Gerenciar Produtos
            </button>
            
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full sm:flex-1 py-3 sm:py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'orders' 
                  ? 'bg-emerald-800 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Histórico de Pedidos
            </button>
          </div>
        </div>

        {/* Tab content: 1. Settings */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6 relative overflow-hidden">
            {showSaveSuccess && (
              <div className="absolute inset-0 bg-emerald-50/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-3xl shadow-xl border border-emerald-100 flex flex-col items-center text-center gap-3 scale-in-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-emerald-900 font-bold text-lg">Salvo com Sucesso!</h3>
                    <p className="text-emerald-600 text-sm">As configurações foram atualizadas na nuvem.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="text-emerald-700" />
                Configurações do Formulário de Pedido
              </h2>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  SAIR DO MODO ADM
                </button>
              )}
            </div>

            {settingsError && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Erro ao salvar as configurações</p>
                  <p className="text-xs mt-1">{settingsError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Número do Celular WhatsApp
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-sm focus:outline-none transition-all"
                  value={editSettings.whatsappNumber}
                  onChange={(e) => setEditSettings({ ...editSettings, whatsappNumber: e.target.value })}
                  placeholder="5511986256501"
                  required
                />
                <p className="text-[11px] text-slate-500">Formato: DDI + DDD + Número (ex: 5511986256501 para São Paulo). Não use espaços ou traços.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  Quantidade Mínima de Pedido
                </label>
                <input
                  type="number"
                  className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-sm focus:outline-none transition-all"
                  value={editSettings.minimumOrderQty}
                  onChange={(e) => setEditSettings({ ...editSettings, minimumOrderQty: Number(e.target.value) || 0 })}
                  placeholder="6"
                  required
                />
                <p className="text-[11px] text-slate-500">Número mínimo de itens no total que o revendedor precisa pedir para fechar.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                Mensagem de Boas-Vindas Elegante (Cabeçalho do App)
              </label>
              <textarea
                className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-sm focus:outline-none transition-all h-20"
                value={editSettings.welcomeMessage}
                onChange={(e) => setEditSettings({ ...editSettings, welcomeMessage: e.target.value })}
                placeholder="Faça seu pedido de forma rápida e prática"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Instruções Personalizadas do WhatsApp (Cabeçalho da mensagem enviada)
              </label>
              <textarea
                className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-sm focus:outline-none transition-all h-24"
                value={editSettings.customOrderText}
                onChange={(e) => setEditSettings({ ...editSettings, customOrderText: e.target.value })}
                placeholder="Abaixo estão listados todos os detalhes de produtos e preços do revendedor."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                Emails de Administradores (separados por vírgula)
              </label>
              <input
                type="text"
                className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-sm focus:outline-none transition-all"
                value={editSettings.adminEmails.join(', ')}
                onChange={(e) => setEditSettings({ 
                  ...editSettings, 
                  adminEmails: e.target.value.split(',').map(mail => mail.trim()).filter(Boolean) 
                })}
                placeholder="contaparaplugns@gmail.com, outro@gmail.com"
                required
              />
              <p className="text-[11px] text-slate-500">Apenas os usuários autenticados com estes emails terão permissão para ver este painel.</p>
            </div>

            {/* Customização das mensagens do formulário de pedidos */}
            <div className="pt-6 border-t border-slate-200/80 space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                Configurações Visuais do Formulário de Pedidos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Título da Seção de Identificação</label>
                  <input
                    type="text"
                    className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-xs focus:outline-none transition-all font-semibold text-slate-800"
                    value={editSettings.formTitle || ''}
                    onChange={(e) => setEditSettings({ ...editSettings, formTitle: e.target.value })}
                    placeholder="Identificação do Revendedor"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Pergunta Nota Fiscal (NF-e)</label>
                  <input
                    type="text"
                    className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-xs focus:outline-none transition-all font-semibold text-slate-800"
                    value={editSettings.formInvoiceLabel || ''}
                    onChange={(e) => setEditSettings({ ...editSettings, formInvoiceLabel: e.target.value })}
                    placeholder="Precisa de Nota Fiscal Eletrônica (NF-e)?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Opção "Não" para Nota Fiscal</label>
                  <input
                    type="text"
                    className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-xs focus:outline-none transition-all font-semibold text-slate-800"
                    value={editSettings.formInvoiceNoLabel || ''}
                    onChange={(e) => setEditSettings({ ...editSettings, formInvoiceNoLabel: e.target.value })}
                    placeholder="Não (Gerar somente Recibo / Sem NF-e)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Opção "Sim" para Nota Fiscal</label>
                  <input
                    type="text"
                    className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-xs focus:outline-none transition-all font-semibold text-slate-800"
                    value={editSettings.formInvoiceYesLabel || ''}
                    onChange={(e) => setEditSettings({ ...editSettings, formInvoiceYesLabel: e.target.value })}
                    placeholder="Sim (Com Nota Fiscal Eletrônica - NF-e)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Mensagem informativa (Banner acima do formulário)</label>
                <textarea
                  className="w-full border-2 border-slate-200 focus:border-emerald-600 rounded-xl p-3 text-xs focus:outline-none transition-all h-20 font-semibold leading-relaxed text-slate-800"
                  value={editSettings.formHelpMessage || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, formHelpMessage: e.target.value })}
                  placeholder="Faça login com Google ou de forma Anônima no topo do aplicativo para salvar este pedido no seu histórico e acompanhar seu painel pessoal!"
                />
              </div>
            </div>

            {/* Gerenciamento das Formas de Pagamento */}
            <div className="pt-6 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
                  Gerenciador de Formas de Pagamento
                </h3>
                <button
                  type="button"
                  onClick={handleAddPaymentMethod}
                  className="bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200/60 text-emerald-800 font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> ADICIONAR NOVO
                </button>
              </div>

              <div className="space-y-3.5">
                {(editSettings.paymentMethods || []).map((method, index) => (
                  <div key={method.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 relative space-y-3">
                    <button
                      type="button"
                      onClick={() => handleRemovePaymentMethod(method.id)}
                      className="absolute top-3.5 right-3.5 text-rose-500 hover:text-rose-700 p-1.5 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                      title="Remover forma de pagamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 pr-10">
                      <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                        Forma #{index + 1} ({method.id})
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePaymentMethodChange(method.id, 'active', !(method.active !== false))}
                        className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          method.active !== false 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border-slate-300/60 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${method.active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {method.active !== false ? 'Ativado' : 'Desativado'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Título / Nome (exibido na seleção) *</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 focus:border-emerald-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all font-semibold text-slate-800"
                          value={method.label}
                          onChange={(e) => handlePaymentMethodChange(method.id, 'label', e.target.value)}
                          placeholder="PIX à vista (CNPJ: ...)"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Instruções de pagamento (exibidas após seleção) *</label>
                        <textarea
                          className="w-full border border-slate-200 focus:border-emerald-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all h-16 font-semibold text-slate-700 leading-relaxed"
                          value={method.instructions}
                          onChange={(e) => handlePaymentMethodChange(method.id, 'instructions', e.target.value)}
                          placeholder="Instruções de como o cliente realiza o pagamento..."
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {(editSettings.paymentMethods || []).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    Nenhuma forma de pagamento personalizada configurada. Usando as 4 originais do sistema.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  Resolução de Problemas (Cache)
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Se você não estiver visualizando as alterações mais recentes, o navegador pode estar mantendo uma versão antiga na memória.
                </p>
                <button
                  type="button"
                  onClick={clearAppCache}
                  className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-[10px] font-black flex items-center gap-2 transition-all border border-slate-200 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  FORÇAR LIMPEZA DE CACHE DO NAVEGADOR
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings || !isAdminAuthed}
              className={`w-full py-3.5 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isAdminAuthed 
                  ? 'bg-emerald-800 hover:bg-emerald-950 text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-5 h-5" />
              {savingSettings ? 'Salvando Configurações...' : 'Salvar Alterações Gerais'}
            </button>
            {!isAdminAuthed && (
              <p className="text-center text-amber-700 text-[10px] font-bold">
                ⚠️ Você precisa clicar em "Entrar com Google Admin" no topo para poder salvar.
              </p>
            )}
          </form>
        )}

        {/* Tab content: 2. Products */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create / Edit Form */}
            <form onSubmit={handleProductSubmit} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 lg:col-span-1 h-fit">
              <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                {isEditingProduct ? <Edit2 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                {isEditingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
              </h3>

              {productError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
                  {productError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Código do Produto (SKU / ID Único) *</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-600"
                  value={productForm.id}
                  onChange={(e) => setProductForm({ ...productForm, id: e.target.value })}
                  placeholder="✅9015035"
                  disabled={!!isEditingProduct}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Nome do Produto *</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-600"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Spray pés e axilas Ispirato"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Descrição do Produto</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-600 h-16"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Spray neutralizador de odores..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">URL da Imagem do Produto</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-600"
                  value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                  placeholder="https://static.wixstatic.com/media/..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-600"
                    value={productForm.prices?.base}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      prices: { ...(productForm.prices as any), base: Number(e.target.value) || 0 }
                    })}
                    placeholder="18.99"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Atacado 12+ (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-600"
                    value={productForm.prices?.bulk12}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      prices: { ...(productForm.prices as any), bulk12: Number(e.target.value) || 0 }
                    })}
                    placeholder="17.99"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Atacadão 500+ (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-600"
                    value={productForm.prices?.bulk500}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      prices: { ...(productForm.prices as any), bulk500: Number(e.target.value) || 0 }
                    })}
                    placeholder="16.99"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prodActive"
                    checked={productForm.active}
                    onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <label htmlFor="prodActive" className="text-xs font-bold text-slate-700 cursor-pointer">Ativo / À Venda</label>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                {isEditingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProduct(null);
                      setProductForm({
                        id: '',
                        name: '',
                        description: '',
                        image: '',
                        prices: { base: 0, bulk12: 0, bulk500: 0 },
                        active: true,
                        category: 'Suplementos',
                        icon: 'fa-leaf'
                      });
                    }}
                    className="flex-1 py-2 px-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingProduct || !isAdminAuthed}
                  className={`flex-2 py-2 px-4 text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all ${
                    isAdminAuthed 
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingProduct ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
              {!isAdminAuthed && (
                <p className="text-center text-amber-700 text-[10px] font-bold">
                  ⚠️ Login Firebase necessário para salvar.
                </p>
              )}
            </form>

            {/* List of Products */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                Produtos Disponíveis ({products.length})
              </h3>

              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
                {products.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Nenhum produto cadastrado no banco.</p>
                ) : (
                  products.map((prod) => (
                    <div 
                      key={prod.id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                        prod.active 
                          ? 'border-slate-100 bg-slate-50 hover:bg-slate-100/50' 
                          : 'border-rose-100 bg-rose-50/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          className="w-12 h-12 sm:w-11 sm:h-11 object-contain bg-white rounded-lg p-1 border border-slate-200 shrink-0"
                        />
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 leading-snug">{prod.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Cód: {prod.id} {prod.active ? '' : '• Inativo'}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-bold text-emerald-800">
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100/50">U: R$ {prod.prices.base.toFixed(2)}</span>
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100/50">A12+: R$ {prod.prices.bulk12.toFixed(2)}</span>
                            {prod.prices.bulk500 > 0 && (
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100/50">A500+: R$ {prod.prices.bulk500.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 border-t border-slate-100/60 pt-2 sm:pt-0 sm:border-0">
                        <button
                          onClick={() => handleEditProductClick(prod)}
                          className="flex-1 sm:flex-none py-1.5 px-3 sm:p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all border border-amber-100 sm:border-0 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="sm:hidden">Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="flex-1 sm:flex-none py-1.5 px-3 sm:p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-rose-100 sm:border-0 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="sm:hidden">Excluir</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab content: 3. Orders History */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-md font-bold text-slate-800">
                Histórico de Pedidos de Atacado
              </h3>
              <button 
                onClick={fetchOrders}
                disabled={ordersLoading}
                className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-all"
                title="Recarregar Pedidos"
              >
                <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {ordersError && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Info className="w-4 h-4 shrink-0" />
                  Falha nas permissões do banco de dados (Firestore)
                </p>
                <p className="text-[11px] leading-relaxed">
                  Não foi possível ler os pedidos do Firestore do seu projeto. Certifique-se de que as regras de segurança do seu Firebase Console permitem a leitura. Veja o banner de ajuda acima para resolver em 1 minuto.
                </p>
                <p className="text-[10px] text-rose-500 font-mono mt-1">Detalhe: {ordersError}</p>
              </div>
            )}

            {ordersLoading ? (
              <p className="text-xs text-slate-400 text-center py-10">Buscando pedidos no Firebase...</p>
            ) : orders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Nenhum pedido foi realizado ainda.</p>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-left">
                        <p className="text-xs font-bold text-emerald-900">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-slate-500">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-200/60 px-2.5 py-1 rounded-full">
                          {order.paymentMethod.toUpperCase()}
                        </span>
                        
                        <select
                          className={`text-xs font-bold rounded-full px-3 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-emerald-600 ${
                            order.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : order.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                        >
                          <option value="pending">Pendente</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Client Details */}
                      <div className="text-left space-y-1">
                        <p className="text-xs font-bold text-slate-800">Dados do Revendedor:</p>
                        <p className="text-xs text-slate-600 font-medium">👤 Nome: <strong className="text-slate-800">{order.userName}</strong></p>
                        <p className="text-xs text-slate-600 font-medium">📧 E-mail: <strong className="text-slate-800">{order.userEmail}</strong></p>
                        <p className="text-xs text-slate-600 font-medium">📄 N. Fiscal: <strong className="text-slate-800">{order.needsInvoice ? 'Sim' : 'Não'}</strong></p>
                      </div>

                      {/* Items Details */}
                      <div className="text-left space-y-2">
                        <p className="text-xs font-bold text-slate-800">Itens do Pedido ({order.totalQuantity} un):</p>
                        <div className="max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50 space-y-1">
                          {order.items.map((item, index) => (
                            <p key={index} className="text-[11px] text-slate-600 font-medium flex justify-between">
                              <span>• {item.name} ({item.quantity}x)</span>
                              <span className="font-bold text-slate-700">R$ {item.subtotal.toFixed(2)}</span>
                            </p>
                          ))}
                        </div>
                        <p className="text-sm font-bold text-emerald-800 text-right">
                          Total: R$ {order.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
