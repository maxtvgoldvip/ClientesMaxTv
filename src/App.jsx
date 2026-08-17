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
      if (session) {
        fetchAppData(session.user.id, session.user.email);
        if (session.user.email === adminEmail) fetchAllResellers();
      }
      setLoading(false);
    });
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
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllResellers = async () => {
    const { data } = await supabase.from('config_max').select('*');
    if (data) setResellers(data);
  };

  const handleManualAddReseller = async () => {
    if (!newResellerEmail) return;
    let d = new Date();
    d.setDate(d.getDate() + 30);
    const { error } = await supabase.from('config_max').upsert([{ 
        user_id: newResellerEmail.trim(), 
        data_vencimento: d.toISOString(),
        custo_painel1: 5.00, revenda_painel1: 8.00, revenda_painel2: 5.00, custo_painel2_fixo: 200.00
    }], { onConflict: 'user_id' });
    if (error) alert('Erro: ' + error.message);
    else { alert('Revendedor adicionado!'); setNewResellerEmail(''); fetchAllResellers(); }
  };

  const handleRenewReseller = async (id) => {
    let d = new Date();
    d.setDate(d.getDate() + 30);
    const { error } = await supabase.from('config_max').update({ data_vencimento: d.toISOString() }).eq('id', id);
    if (error) alert('Erro ao renovar: ' + error.message);
    else { alert('Assinatura renovada!'); fetchAllResellers(); }
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
    fetchAppData(session.user.id, session.user.email);
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
  const isExpired = !isAdmin && new Date() > new Date(config.data_vencimento);

  if (loading) return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-amber-400">Carregando...</div>;

  if (session && isExpired) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-red-500/50 p-8 rounded-2xl w-full max-w-sm">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Assinatura Vencida</h2>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-600 py-3 rounded-xl text-white font-bold mt-4">Sair da Conta</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-[#111827] border border-gray-800 p-8 rounded-2xl w-full max-w-sm space-y-4">
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
            <h1 className="text-base font-bold">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'dashboard' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Painel</button>
            {isAdmin && <button onClick={() => setActiveTab('revendedores')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'revendedores' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Revendedores</button>}
            <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'config' ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300'}`}>Config</button>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="p-1.5 bg-red-950/60 text-red-400 rounded-lg"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full flex-1 space-y-4">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
                <p className="text-[10px] uppercase text-gray-400 font-semibold">Receita Total</p>
                <h3 className="text-xl font-bold text-white mt-1">R$ {receitaBrutaTotal.toFixed(2)}</h3>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
                <p className="text-[10px] uppercase text-gray-400 font-semibold">Lucro Líquido</p>
                <h3 className="text-xl font-bold text-green-400 mt-1">R$ {lucroLiquidoTotal.toFixed(2)}</h3>
              </div>
            </div>

            <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="w-full flex items-center justify-center space-x-2 py-3 bg-amber-500 text-gray-950 font-bold rounded-xl text-sm shadow-lg">
              <Plus className="w-4 h-4" /><span>Adicionar Cliente</span>
            </button>

            <div className="space-y-2">
              {filteredClients.length === 0 ? (
                <div className="text-center p-6 text-gray-500 text-sm">Nenhum cliente cadastrado.</div>
              ) : (
                filteredClients.map((client) => (
                  <div key={client.id} className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">{client.nome} <span className="text-[10px] text-purple-400">({client.tipo})</span></p>
                      <p className="text-xs text-gray-400">{client.painel}</p>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <p className="font-bold text-sm text-green-400">R$ {client.liquido.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-500">Bruto: R$ {client.bruto.toFixed(2)}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button onClick={() => handleOpenEdit(client)} className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(client.id)} className="p-1.5 bg-red-950/40 text-red-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'revendedores' && isAdmin && (
          <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl space-y-4">
            <h2 className="text-base font-bold text-white">Gestão de Revendedores</h2>
            <div className="flex gap-2">
              <input type="email" placeholder="E-mail do revendedor" value={newResellerEmail} onChange={(e) => setNewResellerEmail(e.target.value)} className="flex-1 p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
              <button onClick={handleManualAddReseller} className="bg-green-600 px-4 py-2.5 rounded-xl font-bold text-white text-xs">Adicionar</button>
            </div>
            <div className="space-y-2">
              {resellers.map(r => {
                const vencido = new Date() > new Date(r.data_vencimento);
                return (
                  <div key={r.id} className="flex justify-between items-center p-3 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="text-xs font-mono text-gray-300 truncate max-w-[180px]">
                      {r.user_id}<br/>
                      <span className={`text-[9px] font-bold px-1 rounded ${vencido ? 'bg-red-950 text-red-400' : 'bg-green-950 text-green-400'}`}>{vencido ? 'VENCIDO' : 'ATIVO'}</span>
                    </div>
                    <button onClick={() => handleRenewReseller(r.id)} className="bg-amber-500 text-gray-950 px-3 py-1.5 rounded-lg font-bold text-xs">Renovar +30</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl max-w-sm mx-auto space-y-3">
            <h2 className="text-base font-bold text-white text-center">Configurações</h2>
            <div>
              <label className="block text-[10px] uppercase text-gray-400 mb-1">Revenda Painel 1</label>
              <input type="number" step="0.01" value={config.revenda_painel1} onChange={(e) => setConfig({...config, revenda_painel1: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-400 mb-1">Revenda Painel 2</label>
              <input type="number" step="0.01" value={config.revenda_painel2} onChange={(e) => setConfig({...config, revenda_painel2: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
            </div>
            <button onClick={handleSaveConfig} className="w-full bg-amber-500 text-gray-950 p-2.5 rounded-xl font-bold text-xs mt-2">Salvar</button>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-sm p-5 space-y-3">
            <h3 className="text-base font-bold text-white">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <form onSubmit={handleSaveClient} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs">
                  <option value="Cliente Direto">Cliente Direto</option>
                  <option value="Revendedor">Revendedor</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Nome</label>
                <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Painel</label>
                <select value={formData.painel} onChange={(e) => setFormData({...formData, painel: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs">
                  <option value="Painel 1 (Sigma)">Painel 1 (Sigma)</option>
                  <option value="Painel 2 (Zenpanel)">Painel 2 (Zenpanel)</option>
                </select>
              </div>
              {formData.tipo === 'Revendedor' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Ativos P1</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p1} onChange={(e) => setFormData({...formData, qtd_ativos_p1: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Ativos P2</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p2} onChange={(e) => setFormData({...formData, qtd_ativos_p2: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Valor do Plano (R$)</label>
                    <input type="number" step="0.01" required value={formData.valor_plano} onChange={(e) => setFormData({...formData, valor_plano: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Dispositivo</label>
                    <input type="text" value={formData.dispositivo} onChange={(e) => setFormData({...formData, dispositivo: e.target.value})} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs" />
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 bg-gray-800 text-gray-300 rounded-xl text-xs">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-gray-950 font-bold rounded-xl text-xs">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
