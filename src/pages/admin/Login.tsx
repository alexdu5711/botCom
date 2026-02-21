import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Identifiants invalides ou problème de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              A
            </div>
            <h1 className="text-2xl font-bold">Accès Vendeur</h1>
            <p className="text-zinc-500">Connectez-vous pour gérer votre boutique.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <Input 
                label="Email" 
                type="email" 
                required 
                icon={<Mail size={18} />}
                placeholder="vendeur@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Input 
                label="Mot de passe" 
                type="password" 
                required 
                icon={<Lock size={18} />}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm border border-red-100">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg gap-2" isLoading={loading}>
              <LogIn size={20} /> Se connecter
            </Button>
          </form>

          <div className="pt-6 border-t border-zinc-100 text-center">
            <p className="text-sm text-zinc-400">
              Problème d'accès ? Contactez l'administrateur.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
