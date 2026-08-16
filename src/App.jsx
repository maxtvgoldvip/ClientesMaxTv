import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle, Calendar, Users } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [allResellersConfig, setAllResellersConfig] = useState([]);
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
      if (session) {
        fetchAppData(session.user.id);
        if (isAdmin) fetchAllResellers();
      }
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

  const fetchAllResellers = async () => {
    const { data } = await supabase.from('config_max').select('*');
    if (data) setAllResellersConfig(data);
  };

  // Lógica de bloqueio: Admin SEMPRE retorna FALSE (não bloqueia), Revendedor retorna TRUE se data > hoje
  const estaVencido = !isAdmin && (new Date() > new Date(config.data_vencimento));

  if (loading) return <div className="p-10 text-amber-400">Carregando...</div>;

  // Bloqueio de Assinatura
  if (session && estaVencido) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center text-white">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-red-500">Assinatura Vencida!</h2>
          <p className="mt-2 text-gray-400">Sua mensalidade expirou. Contate o administrador.</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado, mostra Login
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email, password }); window.location.reload(); }} className="bg-[#111827] p-8 rounded-2xl w-full max-w-sm">
          <input type="email" placeholder="E-mail" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 bg-[#1f2937] rounded-xl text-white" />
          <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-[#1f2937] rounded-xl text-white" />
          <button type="submit" className="w-full bg-amber-500 p-3 rounded-xl font-bold">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 p-4 flex justify-between items-center bg-[#111827]">
        <h1 className="font-bold text-amber-400">MAX TV GOLD VIP</h1>
        <div className="space-x-4 text-sm">
          <button onClick={() => setActiveTab('dashboard')}>Painel</button>
          {isAdmin && <button onClick={() => setActiveTab('revendedores')}>Revendedores</button>}
          <button onClick={() => setActiveTab('config')}>Configurações</button>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-red-400">Sair</button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' ? (
          <div className="text-gray-400">Bem-vindo, {isAdmin ? "Administrador" : "Revendedor"}. Seu painel está ativo.</div>
        ) : activeTab === 'revendedores' && isAdmin ? (
          <div className="bg-[#111827] p-6 rounded-2xl">
             <h2 className="text-white font-bold mb-4">Gestão de Revendedores</h2>
             {allResellersConfig.map((res) => (
                <div key={res.user_id} className="flex justify-between p-4 border-b border-gray-800">
                    <span className="text-xs text-gray-400 font-mono">{res.user_id}</span>
                    <button onClick={async () => {
                        const d = new Date(); d.setDate(d.getDate() + 30);
                        await supabase.from('config_max').update({ data_vencimento: d.toISOString() }).eq('user_id', res.user_id);
                        fetchAllResellers();
                    }} className="bg-amber-500 text-black px-3 py-1 rounded-lg text-xs font-bold">Renovar +30 Dias</button>
                </div>
             ))}
          </div>
        ) : (
          <div className="bg-[#111827] p-6 rounded-2xl max-w-sm mx-auto">
            <h2 className="text-white font-bold mb-4">Configurações</h2>
            <button onClick={async () => { await supabase.from('config_max').upsert({ user_id: session.user.id, ...config }, { onConflict: 'user_id' }); alert('Salvo!'); }} className="bg-amber-500 w-full py-3 rounded-xl mt-4 text-black font-bold">Salvar Configurações</button>
          </div>
        )}
      </main>
    </div>
  );
}
