import React, { useState } from 'react';
import { ShieldAlert, Key, X, Lock, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (passcode: string) => Promise<boolean>;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onAuthenticate,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Veuillez renseigner le mot de passe administrateur.');
      return;
    }

    const success = await onAuthenticate(passcode.trim());
    if (success) {
      setPasscode('');
      setError('');
      onClose();
    } else {
      setError('Mot de passe administrateur incorrect.');
    }
  };

  const handleClose = () => {
    setPasscode('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Accès Administrateur" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-300">
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
              className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-500 transition-colors shadow-sm"
            />
            <Key className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-500 pt-1 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/50 text-[11px] text-stone-400 leading-relaxed">
          Le mode administrateur permet de supprimer les musiques obsolètes et les scénarios inappropriés.
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-stone-200 text-stone-900 text-xs font-extrabold transition-all hover:scale-105 shadow-sm flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Déverrouiller</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
