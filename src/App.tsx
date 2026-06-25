import React, { useState, useEffect } from 'react';
import { 
  Leaf, Shield, Sparkles, ShoppingBag, Send, CreditCard, ChevronRight, 
  HelpCircle, ExternalLink, RefreshCw, MessageCircle, ArrowRight,
  Search, LogIn, LogOut, User, ShieldCheck, Tag, Layers, Flame, Settings, Info,
  Download
} from 'lucide-react';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, signInAnonymously, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { Product, AppSettings } from './types';

// Importing components
import PWAPrompt from './components/PWAPrompt';
import AdminPanel from './components/AdminPanel';
import ProductCard from './components/ProductCard';
import OrderSummary from './components/OrderSummary';
import OrderForm from './components/OrderForm';
import UserOrdersDashboard from './components/UserOrdersDashboard';

const SEED_SETTINGS: AppSettings = {
  whatsappNumber: '5511986256501',
  minimumOrderQty: 6,
  welcomeMessage: 'Faça seu pedido de forma rápida e prática',
  customOrderText: 'Abaixo estão listados todos os detalhes de produtos e preços do revendedor.',
  adminEmails: ['contaparaplugns@gmail.com', 'sac@lojaispirato.com.br']
};

const SEED_PRODUCTS: Product[] = [
  {
    id: '✅9015035',
    name: 'Spray pés e axilas Ispirato',
    description: 'Spray neutralizador de odores para pés e axilas com ingredientes naturais de altíssima qualidade',
    image: 'https://static.wixstatic.com/media/6889ff_f874bba1b30044e2bb6003c0da891c46~mv2.png',
    prices: { base: 18.99, bulk12: 17.99, bulk500: 16.99 },
    icon: 'fa-spray-can',
    active: true,
    category: 'Cosméticos'
  },
  {
    id: '✅9015028',
    name: 'Spray micoses e fungos Ispirato',
    description: 'Spray fortalecedor e revitalizante para unhas de uso profissional e doméstico',
    image: 'https://static.wixstatic.com/media/6889ff_c7e676f14ef8410b840a7fb1ead138e9~mv2.png',
    prices: { base: 19.99, bulk12: 18.99, bulk500: 17.99 },
    icon: 'fa-hand-sparkles',
    active: true,
    category: 'Cosméticos'
  },
  {
    id: '✅9015004',
    name: 'Óleo para unhas Ispirato',
    description: 'Óleo nutritivo para unhas e cutículas, ideal para manter unhas hidratadas e bonitas',
    image: 'https://static.wixstatic.com/media/6889ff_fa5f747cf90f45fa9f1adcc89f0e5451~mv2.png',
    prices: { base: 19.99, bulk12: 18.99, bulk500: 17.99 },
    icon: 'fa-droplet',
    active: true,
    category: 'Cosméticos'
  },
  {
    id: '✅9015011',
    name: 'Base para unhas Ispirato',
    description: 'Base fortalecedora de unhas enriquecida com queratina, estimula o crescimento',
    image: 'https://static.wixstatic.com/media/6889ff_c5dbf132eb3f47f6bed72421c1ae99fe~mv2.png',
    prices: { base: 19.99, bulk12: 18.99, bulk500: 17.99 },
    icon: 'fa-hand-holding-droplet',
    active: true,
    category: 'Cosméticos'
  },
  {
    id: '✅9015083',
    name: 'Creme Multifuncional CB2 Ispirato',
    description: 'Promove alívio muscular e leve sensação anestésica refrescante instantânea',
    image: 'https://static.wixstatic.com/media/6889ff_9ac40474fb134eed91fad6cd46064bac~mv2.png',
    prices: { base: 18.99, bulk12: 17.99, bulk500: 16.99 },
    icon: 'fa-pump-medical',
    active: true,
    category: 'Cosméticos'
  },
  {
    id: '✅9015085',
    name: 'Pioskito Spray Multifuncional Ispirato',
    description: 'Blend capilar potente com bioativos veganos de Melaleuca e Citronela para proteção capilar',
    image: 'https://static.wixstatic.com/media/6889ff_e2eaefedfc004a668f248acbd87077df~mv2.png',
    prices: { base: 18.99, bulk12: 17.99, bulk500: 16.99 },
    icon: 'fa-spray-can-sparkles',
    active: true,
    category: 'Cosméticos'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('isAppAdmin') === 'true';
  });
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Firestore data state
  const [settings, setSettings] = useState<AppSettings>(SEED_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [dataLoading, setDataLoading] = useState(true);

  // Interactive filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Listen to Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const isUserAdmin = user.email === 'contaparaplugns@gmail.com';
        setIsAdmin(isUserAdmin);
        if (isUserAdmin) {
          sessionStorage.setItem('isAppAdmin', 'true');
        } else {
          sessionStorage.removeItem('isAppAdmin');
          // Security fix: If a normal user logs in, ensure admin panel is closed
          setShowAdminPanel(false);
        }
      } else {
        const isLocalAdmin = sessionStorage.getItem('isAppAdmin') === 'true';
        setIsAdmin(isLocalAdmin);
        // Security fix: If no user and no local admin session, hide panel
        if (!isLocalAdmin) {
          setShowAdminPanel(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Load App Settings and Products
  useEffect(() => {
    loadDatabase();

    // Proactive PWA updates check on app load and focus
    if ('serviceWorker' in navigator) {
      // Check on startup
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });

      // Check on window/focus regain (ideal for mobile background-to-foreground transitions)
      const checkUpdate = () => {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch((e) => console.log('SW update check ignored', e));
        });
      };

      window.addEventListener('focus', checkUpdate);
      return () => window.removeEventListener('focus', checkUpdate);
    }
  }, []);

  const loadDatabase = async () => {
    setDataLoading(true);
    try {
      // 1. Fetch settings
      const settingsDocRef = doc(db, 'settings', 'global');
      let settingsDocSnap;
      try {
        settingsDocSnap = await getDoc(settingsDocRef);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, 'settings/global');
      }

      let currentSettings = SEED_SETTINGS;

      if (settingsDocSnap && settingsDocSnap.exists()) {
        currentSettings = settingsDocSnap.data() as AppSettings;
        setSettings(currentSettings);
      } else {
        // Only seed if user is actually authenticated with Firebase as an admin to prevent write permission errors for anonymous/unauthenticated users.
        const isRealAdmin = auth.currentUser?.email === 'sac@lojaispirato.com.br' || 
                            auth.currentUser?.email === 'contaparaplugns@gmail.com';
        if (isRealAdmin) {
          try {
            await setDoc(settingsDocRef, SEED_SETTINGS);
          } catch (err: any) {
            console.warn('Unable to seed global settings client-side:', err);
          }
        } else {
          console.info('Global settings do not exist in Firestore yet. Using local default settings in-memory.');
        }
        setSettings(SEED_SETTINGS);
      }

      // 2. Fetch products
      const productsColRef = collection(db, 'products');
      let productsSnapshot;
      try {
        productsSnapshot = await getDocs(productsColRef);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'products');
      }

      const loadedProducts: Product[] = [];

      if (productsSnapshot) {
        productsSnapshot.forEach((docSnap) => {
          loadedProducts.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
      }

      if (loadedProducts.length > 0) {
        setProducts(loadedProducts);
      } else {
        // Only seed if user is actually authenticated with Firebase as an admin to prevent write permission errors for anonymous/unauthenticated users.
        const isRealAdmin = auth.currentUser?.email === 'sac@lojaispirato.com.br' || 
                            auth.currentUser?.email === 'contaparaplugns@gmail.com';
        if (isRealAdmin) {
          for (const prod of SEED_PRODUCTS) {
            try {
              await setDoc(doc(db, 'products', prod.id), prod);
            } catch (err: any) {
              console.warn(`Unable to seed product ${prod.id} client-side:`, err);
            }
          }
        } else {
          console.info('No products found in Firestore. Using local default products in-memory.');
        }
        setProducts(SEED_PRODUCTS);
      }
    } catch (err) {
      console.error('Error loading database:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, newQty: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, newQty)
    }));
  };

  const getPriceByQty = (product: Product, qty: number) => {
    if (qty >= 500 && product.prices.bulk500) return product.prices.bulk500;
    if (qty >= 12) return product.prices.bulk12;
    return product.prices.base;
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        alert('O pop-up de autenticação foi bloqueado. Abra o aplicativo em tela cheia para fazer login.');
      } else if (err.code === 'auth/unauthorized-domain') {
        alert(
          '⚠️ Erro de Domínio Não Autorizado!\n\n' +
          'O domínio "ispirato-pedidos.vercel.app" precisa ser adicionado como um domínio autorizado no seu Firebase Console.\n\n' +
          'Para resolver isso em 1 minuto:\n' +
          '1. Acesse https://console.firebase.google.com/ e entre no seu projeto.\n' +
          '2. No menu lateral esquerdo, clique em "Authentication".\n' +
          '3. Clique na aba "Settings" (Configurações) no topo.\n' +
          '4. No menu à esquerda das configurações, clique em "Authorized domains" (Domínios autorizados).\n' +
          '5. Clique em "Add domain" (Adicionar domínio) e insira: ispirato-pedidos.vercel.app\n' +
          '6. Clique em "Add" (Adicionar).\n\n' +
          'Depois de fazer isso, o login funcionará instantaneamente no seu novo domínio!'
        );
      } else {
        alert('Falha na autenticação do Google.');
      }
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Anonymous login error:', err);
      let msg = 'Erro ao entrar de forma anônima.';
      if (err.code === 'auth/admin-restricted-operation') {
        msg = 'O Login Anônimo está desativado no Firebase Console. Vá em Authentication > Sign-in Method e ative o provedor "Anônimo".';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Operação não permitida. Verifique as configurações de autenticação no Firebase.';
      }
      alert(msg);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('isAppAdmin');
      setIsAdmin(false);
      setShowAdminPanel(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleAdminIconClick = () => {
    if (isAdmin) {
      setShowAdminPanel(!showAdminPanel);
    } else {
      setAdminLoginError('');
      setShowAdminLoginModal(true);
    }
  };

  const handleAdminGoogleLogin = async () => {
    setAdminLoginError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email === 'contaparaplugns@gmail.com') {
        setIsAdmin(true);
        sessionStorage.setItem('isAppAdmin', 'true');
        setShowAdminLoginModal(false);
        setShowAdminPanel(true);
      } else {
        // If not the right email, sign them out from Firebase too so they don't stay logged in as a non-admin
        await signOut(auth);
        setAdminLoginError('Acesso Negado: Este e-mail Google não tem permissão de administrador.');
      }
    } catch (err: any) {
      console.error('Admin Google Login Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setAdminLoginError(
          'Domínio Não Autorizado no Firebase! Adicione "ispirato-pedidos.vercel.app" na lista de Domínios Autorizados no menu Authentication > Settings > Authorized domains do Firebase Console para liberar o login.'
        );
      } else {
        setAdminLoginError('Erro ao entrar com Google: ' + (err.message || 'Erro desconhecido'));
      }
    }
  };

  const handleAdminPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    if (adminPassword.trim() === 'ispirato2026') {
      setIsAdmin(true);
      sessionStorage.setItem('isAppAdmin', 'true');
      setShowAdminLoginModal(false);
      setShowAdminPanel(true);
      setAdminPassword('');
    } else if (!adminPassword) {
      setAdminLoginError('Por favor, insira a senha de administrador.');
    } else {
      setAdminLoginError('Senha de administrador incorreta.');
    }
  };

  const handleOrderSubmit = async (formData: {
    name: string;
    email: string;
    paymentMethod: string;
    needsInvoice: boolean;
  }) => {
    const activeProducts = products.filter(p => p.active);
    const selectedItems = activeProducts.filter(p => (quantities[p.id] || 0) > 0);
    const totalQty = selectedItems.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);
    const totalVal = selectedItems.reduce((sum, p) => {
      const qty = quantities[p.id] || 0;
      return sum + (getPriceByQty(p, qty) * qty);
    }, 0);

    if (totalQty < settings.minimumOrderQty) {
      alert(`Quantidade mínima de ${settings.minimumOrderQty} produtos não atingida.`);
      return;
    }

    let msg = `*NOVO PEDIDO DE ATACADO - ISPIRATO*\n\n`;
    msg += `👤 *Revendedor:* ${formData.name}\n`;
    msg += `📧 *E-mail:* ${formData.email}\n`;
    msg += `💳 *Faturamento:* ${
      formData.paymentMethod === 'pix' ? 'PIX à Vista (Chave CNPJ: 40.587.128/0001-18)' :
      formData.paymentMethod === 'dinheiro' ? 'Espécie na entrega' :
      formData.paymentMethod === 'boleto-30' ? 'Boleto Bancário (30 dias)' :
      formData.paymentMethod === 'boleto-30-60' ? 'Boleto Duplo (30/60 dias)' :
      formData.paymentMethod
    }\n`;
    msg += `📄 *Nota Fiscal:* ${formData.needsInvoice ? 'Sim, emitir NF-e' : 'Não necessita'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📦 *ITENS DO PEDIDO:*\n`;

    const itemsForFirestore: any[] = [];

    selectedItems.forEach(product => {
      const qty = quantities[product.id];
      const unitPrice = getPriceByQty(product, qty);
      const sub = unitPrice * qty;
      const tier = qty >= 500 && product.prices.bulk500 ? 'bulk500' : qty >= 12 ? 'bulk12' : 'base';
      const tierName = tier === 'bulk500' ? 'Atacadão (500+)' : tier === 'bulk12' ? 'Atacado (12+)' : 'Unitário';

      msg += `\n• *${product.name}*\n`;
      msg += `  Código: ${product.id}\n`;
      msg += `  Lote: ${qty} un × R$ ${unitPrice.toFixed(2)} (${tierName})\n`;
      msg += `  Subtotal: R$ ${sub.toFixed(2)}\n`;

      itemsForFirestore.push({
        productId: product.id,
        name: product.name,
        quantity: qty,
        price: unitPrice,
        subtotal: sub,
        tierName
      });
    });

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *TOTAL GERAL: R$ ${totalVal.toFixed(2)}*\n`;
    msg += `📦 *Total Itens:* ${totalQty} unidades\n\n`;
    msg += `_${settings.customOrderText}_`;

    try {
      await addDoc(collection(db, 'orders'), {
        userId: currentUser?.uid || 'anonymous',
        userName: formData.name,
        userEmail: formData.email,
        createdAt: new Date().toISOString(),
        items: itemsForFirestore,
        total: totalVal,
        totalQuantity: totalQty,
        paymentMethod: formData.paymentMethod,
        needsInvoice: formData.needsInvoice,
        status: 'pending'
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }

    const cleanNumber = settings.whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const activeProducts = products.filter(p => p.active);
  
  // Real-time Search and Category logic
  const uniqueCategories = ['Todos', ...Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean)))];

  const filteredProducts = activeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedItems = activeProducts.filter(p => (quantities[p.id] || 0) > 0);
  const totalQuantity = selectedItems.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);
  const totalValue = selectedItems.reduce((sum, p) => {
    const qty = quantities[p.id] || 0;
    return sum + (getPriceByQty(p, qty) * qty);
  }, 0);

  const metaProgress = Math.min(100, (totalQuantity / settings.minimumOrderQty) * 100);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      
      {/* 1. Left Sidebar Navigation for Desktop */}
      <aside className="w-64 bg-[#0F172A] text-white hidden lg:flex flex-col shrink-0 border-r border-slate-800 justify-between select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-extrabold shadow-sm shadow-emerald-500/20">
                I
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white uppercase">Ispirato Pro</h1>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Portal de Atacado</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => {
                setShowAdminPanel(false);
                setShowMyOrders(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                (!showAdminPanel && !showMyOrders)
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Catálogo de Produtos
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  setShowAdminPanel(false);
                  setShowMyOrders(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  showMyOrders 
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                Meus Pedidos Salvos
              </button>
            )}

            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Suporte WhatsApp
            </a>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-prompt'))}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all cursor-pointer text-left"
            >
              <Download className="w-4 h-4 text-emerald-400 animate-pulse" />
              Instalar Aplicativo
            </button>
          </nav>

          {/* Meta de Pedido Status Block */}
          <div className="mx-4 my-2 p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta de Atacado</p>
            <div className="mt-2 flex justify-between items-end text-xs">
              <span className="font-bold text-slate-200">{totalQuantity} de {settings.minimumOrderQty} un</span>
              <span className={`font-extrabold uppercase text-[9px] px-1 rounded ${
                totalQuantity >= settings.minimumOrderQty ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {totalQuantity >= settings.minimumOrderQty ? 'Atingida ✓' : 'Pendente'}
              </span>
            </div>
            
            {/* Real Progress Bar */}
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  totalQuantity >= settings.minimumOrderQty ? 'bg-emerald-500' : 'bg-emerald-500/50'
                }`}
                style={{ width: `${metaProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Modo Administrador */}
        <div className="p-4 border-t border-slate-800">
          {isAdmin ? (
            <div className="bg-slate-800/40 p-3 rounded-xl border border-emerald-500/20">
              <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Modo Administrador</p>
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  showAdminPanel 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {showAdminPanel ? 'Ver Catálogo' : 'Painel de Controle'}
              </button>
            </div>
          ) : (
            <div className="text-center p-2">
              <p className="text-[10px] text-slate-500 font-medium">Ispirato Produtos Naturais</p>
              <p className="text-[9px] text-slate-600">CNPJ: 40.587.128/0001-18</p>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main Area (Sticky Header + Variable Content) */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden pb-20 lg:pb-0">
        
        {/* Sticky Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-2 sm:px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs select-none">
          
          {/* Left search bar */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..." 
                className="w-[75px] min-[360px]:w-[95px] min-[400px]:w-44 sm:w-80 pl-7 sm:pl-9 pr-1.5 sm:pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 font-semibold"
              />
              <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute left-2.5 sm:left-3 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1 sm:gap-4">
            
            {/* Elegant PWA Install Badge for both mobile and desktop */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-prompt'))}
              className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100 text-emerald-800 py-1.5 px-2.5 rounded-full text-[10px] font-black cursor-pointer shadow-3xs transition-all active:scale-95 shrink-0"
              title="Instalar Aplicativo (PWA)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 animate-bounce" />
              <span className="hidden min-[385px]:inline">Baixar App</span>
            </button>

            {/* Config button: Visible ONLY to real admin on desktop */}
            {isAdmin && (
              <button
                onClick={handleAdminIconClick}
                className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer hidden lg:block bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300"
                title="Configurações Admin"
              >
                <Settings className="w-4.5 h-4.5 animate-spin-slow" />
              </button>
            )}

            {/* User Account Bar integrated */}
            <div className="flex items-center gap-1 sm:gap-2 sm:border-l sm:border-slate-100 sm:pl-4">
              {(currentUser || isAdmin) ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                      {isAdmin ? 'Administrador' : (currentUser?.isAnonymous ? 'Revendedor Anônimo' : currentUser?.displayName || 'Usuário')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {isAdmin ? 'contaparaplugns@gmail.com' : (currentUser?.email || (currentUser?.isAnonymous ? 'Dados Locais' : 'Sem e-mail'))}
                    </p>
                  </div>
                  {currentUser?.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="User profile" 
                      className="w-7 h-7 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200">
                      {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    onClick={handleGoogleLogin}
                    className="py-1.5 px-1.5 min-[360px]:px-2 sm:px-3 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Entrar com Google"
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="hidden min-[380px]:inline">Google</span>
                  </button>

                  <button
                    onClick={handleAnonymousLogin}
                    className="py-1.5 px-1.5 min-[360px]:px-2 sm:px-3 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Entrar de forma Anônima"
                  >
                    <User className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="hidden min-[380px]:inline">Anônimo</span>
                    <span className="min-[380px]:hidden">Anon</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Body content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {showAdminPanel ? (
            <AdminPanel 
              settings={settings}
              onSettingsUpdate={(newSettings) => {
                setSettings(newSettings);
              }}
              products={products}
              onProductsUpdate={loadDatabase}
              onClose={() => setShowAdminPanel(false)}
              onLogout={handleLogout}
            />
          ) : showMyOrders ? (
            <UserOrdersDashboard 
              currentUser={currentUser}
              settings={settings}
              onClose={() => setShowMyOrders(false)}
            />
          ) : (
            <div className="space-y-6">
              
              {/* Header Title Grid */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    Catálogo de Revenda Ispirato
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Preços escalonados e faturamento facilitado para revendedores cadastrados.</p>
                </div>
                
                {/* Meta alert badge at top */}
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold self-start md:self-auto flex items-center gap-1.5 ${
                  totalQuantity >= settings.minimumOrderQty 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : 'bg-amber-50 border-amber-100 text-amber-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${totalQuantity >= settings.minimumOrderQty ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {totalQuantity >= settings.minimumOrderQty ? 'Meta Mínima Atingida' : 'Falta atingir a meta mínima'}
                </div>
              </div>

              {/* Dynamic Pills Categories Filter Row */}
              <div className="flex items-center gap-2 select-none w-full overflow-hidden">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden xs:inline shrink-0">Categorias:</span>
                <div className="flex-1 flex overflow-x-auto lg:flex-wrap gap-1.5 no-scrollbar pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scroll-smooth">
                  {uniqueCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat 
                          ? 'bg-[#0F172A] text-white' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Order Workspace Grid */}
              {dataLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-bold">Carregando catálogo de revenda...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left: Products Showcase */}
                  <div className="lg:col-span-2 space-y-4">
                    {filteredProducts.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-2">
                        <p className="font-bold text-sm">Nenhum produto localizado</p>
                        <p className="text-xs text-slate-400">Verifique os filtros selecionados ou digite outro termo de busca.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredProducts.map((prod) => (
                          <ProductCard 
                            key={prod.id}
                            product={prod}
                            quantity={quantities[prod.id] || 0}
                            totalCartQuantity={totalQuantity}
                            onQuantityChange={handleQuantityChange}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right sidebars: Sticky Summaries & Delivery Forms */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="sticky top-20 space-y-4">
                      
                      {/* Pricing discount tier guide card */}
                      <div className="bg-[#0F172A] text-white p-5 rounded-xl border border-slate-800 relative overflow-hidden text-left shadow-sm">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-xl" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Regras de Preços (Lotes)</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Adicione produtos para ativar automaticamente as faixas de descontos:
                        </p>
                        
                        <div className="mt-3.5 space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-5.5 h-5.5 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">1</div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">Preço Unitário</p>
                              <p className="text-[10px] text-slate-500">De 1 a 11 unidades do mesmo produto.</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="w-5.5 h-5.5 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">12</div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">Desconto Atacado (12+ un)</p>
                              <p className="text-[10px] text-slate-500">Ativado automaticamente para lotes do mesmo produto.</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="w-5.5 h-5.5 rounded bg-orange-600/20 text-orange-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">500</div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">Distribuidor Atacadão (500+ un)</p>
                              <p className="text-[10px] text-slate-500">Condições máximas de faturamento direto da fábrica.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order details calculations */}
                      <OrderSummary 
                        products={products}
                        quantities={quantities}
                        paymentMethod=""
                        needsInvoice={false}
                      />

                      {/* Checkout reseller credentials info */}
                      <OrderForm 
                        settings={settings}
                        totalQuantity={totalQuantity}
                        totalValue={totalValue}
                        currentUser={currentUser}
                        onSubmit={handleOrderSubmit}
                      />

                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer credits */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-[11px] text-slate-400 font-medium select-none">
          <p className="flex items-center justify-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            Ispirato Produtos Naturais Ltda. 
            <span 
              onClick={() => {
                setAdminLoginError('');
                setShowAdminLoginModal(true);
              }}
              className="ml-1 select-text"
            >
              CNPJ: 40.587.128/0001-18
            </span>
          </p>
          <p className="mt-1 flex items-center justify-center gap-2">
            <span>© 2026 Todos os direitos reservados. Portal Oficial de Revenda Autorizada.</span>
            <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px]">v1.6.2</span>
          </p>
        </footer>

      </main>

      {/* Mobile Bottom Navigation Bar (PWA Optimal Layout) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1 flex items-center justify-around h-16 lg:hidden select-none">
        
        {/* Catalog Tab */}
        <button
          onClick={() => {
            setShowAdminPanel(false);
            setShowMyOrders(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all cursor-pointer ${
            (!showAdminPanel && !showMyOrders)
              ? 'text-emerald-600 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 mb-0.5 ${(!showAdminPanel && !showMyOrders) ? 'scale-110' : ''} transition-transform`} />
            {totalQuantity > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white animate-pulse">
                {totalQuantity}
              </span>
            )}
          </div>
          <span className="text-[10px]">Catálogo</span>
        </button>

        {/* My Orders Tab */}
        <button
          onClick={() => {
            setShowAdminPanel(false);
            setShowMyOrders(true);
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all cursor-pointer ${
            showMyOrders
              ? 'text-emerald-600 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <Layers className={`w-5 h-5 mb-0.5 ${showMyOrders ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px]">Meus Pedidos</span>
        </button>

        {/* WhatsApp Support Tab */}
        <a
          href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
        >
          <MessageCircle className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Suporte</span>
        </a>

        {/* Admin Tab: Visible only to real admin */}
        {isAdmin && (
          <button
            onClick={() => {
              setShowMyOrders(false);
              setShowAdminPanel(!showAdminPanel);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all cursor-pointer ${
              showAdminPanel
                ? 'text-amber-600 font-extrabold'
                : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5 scale-110 animate-spin-slow transition-transform text-amber-500" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}

      </div>

      {/* Elegant PWA Trigger install message banner and support for installable devices */}
      <PWAPrompt />

      {/* Admin Login Modal (Restricted access) */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 relative text-left">
            
            {/* Elegant Header Accent */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 h-2 w-full" />
            
            <div className="p-6">
              {/* Header Title */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Acesso Restrito</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Modo Gestor</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAdminLoginModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <span className="text-lg font-bold">×</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-4">
                Para configurar o pedido mínimo, novos lotes ou gerenciar os produtos, identifique-se abaixo com suas credenciais:
              </p>

              {/* Login Options */}
              <div className="space-y-4">
                <button
                  onClick={handleAdminGoogleLogin}
                  className="w-full py-2.5 px-4 bg-white border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 font-extrabold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  ENTRAR COM GOOGLE ADMIN
                </button>

                <p className="text-[10px] text-slate-400 text-center font-semibold leading-relaxed">
                  Identifique-se com a conta <strong>contaparaplugns@gmail.com</strong>
                </p>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-black uppercase tracking-wider">ou por senha</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* Password Form Bypass */}
                <form onSubmit={handleAdminPasswordLogin} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Senha do Administrador
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Digite a senha..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ACESSAR COMO GESTOR
                  </button>
                </form>

                {/* Error message */}
                {adminLoginError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[10px] sm:text-[11px] font-bold leading-relaxed">
                    <div className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{adminLoginError}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
