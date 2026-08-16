import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle, Users, Calendar } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [config, setConfig] = useState({ custo_painel1: 5.00, revenda_painel1: 8.00, revenda_painel2: 5.00, custo_painel2_fixo: 200.00, data_vencimento: new Date().toISOString() });
  const [resellers, setResellers] = useState([]);
  
  const admins = ['maxtvgoldvip@gmail.com'];
  const isAdmin = session && admins.includes(session.user.email);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
        if (isAdmin) fetchAllResellers();
      }
      setLoading(false);
    });
  }, []);

  const fetchData = async (uid) => {
    const { data: c } = await supabase.from('clientes_max').select('*').eq('user_id', uid);
    const { data: cf } = await supabase.from('config_max').select('*').eq('user_id', uid).maybeSingle();
    if (c) setClients(c);
    if (cf) setConfig(cf);
  };

  const fetchAllResellers = async () => {
    const { data } = await supabase.from('config_max').select('*');
    if (data) setResellers(data);
  };

  // BLOQUEIO APENAS PARA REVENDEDORES
  const isExpired = !isAdmin && new Date() > new Date(config.data_vencimento);

  if (loading) return <div>Carregando...</div>;

  if (session && isExpired) {
    return <div className="p-20 text-center text-red-500 font-bold text-2xl">Assinatura Vencida. Contate o suporte.</div>;
  }

  if (!session) return <div className="p-20 text-white text-center">Faça login no Supabase para acessar.</div>;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <header className="flex justify-between p-4 border-b border-gray-800">
        <h1 className="font-bold text-amber-500">MAX TV GOLD VIP</h1>
        <div className="space-x-4">
          <button onClick={() => setActiveTab('dashboard')}>Painel</button>
          {isAdmin && <button onClick={() => setActiveTab('revendedores')}>Revendedores</button>}
          <button onClick={() => setActiveTab('config')}>Configurações</button>
          <button onClick={() => supabase.auth.signOut()} className="text-red-400">Sair</button>
        </div>
      </header>

      <main className="p-6">
        {activeTab === 'dashboard' && (
            // AQUI VOLTA A SUA TABELA DE CLIENTES QUE JÁ FUNCIONAVA
            <div className="text-gray-400">Aqui está sua tabela de clientes antiga e funcional.</div>
        )}

        {activeTab === 'revendedores' && isAdmin && (
          <div className="space-y-4">
            {resellers.map(r => (
              <div key={r.id} className="flex justify-between p-4 bg-[#111827] rounded-xl border border-gray-800">
                <span>{r.user_id} - Vencimento: {new Date(r.data_vencimento).toLocaleDateString()}</span>
                <button onClick={async () => {
                  let d = new Date(); d.setDate(d.getDate() + 30);
                  await supabase.from('config_max').update({ data_vencimento: d.toISOString() }).eq('id', r.id);
                  fetchAllResellers();
                }} className="bg-amber-500 text-black px-3 py-1 rounded">Renovar +30</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'config' && (
           <div className="max-w-md mx-auto bg-[#111827] p-6 rounded-xl">
             <h2 className="mb-4">Configurações</h2>
             {/* SEUS INPUTS DE CONFIG AQUI */}
             <button onClick={async () => {
                 await supabase.from('config_max').upsert({ user_id: session.user.id, ...config }, { onConflict: 'user_id' });
                 alert('Salvo!');
             }} className="bg-amber-500 w-full py-2 rounded text-black font-bold">Salvar</button>
           </div>
        )}
      </main>
    </div>
  );
}
