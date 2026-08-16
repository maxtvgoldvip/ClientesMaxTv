import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [config, setConfig] = useState({ custo_painel1: 5, revenda_painel1: 8, custo_painel2_fixo: 200, revenda_painel2: 30 });
  const [formData, setFormData] = useState({ nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box', observacoes: '', qtd_ativos_p1: 1, qtd_ativos_p2: 0 });

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
    const bruto = c.tipo === 'Revendedor' ? ((c.painel.includes('Painel 1') ? c.qtd_ativos_p1 : c.qtd_ativos_p2) * (c.painel.includes('Painel 1') ? config.revenda_painel1 : config.revenda_painel2)) : (parseFloat(c.valor_plano) || 0);
    const custo = c.painel.includes('Painel 1') ? (c.tipo === 'Revendedor' ? c.qtd_ativos_p1 * config.custo_painel1 : config.custo_painel1) : (painel2Pago ? 0 : Math.min(bruto, saldoP2));
    return { ...c, bruto, liquido: bruto - custo };
  });

  if (loading) return <div className="min-h-screen bg-[#0b0f19] text-amber-400 p-10">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">MAX TV <span className="text-amber-500">GOLD VIP</span></h1>
        <button onClick={() => setActiveTab(activeTab === 'dashboard' ? 'config' : 'dashboard')} className="bg-gray-800 p-2 rounded">Alternar Aba</button>
      </header>
      
      <div className={`p-4 rounded-xl border mb-4 ${painel2Pago ? 'bg-green-950 border-green-500' : 'bg-amber-950 border-amber-500'}`}>
        {painel2Pago ? "PAINEL 2 PAGO!" : `Faltam quitar Painel 2: R$ ${saldoP2.toFixed(2)}`}
      </div>
      
      {activeTab === 'dashboard' ? (
        <>
          <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="bg-amber-500 p-3 w-full rounded-xl font-bold mb-4">Adicionar Novo</button>
          {processed.map(c => (
            <div key={c.id} className="bg-[#111827] p-4 rounded-xl mb-2 flex justify-between items-center border border-gray-800">
              <div><p className="font-bold">{c.nome}</p><p className="text-xs text-gray-400">{c.painel}</p></div>
              <div className="text-right">
                <p className="text-green-400 font-bold">R$ {c.liquido.toFixed(2)}</p>
                <div className="flex gap-2 justify-end mt-1">
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
          <button onClick={handleSaveConfig} className="bg-amber-500 p-3 w-full rounded font-bold">Salvar Configurações</button>
        </div>
      )}
    </div>
  );
}
