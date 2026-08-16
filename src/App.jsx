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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAppData(session.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
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
          custo_painel2_fixo: configData.custo_painel2_fixo ?? 200.00,
          data_vencimento: configData.data_vencimento ?? new Date().toISOString()
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
  };

  const handleSaveConfig = async () => {
    if (!session) return;
    const payload = {
      user_id: session.user.id,
      custo_painel1: parseFloat(config.custo_painel1) || 0,
      revenda_painel1: parseFloat(config.revenda_painel1) || 0,
      revenda_painel2: parseFloat(config.revenda_painel2) || 0,
      custo_painel2_fixo: parseFloat(config.custo_painel2_fixo) || 0
    };

    const { error } = await supabase.from('config_max').upsert(payload, { onConflict: 'user_id' });
    if (error) alert('Erro ao salvar: ' + error.message);
    else {
      alert('Configurações salvas com sucesso!');
      fetchAppData(session.user.id);
    }
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
      const { error } = await supabase.from('clientes_max').update(payload).eq('id', editingClient.id);
      if (error) alert('Erro: ' + error.message);
      else setClients(clients.map(c => c.id === editingClient.id ? { ...payload, id: c.id } : c));
      setEditingClient(null);
    } else {
      const { data, error } = await supabase.from('clientes_max').insert([payload]).select();
      if (error) alert('Erro: ' + error.message);
      else if (data) setClients([data[0], ...clients]);
    }

    setShowModal(false);
    setFormData({
      nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box', observacoes: '', qtd_ativos_p1: 1, qtd_ativos_p2: 0
    });
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja realmente excluir este cadastro?')) {
      const { error } = await supabase.from('clientes_max').delete().eq('id', id);
      if (error) alert('Erro: ' + error.message);
      else setClients(clients.filter(c => c.id !== id));
    }
  };

  // Cálculos financeiros
  const totalReceitaP2 = clients.reduce((acc, c) => {
    if (c.tipo === 'Revendedor') {
      return acc + ((c.qtd_ativos_p2 || 0) * config.revenda_painel2);
    } else if (c.painel.includes('Painel 2')) {
      return acc + (c.valor_plano || 0);
    }
    return acc;
  }, 0);

  const painel2Pago = totalReceitaP2 >= (config.custo_painel2_fixo || 200);
  const saldoP2Restante = Math.max(0, (config.custo_painel2_fixo || 200) - totalReceitaP2);

  let receitaBrutaTotal = 0;
  let custoTotalGeral = 0;

  const calculatedClients = clients.map(client => {
    let bruto = 0;
    let custo = 0;

    if (client.tipo === 'Revendedor') {
      const p1 = client.qtd_ativos_p1 || 0;
      const p2 = client.qtd_ativos_p2 || 0;
      bruto = (p1 * config.revenda_painel1) + (p2 * config.revenda_painel2);
      custo = p1 * config.custo_painel1; 
    } else {
      bruto = client.valor_plano || 0;
      if (client.painel.includes('Painel 1')) {
        custo = config.custo_painel1;
      } else {
        if (isAdmin) {
          custo = painel2Pago ? 0 : Math.min(bruto, saldoP2Restante);
        }
      }
    }

    const liquido = bruto - custo;
    receitaBrutaTotal += bruto;
    custoTotalGeral += custo;

    return { ...client, bruto, liquido, custo };
  });

  const lucroLiquidoTotal = receitaBrutaTotal - custoTotalGeral;

  const filteredClients = calculatedClients.filter(c => 
    (c.nome && c.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.dispositivo && c.dispositivo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Trava de vencimento (Admin NUNCA é bloqueado)
  const estaVencido = !isAdmin && (new Date() > new Date(config.data_vencimento));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-amber-400">
        <div className="animate-pulse text-xl font-semibold">Carregando MAX TV...</div>
      </div>
    );
  }

  if (session && estaVencido) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Assinatura Vencida!</h2>
          <p className="text-gray-300">Entre em contato com o suporte para renovar o acesso.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111827] border border-amber-500/30 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-300 uppercase mb-1">E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-300 uppercase mb-1">Senha</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
            </div>
            <button type="submit" className="w-full py-3 bg-amber-500 text-gray-950 font-bold rounded-xl">Entrar no Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <header className="bg-[#111827] border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Tv className="w-8 h-8 text-amber-400" />
            <h1 className="text-xl font-bold text-white">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm ${activeTab === 'dashboard' ? 'bg-amber-500 text-gray-950 font-semibold' : 'bg-[#1f2937] text-gray-300'}`}>Painel</button>
            <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-xl text-sm flex items-center space-x-1 ${activeTab === 'config' ? 'bg-amber-500 text-gray-950 font-semibold' : 'bg-[#1f2937] text-gray-300'}`}>
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </button>
            <button onClick={() => supabase.auth.signOut()} className="p-2 bg-red-950/40 text-red-400 rounded-xl" title="Sair"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {activeTab === 'dashboard' ? (
          <>
            {isAdmin && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${painel2Pago ? 'bg-green-950/30 border-green-500/50 text-green-300' : 'bg-amber-950/30 border-amber-500/50 text-amber-300'}`}>
                <div className="flex items-center space-x-3">
                  {painel2Pago ? <CheckCircle className="w-6 h-6 text-green-400" /> : <DollarSign className="w-6 h-6 text-amber-400" />}
                  <div>
                    <h4 className="font-bold">Status do Custo Fixo — Painel 2 (Zenpanel)</h4>
                    <p className="text-xs opacity-90">{painel2Pago ? "Painel 2 PAGO com folga!" : `Faltam R$ ${saldoP2Restante.toFixed(2)} para quitar o fixo de R$ 200,00.`}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#111827] border border-amber-500/20 rounded-2xl p-6 shadow-xl">
                <p className="text-xs uppercase text-gray-400 font-semibold">Receita Bruta Total</p>
                <h3 className="text-3xl font-bold text-white mt-2">R$ {receitaBrutaTotal.toFixed(2)}</h3>
              </div>
              <div className="bg-[#111827] border border-green-500/30 rounded-2xl p-6 shadow-xl">
                <p className="text-xs uppercase text-gray-400 font-semibold">Lucro Líquido</p>
                <h3 className="text-3xl font-bold text-green-400 mt-2">R$ {lucroLiquidoTotal.toFixed(2)}</h3>
              </div>
            </div>

            <div className="flex justify-between items-center bg-[#111827] p-4 rounded-2xl border border-gray-800">
              <div className="relative w-80">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#1f2937] rounded-xl text-white text-sm" />
              </div>
              <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 text-gray-950 font-bold rounded-xl shadow-lg">
                <Plus className="w-5 h-5" /><span>Adicionar Novo</span>
              </button>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1f2937]/50 border-b border-gray-800 text-xs uppercase text-gray-400">
                    <th className="p-4">Nome / Tipo</th>
                    <th className="p-4">Painel</th>
                    <th className="p-4">Detalhes</th>
                    <th className="p-4">Bruto</th>
                    <th className="p-4">Líquido</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {filteredClients.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-[#1f2937]/30">
                        <td className="p-4 font-medium text-white">{client.nome}<br/><span className="text-xs text-purple-400">{client.tipo}</span></td>
                        <td className="p-4 text-gray-300">{client.painel}</td>
                        <td className="p-4 text-gray-300 text-xs">
                          {client.tipo === 'Revendedor' ? `P1: ${client.qtd_ativos_p1} | P2: ${client.qtd_ativos_p2}` : client.dispositivo}
                        </td>
                        <td className="p-4 font-semibold text-white">R$ {client.bruto.toFixed(2)}</td>
                        <td className="p-4 font-semibold text-green-400">R$ {client.liquido.toFixed(2)}</td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => handleOpenEdit(client)} className="p-2 bg-amber-500/15 text-amber-400 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(client.id)} className="p-2 bg-red-950/40 text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-6 max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2"><Settings className="w-6 h-6 text-amber-400" /><span>Configurações</span></h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Revenda Painel 1</label>
                <input type="number" step="0.01" value={config.revenda_painel1} onChange={(e) => setConfig({...config, revenda_painel1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Revenda Painel 2</label>
                <input type="number" step="0.01" value={config.revenda_painel2} onChange={(e) => setConfig({...config, revenda_painel2: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
              </div>
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Custo por Ativo - Painel 1</label>
                    <input type="number" step="0.01" value={config.custo_painel1} onChange={(e) => setConfig({...config, custo_painel1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Custo Fixo Mensal - Painel 2</label>
                    <input type="number" step="0.01" value={config.custo_painel2_fixo} onChange={(e) => setConfig({...config, custo_painel2_fixo: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
                  </div>
                </>
              )}
              <button onClick={handleSaveConfig} className="w-full py-3 bg-amber-500 text-gray-950 font-bold rounded-xl mt-4">Salvar Configurações</button>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 space-y-6">
            <h3 className="text-xl font-bold text-white">{editingClient ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white">
                  <option value="Cliente Direto">Cliente Direto</option>
                  <option value="Revendedor">Revendedor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Nome</label>
                <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Painel</label>
                <select value={formData.painel} onChange={(e) => setFormData({...formData, painel: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white">
                  <option value="Painel 1 (Sigma)">Painel 1 (Sigma)</option>
                  <option value="Painel 2 (Zenpanel)">Painel 2 (Zenpanel)</option>
                </select>
              </div>
              {formData.tipo === 'Revendedor' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Ativos P1</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p1} onChange={(e) => setFormData({...formData, qtd_ativos_p1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Ativos P2</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p2} onChange={(e) => setFormData({...formData, qtd_ativos_p2: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Valor do Plano (R$)</label>
                    <input type="number" step="0.01" required value={formData.valor_plano} onChange={(e) => setFormData({...formData, valor_plano: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Dispositivo</label>
                    <input type="text" value={formData.dispositivo} onChange={(e) => setFormData({...formData, dispositivo: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] rounded-xl text-white" />
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-gray-950 font-bold rounded-xl">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
