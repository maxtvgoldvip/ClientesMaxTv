import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle, Users } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [newResellerEmail, setNewResellerEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [config, setConfig] = useState({ custo_painel1: 5.00, revenda_painel1: 8.00, revenda_painel2: 5.00, custo_painel2_fixo: 200.00 });
  const [formData, setFormData] = useState({ nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box', qtd_ativos_p1: 1, qtd_ativos_p2: 0 });

  const adminEmail = 'maxtvgoldvip@gmail.com';
  const isAdmin = session && session.user.email === adminEmail;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(session.user.id);
      setLoading(false);
    });
  }, []);

  const fetchData = async (userId) => {
    const { data: c } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
    if (c) setClients(c);
    const { data: cf } = await supabase.from('config_max').select('*').eq('user_id', isAdmin ? userId : adminEmail).maybeSingle();
    if (cf) setConfig(cf);
    if (isAdmin) {
      const { data: r } = await supabase.from('config_max').select('*');
      if (r) setResellers(r);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    const payload = {
      user_id: session.user.id,
      nome: formData.nome,
      tipo: formData.tipo,
      painel: formData.painel,
      valor_plano: parseFloat(formData.valor_plano) || 0,
      dispositivo: formData.dispositivo,
      qtd_ativos_p1: parseInt(formData.qtd_ativos_p1) || 0,
      qtd_ativos_p2: parseInt(formData.qtd_ativos_p2) || 0
    };
    if (editingClient) await supabase.from('clientes_max').update(payload).eq('id', editingClient.id);
    else await supabase.from('clientes_max').insert([payload]);
    setShowModal(false);
    fetchData(session.user.id);
  };

  // Lógica de cálculo com subtração correta
  const processedClients = clients.map(c => {
    let bruto = c.valor_plano || 0;
    let custo = 0;
    if (c.tipo === 'Revendedor') {
      bruto = (c.qtd_ativos_p1 * config.revenda_painel1) + (c.qtd_ativos_p2 * config.revenda_painel2);
      custo = (c.qtd_ativos_p1 * config.custo_painel1) + (c.qtd_ativos_p2 * 5.00); 
    } else {
      custo = c.painel.includes('Painel 1') ? config.custo_painel1 : 5.00;
    }
    return { ...c, bruto, liquido: bruto - custo };
  });

  const totalBruto = processedClients.reduce((acc, c) => acc + c.bruto, 0);
  const totalLiquido = processedClients.reduce((acc, c) => acc + c.liquido, 0);

  if (!session) return <div className="text-white p-10">Faça login no Supabase Auth...</div>;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4">
      {/* MENU */}
      <div className="flex justify-between mb-6 border-b border-gray-800 pb-4">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-amber-500 font-bold' : ''}>Painel</button>
        {isAdmin && <button onClick={() => setActiveTab('revendedores')} className={activeTab === 'revendedores' ? 'text-amber-500 font-bold' : ''}>Revendedores</button>}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400">RECEITA TOTAL</p>
                <h2 className="text-lg font-bold">R$ {totalBruto.toFixed(2)}</h2>
            </div>
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400">LUCRO LÍQUIDO</p>
                <h2 className="text-lg font-bold text-green-400">R$ {totalLiquido.toFixed(2)}</h2>
            </div>
          </div>

          <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="w-full bg-amber-500 py-3 rounded-xl font-bold text-black mb-6">Adicionar Cliente</button>

          <div className="space-y-3">
            {processedClients.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div key={c.id} className="bg-[#111827] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                    <div>
                        <p className="font-bold text-sm">{c.nome}</p>
                        <p className="text-[10px] text-gray-500">{c.painel}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-400 text-sm">R$ {c.liquido.toFixed(2)}</p>
                        <button onClick={() => { setEditingClient(c); setShowModal(true); }} className="text-[10px] text-blue-400">Editar</button>
                    </div>
                </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
            <form onSubmit={handleSaveClient} className="bg-[#111827] p-6 rounded-2xl w-full max-w-sm border border-gray-800">
                <input placeholder="Nome" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full p-2 mb-2 bg-gray-900 rounded text-sm"/>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full p-2 mb-2 bg-gray-900 rounded text-sm">
                    <option>Cliente Direto</option>
                    <option>Revendedor</option>
                </select>
                {formData.tipo === 'Revendedor' ? (
                    <div className="flex gap-2">
                        <input type="number" placeholder="Ativos P1" onChange={(e) => setFormData({...formData, qtd_ativos_p1: e.target.value})} className="w-1/2 p-2 bg-gray-900 rounded text-sm"/>
                        <input type="number" placeholder="Ativos P2" onChange={(e) => setFormData({...formData, qtd_ativos_p2: e.target.value})} className="w-1/2 p-2 bg-gray-900 rounded text-sm"/>
                    </div>
                ) : (
                    <input type="number" placeholder="Valor" onChange={(e) => setFormData({...formData, valor_plano: e.target.value})} className="w-full p-2 bg-gray-900 rounded text-sm"/>
                )}
                <div className="flex gap-2 mt-4">
                    <button type="submit" className="flex-1 bg-amber-500 py-2 rounded font-bold text-black text-sm">Salvar</button>
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 py-2 rounded text-gray-300 text-sm">Cancelar</button>
                </div>
            </form>
        </div>
      )}
    </div>
  );
}
