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
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  // LISTA DE ADMINS: Adicione novos e-mails aqui se precisar futuramente
  const admins = ['maxtvgoldvip@gmail.com'];
  const isAdmin = session && admins.includes(session.user.email);

  const [config, setConfig] = useState({ custo_painel1: 5, revenda_painel1: 8, custo_painel2_fixo: 200, revenda_painel2: 30 });
  const [formData, setFormData] = useState({ nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box', observacoes: '', qtd_ativos_p1: 1, qtd_ativos_p2: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) fetchAppData(session.user.id); setLoading(false); });
  }, []);

  const fetchAppData = async (userId) => {
    const { data: c } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
    if (c) setClients(c);
    const { data: cfg } = await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle();
    if (cfg) setConfig(cfg);
  };

  const handleSaveConfig = async () => {
    const payload = { user_id: session.user.id, ...config };
    const { data: existing } = await supabase.from('config_max').select('id').eq('user_id', session.user.id).maybeSingle();
    const { error } = existing ? await supabase.from('config_max').update(payload).eq('id', existing.id) : await supabase.from('config_max').insert([payload]);
    if (error) alert("Erro: " + error.message); else alert('Configurações salvas!');
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    const payload = { user_id: session.user.id, ...formData, valor_plano: parseFloat(formData.valor_plano) };
    if (editingClient) {
      await supabase.from('clientes_max').update(payload).eq('id', editingClient.id);
      setClients(clients.map(c => c.id === editingClient.id ? { ...payload, id: c.id } : c));
    } else {
      const { data } = await supabase.from('clientes_max').insert([payload]).select();
      if (data) setClients([data[0], ...clients]);
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja realmente excluir?')) {
      await supabase.from('clientes_max').delete().eq('id', id);
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const totalReceitaP2 = clients.filter(c => c.painel.includes('Painel 2')).reduce((acc, c) => acc + ((c.tipo === 'Revendedor' ? c.qtd_ativos_p2 : 1) * config.revenda_painel2), 0);
  const painel2Pago = totalReceitaP2 >= config.custo_painel2_fixo;
  const saldoP2 = Math.max(0, config.custo_painel2_fixo - totalReceitaP2);

  const processed = clients.map(c => {
    const bruto = c.tipo === 'Revendedor' ? ((c.painel.includes('Painel 1') ? c.qtd_ativos_p1 : c.qtd_ativos_p2) * (c.painel.includes('Painel 1') ? config.revenda_painel1 : config.revenda_painel2)) : (c.valor_plano || 0);
    const custo = c.painel.includes('Painel 1') ? (c.tipo === 'Revendedor' ? c.qtd_ativos_p1 * config.custo_painel1 : config.custo_painel1) : (isAdmin && !painel2Pago ? Math.min(bruto, saldoP2) : 0);
    return { ...c, bruto, liquido: bruto - custo };
  });

  const receitaBrutaTotal = processed.reduce((acc, c) => acc + c.bruto, 0);
  const lucroLiquidoTotal = processed.reduce((acc, c) => acc + c.liquido, 0);

  if (loading) return <div className="min-h-screen bg-[#0b0f19] text-amber-400 p-10">Carregando...</div>;
  if (!session) return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="bg-[#111827] p-8 rounded-2xl w-full max-w-sm border border-amber-500/30">
        <h1 className="text-xl font-bold text-white mb-6 text-center">MAX TV <span className="text-amber-500">LOGIN</span></h1>
        <input type="email" placeholder="Email" onChange={e=>setEmail(e.target.value)} className="bg-gray-800 p-3 mb-3 w-full rounded text-white"/>
        <input type="password" placeholder="Senha" onChange={e=>setPassword(e.target.value)} className="bg-gray-800 p-3 mb-6 w-full rounded text-white"/>
        <button onClick={()=>supabase.auth.signInWithPassword({email,password})} className="bg-amber-500 p-3 w-full rounded font-bold text-gray-950">Entrar</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4">
      <header className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold">MAX TV <span className="text-amber-500">GOLD VIP</span></h1>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded ${activeTab === 'dashboard' ? 'bg-amber-500 text-black' : 'bg-gray-800'}`}>Painel</button>
          <button onClick={() => setActiveTab('config')} className={`p-2 rounded ${activeTab === 'config' ? 'bg-amber-500 text-black' : 'bg-gray-800'}`}>Config</button>
          <button onClick={handleLogout} className="bg-red-900 p-2 rounded"><LogOut className="w-5"/></button>
        </div>
      </header>
      
      {/* Mensagem apenas para ADMIN */}
      {isAdmin && (
        <div className={`p-4 rounded-xl border mb-4 ${painel2Pago ? 'bg-green-950 border-green-500' : 'bg-amber-950 border-amber-500'}`}>
          {painel2Pago ? "PAINEL 2: PAGO E LUCRANDO" : `Falta quitar Painel 2: R$ ${saldoP2.toFixed(2)}`}
        </div>
      )}
      
      {activeTab === 'dashboard' ? (
        <>
          {isAdmin && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#111827] p-4 rounded-xl border border-gray-800"><p className="text-xs text-gray-400">Receita Bruta</p><h2 className="font-bold">R$ {receitaBrutaTotal.toFixed(2)}</h2></div>
              <div className="bg-[#111827] p-4 rounded-xl border border-gray-800"><p className="text-xs text-gray-400">Lucro Líquido</p><h2 className="font-bold text-green-400">R$ {lucroLiquidoTotal.toFixed(2)}</h2></div>
            </div>
          )}
          <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="bg-amber-500 p-3 w-full rounded-xl font-bold mb-4 text-black">Adicionar Novo</button>
          {processed.map(c => (
            <div key={c.id} className="bg-[#111827] p-4 rounded-xl mb-2 flex justify-between items-center border border-gray-800">
              <div><p className="font-bold">{c.nome}</p><p className="text-xs text-gray-400">{c.painel} - {c.tipo}</p></div>
              <div className="text-right">
                <p className="text-green-400 font-bold">R$ {c.liquido.toFixed(2)}</p>
                <div className="flex gap-3 justify-end mt-1">
                  <Edit2 onClick={() => { setEditingClient(c); setFormData(c); setShowModal(true); }} className="w-4 cursor-pointer" />
                  <Trash2 onClick={() => handleDelete(c.id)} className="w-4 cursor-pointer text-red-500" />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="space-y-4">
          <input type="number" placeholder="Custo P1" value={config.custo_painel1} onChange={e=>setConfig({...config, custo_painel1: e.target.value})} className="bg-gray-800 p-3 w-full rounded"/>
          <input type="number" placeholder="Revenda P1" value={config.revenda_painel1} onChange={e=>setConfig({...config, revenda_painel1: e.target.value})} className="bg-gray-800 p-3 w-full rounded"/>
          <input type="number" placeholder="Custo Fixo P2" value={config.custo_painel2_fixo} onChange={e=>setConfig({...config, custo_painel2_fixo: e.target.value})} className="bg-gray-800 p-3 w-full rounded"/>
          <input type="number" placeholder="Revenda P2" value={config.revenda_painel2} onChange={e=>setConfig({...config, revenda_painel2: e.target.value})} className="bg-gray-800 p-3 w-full rounded"/>
          <button onClick={handleSaveConfig} className="bg-amber-500 p-3 w-full rounded font-bold text-black">Salvar Configurações</button>
        </div>
      )}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/80 p-4 flex items-center justify-center z-50">
          <form onSubmit={handleSaveClient} className="bg-gray-900 p-6 rounded-xl w-full max-w-sm border border-gray-700">
            <input type="text" placeholder="Nome" value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="bg-gray-800 p-2 w-full mb-2 rounded" />
            <input type="number" placeholder="Valor" value={formData.valor_plano} onChange={e=>setFormData({...formData, valor_plano: e.target.value})} className="bg-gray-800 p-2 w-full mb-2 rounded" />
            <select value={formData.painel} onChange={e=>setFormData({...formData, painel: e.target.value})} className="bg-gray-800 p-2 w-full mb-2 rounded">
              <option>Painel 1 (Sigma)</option><option>Painel 2 (Zenpanel)</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="bg-green-600 p-2 w-full rounded">Salvar</button>
              <button type="button" onClick={()=>setShowModal(false)} className="bg-red-600 p-2 w-full rounded">Fechar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
