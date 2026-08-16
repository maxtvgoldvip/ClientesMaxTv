import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const admins = ['maxtvgoldvip@gmail.com'];
  const isAdmin = session && admins.includes(session.user.email);

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
      if (session) fetchAppData(session.user.id);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAppData(session.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
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
        data_vencimento: configData.data_vencimento
      });
    }
  };

  const handleSaveConfig = async () => {
    await supabase.from('config_max').upsert({ 
        user_id: session.user.id, ...config 
    }, { onConflict: 'user_id' });
    alert('Configurações salvas!');
    fetchAppData(session.user.id);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    const p1 = parseInt(formData.qtd_ativos_p1) || 0;
    const p2 = parseInt(formData.qtd_ativos_p2) || 0;
    const bruto = formData.tipo === 'Revendedor' ? (p1 * config.revenda_painel1) + (p2 * config.revenda_painel2) : parseFloat(formData.valor_plano) || 0;

    const payload = { user_id: session.user.id, ...formData, valor_plano: bruto, qtd_ativos_p1: p1, qtd_ativos_p2: p2 };
    
    if (editingClient) await supabase.from('clientes_max').update(payload).eq('id', editingClient.id);
    else await supabase.from('clientes_max').insert([payload]);
    
    setShowModal(false);
    fetchAppData(session.user.id);
  };

  // LÓGICA DE BLOQUEIO (ADMIN SEMPRE TEM ACESSO)
  const estaVencido = !isAdmin && (new Date() > new Date(config.data_vencimento));

  if (loading) return <div className="text-amber-400 p-10">Carregando...</div>;

  if (session && estaVencido) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Assinatura Vencida!</h2>
          <p className="text-gray-300">Renove sua mensalidade de R$ 3,00 para continuar.</p>
        </div>
      </div>
    );
  }

  if (!session) return <div className="p-10 text-white">Redirecionando para Login...</div>;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <header className="bg-[#111827] border-b border-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
        <div className="space-x-4">
          <button onClick={() => setActiveTab('dashboard')}>Painel</button>
          <button onClick={() => setActiveTab('config')}>Configurações</button>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' ? (
          <div>Dashboard (Seus dados e tabelas aqui)</div>
        ) : (
          <div className="bg-[#111827] p-6 rounded-2xl max-w-lg mx-auto">
            <h2 className="text-white font-bold mb-4">Configurações</h2>
            {/* Campos de Input (Custo, Venda, etc) */}
            <button onClick={handleSaveConfig} className="bg-amber-500 w-full py-2 rounded-xl mt-4">Salvar</button>
          </div>
        )}
      </main>
    </div>
  );
}
