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
        fetchAppData(session.user.id);
        if (session.user.email === adminEmail) fetchAllResellers();
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

  const handleManualAddReseller = async () => {
    if (!newResellerEmail) return;
    // Cria um registro base para o novo revendedor
    const { error } = await supabase.from('config_max').insert([{ 
        user_id: 'REV_' + newResellerEmail, 
        data_vencimento: new Date().toISOString() 
    }]);
    if (error) alert('Erro: ' + error.message);
    else {
        alert('Revendedor adicionado!');
        setNewResellerEmail('');
        fetchAllResellers();
    }
  };

  const handleRenewReseller = async (id) => {
    let d = new Date(); d.setDate(d.getDate() + 30);
    await supabase.from('config_max').update({ data_vencimento: d.toISOString() }).eq('id', id);
    fetchAllResellers();
  };

  // ... (mantenha as funções handleSaveClient, handleDelete, etc, iguais à versão anterior)
  // [AQUI ENTRA O CÓDIGO DA TABELA E DO MODAL QUE VOCÊ JÁ TEM]

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      {/* ... (cabeçalho igual ao anterior) */}
      
      <main className="p-6 max-w-7xl mx-auto w-full">
        {/* ... (dashboard e config iguais ao anterior) */}

        {activeTab === 'revendedores' && isAdmin && (
          <div className="bg-[#111827] p-6 rounded-2xl space-y-6">
            <div className="flex gap-2">
                <input placeholder="E-mail ou ID do novo revendedor" value={newResellerEmail} onChange={(e) => setNewResellerEmail(e.target.value)} className="flex-1 p-2 bg-[#1f2937] rounded-xl text-white"/>
                <button onClick={handleManualAddReseller} className="bg-green-600 px-4 py-2 rounded-xl text-white font-bold">Adicionar</button>
            </div>
            {/* Tabela de listagem dos revendedores com botão de renovar */}
            {resellers.map(r => (
                <div key={r.id} className="flex justify-between p-4 bg-[#1f2937] rounded-xl">
                    <span>{r.user_id} - Venc: {new Date(r.data_vencimento).toLocaleDateString()}</span>
                    <button onClick={() => handleRenewReseller(r.id)} className="bg-amber-500 text-black px-3 py-1 rounded font-bold text-xs">Renovar +30</button>
                </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
