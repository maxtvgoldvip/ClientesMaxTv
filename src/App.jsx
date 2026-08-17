import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, LogOut, Users, Settings, Plus, Search, Trash2, Edit2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [resellers, setResellers] = useState([]);
  const [newResellerEmail, setNewResellerEmail] = useState('');

  const adminEmail = 'maxtvgoldvip@gmail.com';
  const isAdmin = session && session.user.email === adminEmail;

  const [config, setConfig] = useState({ data_vencimento: new Date().toISOString() });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchAppData(session.user.id, session.user.email);
        if (session.user.email === adminEmail) fetchAllResellers();
      }
      setLoading(false);
    });
  }, []);

  const fetchAppData = async (userId, userEmail) => {
    try {
      let configData = null;
      if (userEmail === adminEmail) {
        const { data } = await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle();
        configData = data;
      } else {
        const { data } = await supabase.from('config_max').select('*').eq('user_id', userEmail).maybeSingle();
        configData = data;
      }
      if (configData) setConfig(configData);
    } catch (e) { console.error(e); }
  };

  const fetchAllResellers = async () => {
    const { data } = await supabase.from('config_max').select('*');
    if (data) setResellers(data);
  };

  const handleManualAddReseller = async () => {
    if (!newResellerEmail) return;
    let d = new Date(); d.setDate(d.getDate() + 30);
    const { error } = await supabase.from('config_max').upsert([{ 
        user_id: newResellerEmail.trim(), 
        data_vencimento: d.toISOString(),
        custo_painel1: 5.00, revenda_painel1: 8.00, revenda_painel2: 5.00, custo_painel2_fixo: 200.00
    }], { onConflict: 'user_id' });
    if (error) alert('Erro: ' + error.message);
    else { alert('Revendedor adicionado!'); setNewResellerEmail(''); fetchAllResellers(); }
  };

  const handleRenewReseller = async (id) => {
    let d = new Date(); d.setDate(d.getDate() + 30);
    await supabase.from('config_max').update({ data_vencimento: d.toISOString() }).eq('id', id);
    fetchAllResellers();
  };

  const isExpired = !isAdmin && new Date() > new Date(config.data_vencimento);

  if (loading) return <div className="p-10 text-amber-500 text-center">Carregando...</div>;

  if (session && isExpired) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Assinatura Vencida</h2>
          <p className="text-gray-300 text-sm mb-6">Sua mensalidade expirou. Contate o suporte para renovar.</p>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-600 py-3 rounded-xl text-white font-bold flex items-center justify-center space-x-2">
            <LogOut className="w-5 h-5" /><span>Sair da Conta</span>
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if(error) alert(error.message); else window.location.reload(); }} className="bg-[#111827] border border-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
          <h1 className="text-xl font-bold text-white text-center">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
          <input type="email" placeholder="E-mail" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-amber-500 text-sm" />
          <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-amber-500 text-sm" />
          <button type="submit" className="w-full bg-amber-500 text-gray-950 p-3 rounded-xl font-bold">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      {/* Cabeçalho Organizado e Responsivo */}
      <header className="bg-[#111827] border-b border-gray-800 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-2">
            <Tv className="w-6 h-6 text-amber-400" />
            <h1 className="text-base font-bold tracking-wide">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto justify-center pb-1 sm:pb-0">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'dashboard' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Painel</button>
            {isAdmin && <button onClick={() => setActiveTab('revendedores')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'revendedores' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Revendedores</button>}
            <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'config' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Configurações</button>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="p-1.5 bg-red-950/60 text-red-400 rounded-lg ml-2" title="Sair"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full flex-1 space-y-4">
        {activeTab === 'dashboard' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2">Painel de Clientes</h2>
            <p className="text-gray-400 text-sm">Gerencie seus clientes e ativos por aqui.</p>
          </div>
        )}

        {activeTab === 'revendedores' && isAdmin && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white">Gestão de Revendedores</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="email" placeholder="E-mail do revendedor" value={newResellerEmail} onChange={(e) => setNewResellerEmail(e.target.value)} className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-amber-500" />
              <button onClick={handleManualAddReseller} className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl font-bold text-white text-sm transition">Adicionar</button>
            </div>
            <div className="space-y-2 pt-2">
              {resellers.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-900 border border-gray-800 rounded-xl gap-2">
                  <span className="text-xs font-mono text-gray-300 break-all">{r.user_id} <br/><span className="text-gray-500">Venc: {new Date(r.data_vencimento).toLocaleDateString()}</span></span>
                  <button onClick={() => handleRenewReseller(r.id)} className="w-full sm:w-auto bg-amber-500 text-gray-950 px-4 py-2 rounded-lg font-bold text-xs">Renovar +30 Dias</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl shadow-xl max-w-lg mx-auto text-center space-y-4">
            <h2 className="text-lg font-bold text-white">Configurações do Sistema</h2>
            <p className="text-sm text-gray-400">Painel configurado e pronto para uso.</p>
          </div>
        )}
      </main>
    </div>
  );
}
