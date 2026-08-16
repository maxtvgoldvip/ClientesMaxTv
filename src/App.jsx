import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle, Users } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [config, setConfig] = useState({
    custo_painel1: 5.00,
    revenda_painel1: 8.00,
    revenda_painel2: 5.00,
    custo_painel2_fixo: 200.00,
    data_vencimento: new Date().toISOString()
  });

  // Identificação do Admin
  const adminEmail = 'maxtvgoldvip@gmail.com';
  const isAdmin = session && session.user.email === adminEmail;

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
    const { data: c } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
    if (c) setClients(c);
    const { data: cf } = await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle();
    if (cf) setConfig(cf);
  };

  const fetchAllResellers = async () => {
    const { data } = await supabase.from('config_max').select('*');
    if (data) setResellers(data);
  };

  // Lógica de bloqueio: Se NÃO for admin e a data atual for maior que a data de vencimento, bloqueia.
  const isExpired = !isAdmin && (new Date() > new Date(config.data_vencimento));

  if (loading) return <div className="text-amber-400 p-10">Carregando...</div>;

  // Tela de bloqueio exclusiva para revendedores
  if (session && isExpired) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Assinatura Vencida</h2>
          <p className="text-gray-300 mb-6">Contate o administrador para renovar.</p>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="bg-red-600 px-6 py-2 rounded-xl font-bold text-white">Sair da Conta</button>
        </div>
      </div>
    );
  }

  // --- O resto do seu painel normal, idêntico à sua versão anterior ---
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
       {/* Cabeçalho, Dashboard e Configurações iguais à versão anterior */}
       <header className="border-b border-gray-800 p-4 flex justify-between">
         <h1 className="font-bold text-amber-500">MAX TV GOLD VIP</h1>
         <div className="space-x-4">
            <button onClick={() => setActiveTab('dashboard')}>Painel</button>
            {isAdmin && <button onClick={() => setActiveTab('revendedores')}>Revendedores</button>}
            <button onClick={() => setActiveTab('config')}>Configurações</button>
            <button onClick={() => supabase.auth.signOut()} className="text-red-400">Sair</button>
         </div>
       </header>

       <main className="p-6">
         {activeTab === 'revendedores' && isAdmin ? (
             <div className="space-y-4">
               {resellers.map(r => (
                 <div key={r.id} className="flex justify-between p-4 bg-[#111827] rounded-xl border border-gray-800">
                   <span>ID: {r.user_id.substring(0,8)}... | Venc: {new Date(r.data_vencimento).toLocaleDateString()}</span>
                   <button onClick={async () => {
                     let d = new Date(); d.setDate(d.getDate() + 30);
                     await supabase.from('config_max').update({ data_vencimento: d.toISOString() }).eq('id', r.id);
                     fetchAllResellers();
                   }} className="bg-amber-500 text-black px-3 py-1 rounded">Renovar +30</button>
                 </div>
               ))}
             </div>
         ) : (
             <div className="text-center">Painel de Clientes (Sua tabela aqui)</div>
         )}
       </main>
    </div>
  );
}
