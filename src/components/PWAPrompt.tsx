import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, Share2, X, PlusSquare } from 'lucide-react';
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
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if app is already running as PWA (standalone)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Automatically show suggestion banner after 3 seconds if not standalone
      if (!isPWA) {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else if (isIOS) {
      setShowGuide(true);
    }
  };

  // If already installed, don't show prompt
  if (isStandalone) return null;

  return (
    <>
      <AnimatePresence>
        {showPrompt && !showGuide && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-4 overflow-hidden text-left"
          >
            {/* Ambient Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl -z-10" />

            <div className="flex justify-between items-start mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center text-blue-400 shadow-sm">
                  <Download className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Leve o app no seu bolso</h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Ispirato Produtos Naturais</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrompt(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 text-xs mb-3 leading-relaxed">
              Adicione o app de revendedor à sua tela inicial para fazer pedidos rápidos com <strong>um clique</strong>, sem navegador!
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPrompt(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-500 rounded-lg hover:bg-slate-50 transition-all border border-slate-200"
              >
                Depois
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-2 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {isIOS ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                Instalar Agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Guide Modal */}
      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-50/40 rounded-full blur-3xl -z-10" />

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="text-blue-600 w-4 h-4" />
                  Instalar no iOS (iPhone/iPad)
                </h3>
                <button
                  onClick={() => setShowGuide(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-slate-600 text-xs">
                <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 mb-0.5">Abra no navegador Safari</p>
                    <p className="text-[10px] text-slate-500">Certifique-se de estar usando o Safari original do iOS.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 mb-0.5 flex items-center gap-1">
                      Toque em Compartilhar <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                    </p>
                    <p className="text-[10px] text-slate-500">Toque no ícone de compartilhamento na barra inferior do Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 mb-0.5 flex items-center gap-1">
                      Adicionar à Tela de Início <PlusSquare className="w-3.5 h-3.5 text-blue-600 inline" />
                    </p>
                    <p className="text-[10px] text-slate-500">Role a lista de opções para baixo e toque em "Adicionar à Tela de Início".</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowGuide(false)}
                className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
