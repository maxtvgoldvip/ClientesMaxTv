import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [config, setConfig] = useState({
    custo_painel1: 5.00,
    revenda_painel1: 8.00,
    revenda_painel2: 5.00,
    custo_painel2_fixo: 200.00,
    data_vencimento: new Date().toISOString()
  });

  const admins = ['maxtvgoldvip@gmail.com'];
  const isAdmin = session && admins.includes(session.user.email);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAppData(session.user.id);
      setLoading(false);
    });
  }, []);

  const fetchAppData = async (userId) => {
    const { data: clientData } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
    if (clientData) setClients(clientData);
    const { data: configData } = await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle();
    if (configData) {
      setConfig({
        custo_painel1: configData.custo_painel1 ?? 5.00,
        revenda_painel1: configData.revenda_painel1 ?? 8.00,
        revenda_painel2: configData.revenda_painel2 ?? 5.00,
        custo_painel2_fixo: configData.custo_painel2_fixo ?? 200.00,
        data_vencimento: configData.data_vencimento ?? new Date().toISOString()
      });
    }
  };

  const handleSaveConfig = async () => {
    await supabase.from('config_max').upsert({ user_id: session.user.id, ...config }, { onConflict: 'user_id' });
    alert('Configurações salvas!');
  };

  // Bloqueio apenas se não for Admin E a data estiver vencida
  const estaVencido = !isAdmin && (new Date() > new Date(config.data_vencimento));

  if (loading) return <div className="text-amber-400 p-10">Carregando...</div>;

  if (session && estaVencido) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Assinatura Vencida!</h2>
          <p className="text-gray-300">Entre em contato com o suporte para renovar.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email, password: e.target.password.value }); window.location.reload(); }} className="bg-[#111827] p-8 rounded-2xl">
          <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 bg-[#1f2937] text-white rounded-xl" />
          <input type="password" name="password" placeholder="Senha" className="w-full p-3 mb-4 bg-[#1f2937] text-white rounded-xl" />
          <button type="submit" className="w-full bg-amber-500 p-3 rounded-xl font-bold">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <header className="bg-[#111827] border-b border-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
        <div className="space-x-4">
          <button onClick={() => setActiveTab('dashboard')} className="hover:text-amber-400">Painel</button>
          <button onClick={() => setActiveTab('config')} className="hover:text-amber-400">Configurações</button>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}><LogOut className="w-5 h-5 text-red-400"/></button>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' ? (
          <div className="text-center text-gray-500">Dashboard de Clientes (Seu conteúdo anterior permanece aqui)</div>
        ) : (
          <div className="bg-[#111827] p-8 rounded-2xl max-w-lg mx-auto border border-gray-800">
            <h2 className="text-white font-bold mb-6 text-xl">Configurações</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">Custo Ativo P1</label>
                <input type="number" value={config.custo_painel1} onChange={(e) => setConfig({...config, custo_painel1: e.target.value})} className="w-full p-3 bg-[#1f2937] rounded-xl text-white"/>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase">Revenda P1</label>
                <input type="number" value={config.revenda_painel1} onChange={(e) => setConfig({...config, revenda_painel1: e.target.value})} className="w-full p-3 bg-[#1f2937] rounded-xl text-white"/>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase">Revenda P2</label>
                <input type="number" value={config.revenda_painel2} onChange={(e) => setConfig({...config, revenda_painel2: e.target.value})} className="w-full p-3 bg-[#1f2937] rounded-xl text-white"/>
              </div>
              {isAdmin && (
                <div>
                  <label className="text-xs text-gray-400 uppercase">Custo Fixo P2 (Admin)</label>
                  <input type="number" value={config.custo_painel2_fixo} onChange={(e) => setConfig({...config, custo_painel2_fixo: e.target.value})} className="w-full p-3 bg-[#1f2937] rounded-xl text-white"/>
                </div>
              )}
              <button onClick={handleSaveConfig} className="w-full bg-amber-500 py-3 rounded-xl font-bold mt-4">Salvar</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
