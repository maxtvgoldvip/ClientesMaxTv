import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle, Calendar } from 'lucide-react';

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
    const payload = { 
        user_id: session.user.id, 
        custo_painel1: config.custo_painel1, 
        revenda_painel1: config.revenda_painel1, 
        revenda_painel2: config.revenda_painel2, 
        custo_painel2_fixo: config.custo_painel2_fixo 
    };
    await supabase.from('config_max').upsert(payload, { onConflict: 'user_id' });
    alert('Salvo!');
  };

  // Lógica de Bloqueio por Vencimento
  const dataVenc = new Date(config.data_vencimento);
  const estaVencido = !isAdmin && new Date() > dataVenc;

  if (loading) return <div className="text-amber-400 p-10">Carregando...</div>;

  if (session && estaVencido) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Assinatura Vencida!</h2>
          <p className="text-gray-300">Venceu em: {dataVenc.toLocaleDateString()}</p>
          <p className="text-gray-400">Renove sua mensalidade de R$ 3,00 para continuar.</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe tela de login (mantenha sua lógica de Auth aqui...)
  if (!session) return <div>(Sua tela de Login aqui)</div>;

  // ... (restante do código com a lógica de Dashboard e Modal de Clientes como discutido)
  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
        {/* Adicione o cabeçalho com a data de vencimento visível */}
        <div className="text-right p-2 text-xs text-amber-500">
            Vencimento: {dataVenc.toLocaleDateString()}
        </div>
        {/* ... restante da interface */}
    </div>
  );
}
