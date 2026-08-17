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
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const adminEmail = 'maxtvgoldvip@gmail.com';
  const isAdmin = session && session.user.email === adminEmail;

  const [config, setConfig] = useState({
    custo_painel1: 5.00,
    revenda_painel1: 8.00,
    revenda_painel2: 5.00,
    custo_painel2_fixo: 200.00
  });

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Cliente Direto',
    painel: 'Painel 1 (Sigma)',
    valor_plano: '',
    dispositivo: 'TV Box',
    observacoes: '',
    qtd_ativos_p1: 1,
    qtd_ativos_p2: 0
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAppData(session.user.id);
      setLoading(false);
    });
  }, []);

  const fetchAppData = async (userId) => {
    try {
      const { data: clientData } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
      if (clientData) setClients(clientData);

      const { data: configData } = await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle();
      if (configData) {
        setConfig({
          custo_painel1: configData.custo_painel1 ?? 5.00,
          revenda_painel1: configData.revenda_painel1 ?? 8.00,
          revenda_painel2: configData.revenda_painel2 ?? 5.00,
          custo_painel2_fixo: configData.custo_painel2_fixo ?? 200.00
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
  };

  const handleSaveConfig = async () => {
    if (!session) return;
    const payload = { user_id: session.user.id, ...config };
    const { error } = await supabase.from('config_max').upsert(payload, { onConflict: 'user_id' });
    if (error) alert('Erro: ' + error.message);
    else alert('Configurações salvas!');
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome || '',
      tipo: client.tipo || 'Cliente Direto',
      painel: client.painel || 'Painel 1 (Sigma)',
      valor_plano: client.valor_plano || '',
      dispositivo: client.dispositivo || 'TV Box',
      observacoes: client.observacoes || '',
      qtd_ativos_p1: client.qtd_ativos_p1 || 1,
      qtd_ativos_p2: client.qtd_ativos_p2 || 0
    });
    setShowModal(true);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!session) return;

    let brutoCalculado = parseFloat(formData.valor_plano) || 0;
    if (formData.tipo === 'Revendedor') {
      const p1 = parseInt(formData.qtd_ativos_p1) || 0;
      const p2 = parseInt(formData.qtd_ativos_p2) || 0;
      brutoCalculado = (p1 * config.revenda_painel1) + (p2 * config.revenda_painel2);
    }

    const payload = {
      user_id: session.user.id,
      nome: formData.nome,
      tipo: formData.tipo,
      painel: formData.painel,
      valor_plano: brutoCalculado,
      dispositivo: formData.dispositivo,
      observacoes: formData.observacoes,
      qtd_ativos_p1: parseInt(formData.qtd_ativos_p1) || 0,
      qtd_ativos_p2: parseInt(formData.qtd_ativos_p2) || 0
    };

    if (editingClient) {
      await supabase.from('clientes_max').update(payload).eq('id', editingClient.id);
      setEditingClient(null);
    } else {
      await supabase.from('clientes_max').insert([payload]);
    }
    setShowModal(false);
    fetchAppData(session.user.id);
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja excluir este cadastro?')) {
      await supabase.from('clientes_max').delete().eq('id', id);
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const totalReceitaP2 = clients.reduce((acc, c) => {
    if (c.tipo === 'Revendedor') return acc + ((c.qtd_ativos_p2 || 0) * config.revenda_painel2);
    else if (c.painel.includes('Painel 2')) return acc + (c.valor_plano || 0);
    return acc;
  }, 0);

  const painel2Pago = totalReceitaP2 >= (config.custo_painel2_fixo || 200);
  const saldoP2Restante = Math.max(0, (config.custo_painel2_fixo || 200) - totalReceitaP2);

  let receitaBrutaTotal = 0;
  let custoTotalGeral = 0;

  const calculatedClients = clients.map(client => {
    let bruto = 0, custo = 0;
    if (client.tipo === 'Revendedor') {
      const p1 = client.qtd_ativos_p1 || 0;
      const p2 = client.qtd_ativos_p2 || 0;
      bruto = (p1 * config.revenda_painel1) + (p2 * config.revenda_painel2);
      custo = (p1 * config.custo_painel1) + (p2 * 5.00);
    } else {
      bruto = client.valor_plano || 0;
      if (client.painel.includes('Painel 1')) custo = config.custo_painel1;
      else if (isAdmin) custo = painel2Pago ? 0 : Math.min(bruto, saldoP2Restante);
    }
    receitaBrutaTotal += bruto;
    custoTotalGeral += custo;
    return { ...client, bruto, liquido: bruto - custo, custo };
  });

  const lucroLiquidoTotal = receitaBrutaTotal - custoTotalGeral;
  const filteredClients = calculatedClients.filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-amber-400">Carregando...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-[#111827] border border-gray-800 p-8 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
          <h1 className="text-xl font-bold text-white text-center">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
          <input type="email" placeholder="E-mail" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
          <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
          <button type="submit" className="w-full bg-amber-500 text-gray-950 p-3 rounded-xl font-bold">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <header className="bg-[#111827] border-b border-gray-800 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Tv className="w-6 h-6 text-amber-400" />
            <h1 className="text-base font-bold text-white">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'dashboard' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Painel</button>
            <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'config' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Config</button>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="p-1.5 bg-red-950/60 text-red-400 rounded-lg" title="Sair"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full flex-1 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {isAdmin && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${painel2Pago ? 'bg-green-950/30 border-green-500/50 text-green-300' : 'bg-amber-950/30 border-amber-500/50 text-amber-300'}`}>
                <div className="flex items-center space-x-3">
                  {painel2Pago ? <CheckCircle className="w-6 h-6 text-green-400" /> : <DollarSign className="w-6 h-6 text-amber-400" />}
                  <div>
                    <h4 className="font-bold text-xs">Status do Custo Fixo — Painel 2</h4>
                    <p className="text-[11px] opacity-90">{painel2Pago ? "Painel 2 PAGO com folga!" : `Faltam R$ ${saldoP2Restante.toFixed(2)} para quitar o fixo.`}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl">
                <p className="text-xs uppercase text-gray-400 font-semibold">Receita Bruta Total</p>
                <h3 className="text-2xl font-bold text-white mt-1">R$ {receitaBrutaTotal.toFixed(2)}</h3>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl">
                <p className="text-xs uppercase text-gray-400 font-semibold">Lucro Líquido</p>
                <h3 className="text-2xl font-bold text-green-400 mt-1">R$ {lucroLiquidoTotal.toFixed(2)}</h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#111827] p-4 rounded-2xl border border-gray-800">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none" />
              </div>
              <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-500 text-gray-950 font-bold rounded-xl text-sm shadow-lg">
                <Plus className="w-4 h-4" /><span>Adicionar Novo</span>
              </button>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-900/50 border-b border-gray-800 text-xs uppercase text-gray-400">
                    <th className="p-3">Nome / Tipo</th>
                    <th className="p-3">Painel</th>
                    <th className="p-3">Detalhes</th>
                    <th className="p-3">Bruto</th>
                    <th className="p-3">Líquido</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {filteredClients.length === 0 ? (
                    <tr><td colSpan="6" className="p-6 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-900/30">
                        <td className="p-3 font-medium text-white">{client.nome}<br/><span className="text-xs text-purple-400">{client.tipo}</span></td>
                        <td className="p-3 text-gray-300 text-xs">{client.painel}</td>
                        <td className="p-3 text-gray-300 text-xs">{client.tipo === 'Revendedor' ? `P1: ${client.qtd_ativos_p1} | P2: ${client.qtd_ativos_p2}` : client.dispositivo}</td>
                        <td className="p-3 font-semibold text-white">R$ {client.bruto.toFixed(2)}</td>
                        <td className="p-3 font-semibold text-green-400">R$ {client.liquido.toFixed(2)}</td>
                        <td className="p-3 text-right space-x-1">
                          <button onClick={() => handleOpenEdit(client)} className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(client.id)} className="p-1.5 bg-red-950/40 text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'config' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl shadow-xl max-w-lg mx-auto space-y-4">
            <h2 className="text-lg font-bold text-white">Configurações</h2>
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">Revenda Painel 1</label>
              <input type="number" step="0.01" value={config.revenda_painel1} onChange={(e) => setConfig({...config, revenda_painel1: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">Revenda Painel 2</label>
              <input type="number" step="0.01" value={config.revenda_painel2} onChange={(e) => setConfig({...config, revenda_painel2: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
            </div>
            {isAdmin && (
              <>
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">Custo por Ativo - Painel 1</label>
                  <input type="number" step="0.01" value={config.custo_painel1} onChange={(e) => setConfig({...config, custo_painel1: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">Custo Fixo - Painel 2</label>
                  <input type="number" step="0.01" value={config.custo_painel2_fixo} onChange={(e) => setConfig({...config, custo_painel2_fixo: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
                </div>
              </>
            )}
            <button onClick={handleSaveConfig} className="w-full bg-amber-500 text-gray-950 p-3 rounded-xl font-bold text-sm">Salvar Configurações</button>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">{editingClient ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>
            <form onSubmit={handleSaveClient} className="space-y-3">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm">
                  <option value="Cliente Direto">Cliente Direto</option>
                  <option value="Revendedor">Revendedor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Nome</label>
                <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Painel</label>
                <select value={formData.painel} onChange={(e) => setFormData({...formData, painel: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm">
                  <option value="Painel 1 (Sigma)">Painel 1 (Sigma)</option>
                  <option value="Painel 2 (Zenpanel)">Painel 2 (Zenpanel)</option>
                </select>
              </div>
              {formData.tipo === 'Revendedor' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Ativos P1</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p1} onChange={(e) => setFormData({...formData, qtd_ativos_p1: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Ativos P2</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p2} onChange={(e) => setFormData({...formData, qtd_ativos_p2: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Valor do Plano (R$)</label>
                    <input type="number" step="0.01" required value={formData.valor_plano} onChange={(e) => setFormData({...formData, valor_plano: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Dispositivo</label>
                    <input type="text" value={formData.dispositivo} onChange={(e) => setFormData({...formData, dispositivo: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm" />
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-gray-950 font-bold rounded-xl text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
