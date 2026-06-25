import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share2, X, PlusSquare, Info, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    const handleOpenPrompt = () => {
      setShowPrompt(true);
    };
    window.addEventListener('open-pwa-prompt', handleOpenPrompt);
    return () => {
      window.removeEventListener('open-pwa-prompt', handleOpenPrompt);
    };
  }, []);

  useEffect(() => {
    // Check if app is already running as PWA (standalone)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Only show if not installed and not dismissed in this session
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      if (!isPWA && !isDismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 2500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback trigger: if event doesn't fire but we are not standalone and not dismissed, show it anyway!
    if (!isPWA && !isDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Use native installation prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else if (isIOS) {
      // Show iOS step-by-step guide
      setShowIOSGuide(true);
    } else {
      // Fallback guide for Android/Chrome when beforeinstallprompt did not fire
      setShowAndroidGuide(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  // If already installed, don't show prompt
  if (isStandalone) return null;

  return (
    <>
      <AnimatePresence>
        {showPrompt && !showIOSGuide && !showAndroidGuide && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-22 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md bg-white border border-emerald-100 rounded-2xl shadow-2xl p-4 overflow-hidden text-left"
          >
            {/* Elegant Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/60 rounded-full blur-2xl -z-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-50/40 rounded-full blur-xl -z-10" />

            <div className="flex justify-between items-start mb-2.5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-800 rounded-xl flex items-center justify-center p-0.5 shadow-md border border-amber-500/20 shrink-0">
                  <img 
                    src="/favicon.png" 
                    alt="Ispirato Logo" 
                    className="w-full h-full object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-[13px] font-black text-slate-900 leading-tight">Instalar Aplicativo</h3>
                  <p className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider">Ispirato • Pedidos</p>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 text-xs mb-3.5 leading-relaxed relative z-10 font-medium">
              Tenha uma experiência muito mais rápida e segura! Faça pedidos com <strong>um clique</strong> diretamente da sua tela inicial.
            </p>

            <div className="flex gap-2 relative z-10">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 transition-all border border-slate-200 cursor-pointer"
              >
                Agora Não
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-[1.5] py-2.5 px-4 text-xs font-extrabold text-white bg-emerald-800 hover:bg-emerald-950 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-900"
              >
                <Download className="w-3.5 h-3.5 animate-pulse" />
                Instalar Grátis
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Guide Modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl relative overflow-hidden text-left border border-slate-100"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50/40 rounded-full blur-3xl -z-10" />

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    Instalar no iOS (Safari)
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-3 text-slate-600 text-xs font-medium">
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-0.5">Abra no navegador Safari</p>
                    <p className="text-[10px] text-slate-500 font-medium">Este recurso requer o navegador original do iOS.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                      Toque em Compartilhar <Share2 className="w-3.5 h-3.5 text-emerald-800 inline" />
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Toque no ícone de compartilhar na barra inferior do Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                      Adicionar à Tela de Início <PlusSquare className="w-3.5 h-3.5 text-emerald-800 inline" />
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Role a lista para baixo e selecione "Adicionar à Tela de Início".</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowIOSGuide(false);
                  sessionStorage.setItem('pwa_prompt_dismissed', 'true');
                  setShowPrompt(false);
                }}
                className="w-full mt-5 py-3 bg-emerald-800 hover:bg-emerald-950 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
              >
                Pronto, entendi!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Android/Chrome Fallback Guide Modal */}
      <AnimatePresence>
        {showAndroidGuide && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl relative overflow-hidden text-left border border-slate-100"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50/40 rounded-full blur-3xl -z-10" />

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                    <Info className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    Como instalar o App
                  </h3>
                </div>
                <button
                  onClick={() => setShowAndroidGuide(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-3 text-slate-600 text-xs font-medium">
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-0.5 flex items-center gap-1">
                      Abra o Menu <MoreVertical className="w-3.5 h-3.5 inline text-slate-500" />
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium font-medium">Toque nos três pontinhos no canto superior direito do seu navegador.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                      Clique em "Instalar aplicativo"
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Ou selecione a opção "Adicionar à tela inicial" no menu do navegador.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-0.5">Aproveite no seu celular</p>
                    <p className="text-[10px] text-slate-500 font-medium">Pronto! O ícone dourado do app Ispirato estará disponível no seu celular.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAndroidGuide(false);
                  sessionStorage.setItem('pwa_prompt_dismissed', 'true');
                  setShowPrompt(false);
                }}
                className="w-full mt-5 py-3 bg-emerald-800 hover:bg-emerald-950 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
              >
                Entendi, obrigado!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
