import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LogOut, Trash2, Edit2, Tv, DollarSign, CheckCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [config, setConfig] = useState({ custo_painel1: 5, revenda_painel1: 8, custo_painel2_fixo: 200, revenda_painel2: 30 });
  const [formData, setFormData] = useState({ nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', qtd_ativos_p1: 1, qtd_ativos_p2: 0 });

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
    const { data: c } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
    if (c) setClients(c);
    const { data: cfg } = await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle();
    // Proteção contra tela preta: se cfg não existir, usa o padrão
    if (cfg) setConfig(cfg);
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Erro: " + error.message);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    const payload = { user_id: session.user.id, ...formData, valor_plano: parseFloat(formData.valor_plano) || 0 };
    if (editingClient) await supabase.from('clientes_max').update(payload).eq('id', editingClient.id);
    else await supabase.from('clientes_max').insert([payload]);
    window.location.reload(); // Recarrega para garantir sincronia
  };

  // Cálculos protegidos: se não tem config, assume 0
  const totalReceitaP2 = clients.filter(c => c.painel.includes('Painel 2')).reduce((acc, c) => acc + ((c.tipo === 'Revendedor' ? (c.qtd_ativos_p2 || 0) : 1) * (config.revenda_painel2 || 0)), 0);
  const painel2Pago = totalReceitaP2 >= (config.custo_painel2_fixo || 200);
  const saldoP2 = Math.max(0, (config.custo_painel2_fixo || 200) - totalReceitaP2);

  const processed = clients.map(c => {
    const bruto = c.tipo === 'Revendedor' ? ((c.painel.includes('Painel 1') ? c.qtd_ativos_p1 : c.qtd_ativos_p2) * (c.painel.includes('Painel 1') ? (config.revenda_painel1 || 0) : (config.revenda_painel2 || 0))) : (c.valor_plano || 0);
    const custo = c.painel.includes('Painel 1') ? (c.tipo === 'Revendedor' ? (c.qtd_ativos_p1 || 0) * (config.custo_painel1 || 0) : (config.custo_painel1 || 0)) : (isAdmin && !painel2Pago ? Math.min(bruto, saldoP2) : 0);
    return { ...c, bruto, liquido: bruto - custo };
  });

  if (loading) return <div className="p-10 text-white">Carregando...</div>;
  if (!session) return (
    <div className="p-10 max-w-sm mx-auto">
      <input type="email" placeholder="Email" onChange={e=>setEmail(e.target.value)} className="bg-gray-800 p-3 mb-2 w-full text-white rounded"/>
      <input type="password" placeholder="Senha" onChange={e=>setPassword(e.target.value)} className="bg-gray-800 p-3 mb-4 w-full text-white rounded"/>
      <button onClick={handleLogin} className="bg-amber-500 p-3 w-full rounded font-bold">Entrar</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4">
      {isAdmin && (
        <div className={`p-4 rounded-xl border mb-4 ${painel2Pago ? 'bg-green-950 border-green-500' : 'bg-amber-950 border-amber-500'}`}>
          {painel2Pago ? "PAINEL 2: PAGO E LUCRANDO" : `Falta quitar: R$ ${saldoP2.toFixed(2)}`}
        </div>
      )}
      
      <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="bg-amber-500 p-3 w-full rounded-xl font-bold mb-4 text-black">Adicionar Novo</button>
      
      {processed.map(c => (
        <div key={c.id} className="bg-[#111827] p-4 rounded-xl mb-2 flex justify-between border border-gray-800">
          <div><p className="font-bold">{c.nome}</p><p className="text-xs text-gray-400">{c.painel}</p></div>
          <div className="text-right">
            <p className="text-green-400 font-bold">R$ {c.liquido.toFixed(2)}</p>
          </div>
        </div>
      ))}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleSaveClient} className="bg-gray-900 p-6 rounded-xl w-full max-w-sm">
            <input type="text" placeholder="Nome" value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="bg-gray-800 p-2 w-full mb-2" />
            <input type="number" placeholder="Valor" value={formData.valor_plano} onChange={e=>setFormData({...formData, valor_plano: e.target.value})} className="bg-gray-800 p-2 w-full mb-2" />
            <button type="submit" className="bg-green-600 p-2 w-full mb-2">Salvar</button>
            <button type="button" onClick={()=>setShowModal(false)} className="bg-red-600 p-2 w-full">Fechar</button>
          </form>
        </div>
      )}
    </div>
  );
}
