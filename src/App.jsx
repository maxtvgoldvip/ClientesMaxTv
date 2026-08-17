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
  const [newResellerEmail, setNewResellerEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showResellerModal, setShowResellerModal] = useState(false);
  const [editingReseller, setEditingReseller] = useState(null);
  const [resellerForm, setResellerForm] = useState({ user_id: '', data_vencimento: '' });

  const adminEmail = 'maxtvgoldvip@gmail.com';
  const isAdmin = session && session.user.email === adminEmail;

  const [config, setConfig] = useState({
    custo_painel1: 5.00,
    revenda_painel1: 8.00,
    revenda_painel2: 5.00,
    custo_painel2_fixo: 200.00,
    data_vencimento: new Date().toISOString()
  });

  const [formData, setFormData] = useState({
    nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box', observacoes: '', qtd_ativos_p1: 1, qtd_ativos_p2: 0
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchAppData(session.user.id, session.user.email);
        if (session.user.email === adminEmail) fetchAllResellers();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchAppData(session.user.id, session.user.email);
        if (session.user.email === adminEmail) fetchAllResellers();
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAppData = async (userId, userEmail) => {
    try {
      const { data: clientData } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
      if (clientData) setClients(clientData);

      let configData = null;
      if (userEmail === adminEmail) {
        const { data } = await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle();
        configData = data;
      } else {
        const { data } = await supabase.from('config_max').select('*').eq('user_id', userEmail).maybeSingle();
        configData = data;
      }

      if (configData) {
        setConfig({
          custo_painel1: configData.custo_painel1 ?? 5.00,
          revenda_painel1: configData.revenda_painel1 ?? 8.00,
          revenda_painel2: configData.revenda_painel2 ?? 5.00,
          custo_painel2_fixo: configData.custo_painel2_fixo ?? 200.00,
          data_vencimento: configData.data_vencimento ?? new Date().toISOString()
        });
      }
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

  const handleAuth = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
  };

  const handleSaveConfig = async () => {
    const payload = { user_id: session.user.id, ...config };
    const { error } = await supabase.from('config_max').upsert(payload, { onConflict: 'user_id' });
    if (error) alert('Erro ao salvar: ' + error.message);
    else alert('Configurações salvas!');
  };

  const isExpired = !isAdmin && new Date() > new Date(config.data_vencimento);

  if (loading) return <div className="p-10 text-amber-500">Carregando...</div>;

  if (session && isExpired) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-red-500">Assinatura Vencida</h2>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="mt-6 bg-red-600 px-6 py-2 rounded-xl text-white font-bold">Sair da Conta</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-[#111827] p-8 rounded-2xl w-full max-w-sm">
          <h1 className="text-xl font-bold text-white mb-6">MAX TV LOGIN</h1>
          <input type="email" placeholder="E-mail" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 bg-gray-800 rounded-xl text-white" />
          <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-gray-800 rounded-xl text-white" />
          <button type="submit" className="w-full bg-amber-500 p-3 rounded-xl font-bold">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <header className="p-4 flex justify-between border-b border-gray-800 bg-[#111827]">
        <h1 className="font-bold text-amber-500">MAX TV GOLD VIP</h1>
        <div className="space-x-4">
            <button onClick={() => setActiveTab('dashboard')}>Painel</button>
            {isAdmin && <button onClick={() => setActiveTab('revendedores')}>Revendedores</button>}
            <button onClick={() => setActiveTab('config')}>Configurações</button>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-red-400">Sair</button>
        </div>
      </header>

      <main className="p-6">
        {activeTab === 'dashboard' && (
            <div>
                {/* Aqui você mantém a sua tabela de clientes antiga que você já tem no código anterior */}
                <h2 className="text-xl font-bold mb-4">Painel de Clientes</h2>
            </div>
        )}

        {activeTab === 'revendedores' && isAdmin && (
            <div className="bg-[#111827] p-6 rounded-xl">
                <div className="flex gap-2 mb-6">
                    <input placeholder="E-mail do revendedor" value={newResellerEmail} onChange={(e) => setNewResellerEmail(e.target.value)} className="bg-gray-800 p-2 rounded flex-1"/>
                    <button onClick={handleManualAddReseller} className="bg-green-600 px-4 py-2 rounded font-bold">Adicionar</button>
                </div>
                {resellers.map(r => (
                    <div key={r.id} className="flex justify-between p-4 border-b border-gray-800">
                        <span>{r.user_id} | Venc: {new Date(r.data_vencimento).toLocaleDateString()}</span>
                        <button onClick={() => handleRenewReseller(r.id)} className="bg-amber-500 text-black px-3 py-1 rounded font-bold">Renovar +30</button>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}
