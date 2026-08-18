import React, { useState } from 'react';
import { ShieldAlert, Key, X, Lock, CheckCircle2 } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (passcode: string) => boolean;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onAuthenticate,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Veuillez renseigner le mot de passe administrateur.');
      return;
    }

    const success = onAuthenticate(passcode.trim());
    if (success) {
      setPasscode('');
      setError('');
      onClose();
    } else {
      setError('Mot de passe administrateur incorrect.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base font-display">Accès Administrateur</h3>
              <p className="text-xs text-stone-500">Gestion et suppression des contenus</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPasscode('');
              setError('');
              onClose();
            }}
            className="text-stone-400 hover:text-stone-900 p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              Code d'accès secret :
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Entrez le mot de passe..."
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors shadow-sm"
              />
              <Key className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 pt-1 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 text-[11px] text-stone-500 leading-relaxed">
            Le mode administrateur permet de supprimer les musiques obsolètes et les scénarios inappropriés.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setPasscode('');
                setError('');
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-extrabold transition-all hover:scale-105 shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Déverrouiller</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
