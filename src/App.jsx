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
    custo_painel2_fixo: 200.00,
    revenda_painel2: 30.00
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
          custo_painel2_fixo: configData.custo_painel2_fixo ?? 200.00,
          revenda_painel2: configData.revenda_painel2 ?? 30.00
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Cadastro realizado com sucesso!');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      alert('Digite seu e-mail primeiro.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) alert(error.message);
    else alert("E-mail de recuperação enviado com sucesso!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveConfig = async () => {
    if (!session) return;
    const payload = {
      user_id: session.user.id,
      custo_painel1: parseFloat(config.custo_painel1) || 0,
      revenda_painel1: parseFloat(config.revenda_painel1) || 0,
      custo_painel2_fixo: parseFloat(config.custo_painel2_fixo) || 0,
      revenda_painel2: parseFloat(config.revenda_painel2) || 0
    };

    const { data: existing } = await supabase.from('config_max').select('id').eq('user_id', session.user.id).maybeSingle();

    if (existing) {
      await supabase.from('config_max').update(payload).eq('user_id', session.user.id);
    } else {
      await supabase.from('config_max').insert([payload]);
    }

    alert('Configurações salvas com sucesso!');
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
      if (formData.painel.includes('Painel 1')) {
        brutoCalculado = (parseInt(formData.qtd_ativos_p1) || 0) * config.revenda_painel1;
      } else {
        brutoCalculado = (parseInt(formData.qtd_ativos_p2) || 0) * config.revenda_painel2;
      }
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

  const totalReceitaP2 = clients.filter(c => c.painel.includes('Painel 2')).reduce((acc, c) => {
    if (c.tipo === 'Revendedor') {
      return acc + ((c.qtd_ativos_p2 || 0) * config.revenda_painel2);
    }
    return acc + (c.valor_plano || 0);
  }, 0);

  const painel2Pago = totalReceitaP2 >= (config.custo_painel2_fixo || 200);
  const saldoP2Restante = Math.max(0, (config.custo_painel2_fixo || 200) - totalReceitaP2);

  let receitaBrutaTotal = 0;
  let custoTotalGeral = 0;

  const calculatedClients = clients.map(client => {
    let bruto = 0;
    let custo = 0;

    if (client.painel.includes('Painel 1')) {
      if (client.tipo === 'Revendedor') {
        const ativos = client.qtd_ativos_p1 || 0;
        bruto = ativos * config.revenda_painel1;
        custo = ativos * config.custo_painel1;
      } else {
        bruto = client.valor_plano || 0;
        custo = config.custo_painel1;
      }
    } else {
      if (client.tipo === 'Revendedor') {
        const ativos = client.qtd_ativos_p2 || 0;
        bruto = ativos * config.revenda_painel2;
      } else {
        bruto = client.valor_plano || 0;
      }

      if (isAdmin) {
        custo = painel2Pago ? 0 : Math.min(bruto, saldoP2Restante);
      } else {
        custo = 0;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-amber-400">
        <div className="animate-pulse text-xl font-semibold">Carregando MAX TV...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111827] border border-amber-500/30 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-amber-500/15 rounded-2xl mb-3 border border-amber-500/30">
              <Tv className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
            <p className="text-sm text-gray-400 mt-1">Gestão inteligente de Clientes e Revendas</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 text-red-300 text-sm rounded-xl">
              {errorMsg}
            </div>
          )}

          {!isReset ? (
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase mb-1">E-mail</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  placeholder="seuemail@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Senha</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 font-bold rounded-xl shadow-lg">
                {isSignUp ? 'Cadastrar Conta' : 'Entrar no Sistema'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase mb-1">E-mail de Recuperação</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  placeholder="seuemail@exemplo.com"
                />
              </div>
              <button onClick={handleResetPassword} className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 font-bold rounded-xl shadow-lg">
                Enviar E-mail de Recuperação
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center space-y-2">
            {!isReset && (
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-amber-400 hover:underline">
                {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
              </button>
            )}
            <button onClick={() => setIsReset(!isReset)} className="text-xs text-gray-400 hover:underline">
              {isReset ? 'Voltar ao Login' : 'Esqueci minha senha'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      <header className="bg-[#111827] border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <Tv className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white">MAX TV <span className="text-amber-400">GOLD VIP</span></h1>
              <p className="text-xs text-gray-400">{isAdmin ? "Painel do Administrador" : "Painel do Revendedor"}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-amber-500 text-gray-950 font-semibold' : 'bg-[#1f2937] text-gray-300'}`}>
              Painel Principal
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 transition ${activeTab === 'config' ? 'bg-amber-500 text-gray-950 font-semibold' : 'bg-[#1f2937] text-gray-300'}`}>
                <Settings className="w-4 h-4" />
                <span>Configurações</span>
              </button>
            )}
            <button onClick={handleLogout} className="p-2 bg-red-950/40 text-red-400 border border-red-900/50 rounded-xl" title="Sair">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {activeTab === 'dashboard' ? (
          <>
            {/* O AVISO DO PAINEL 2 AGORA SÓ APARECE SE FOR ADMIN */}
            {isAdmin && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${painel2Pago ? 'bg-green-950/30 border-green-500/50 text-green-300' : 'bg-amber-950/30 border-amber-500/50 text-amber-300'}`}>
                <div className="flex items-center space-x-3">
                  {painel2Pago ? <CheckCircle className="w-6 h-6 text-green-400" /> : <DollarSign className="w-6 h-6 text-amber-400" />}
                  <div>
                    <h4 className="font-bold">Status do Custo Fixo — Painel 2 (Zenpanel)</h4>
                    <p className="text-xs opacity-90">
                      {painel2Pago 
                        ? "Painel 2 PAGO! Custo quitado com folga, os demais cadastros geram 100% de lucro líquido." 
                        : `Faltam R$ ${saldoP2Restante.toFixed(2)} em receita do Painel 2 para quitar o custo fixo de R$ 200,00.`}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-black/40 border border-current">
                  {painel2Pago ? "QUITADO" : "EM ABERTO"}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#111827] border border-amber-500/20 rounded-2xl p-6 shadow-xl relative">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">{isAdmin ? "Receita Bruta Total" : "Meu Faturamento Bruto"}</p>
                <h3 className="text-3xl font-bold text-white mt-2">R$ {receitaBrutaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-[#111827] border border-green-500/30 rounded-2xl p-6 shadow-xl relative">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">{isAdmin ? "Lucro Líquido Total" : "Meu Lucro Líquido"}</p>
                <h3 className="text-3xl font-bold text-green-400 mt-2">R$ {lucroLiquidoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#111827] p-4 rounded-2xl border border-gray-800">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input 
                  type="text" placeholder="Buscar cliente ou revendedor..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <button 
                onClick={() => { 
                  setEditingClient(null); 
                  setFormData({ nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box', observacoes: '', qtd_ativos_p1: 1, qtd_ativos_p2: 0 });
                  setShowModal(true); 
                }}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 font-bold rounded-xl shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Adicionar Novo</span>
              </button>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1f2937]/50 border-b border-gray-800 text-xs uppercase text-gray-400 tracking-wider">
                      <th className="p-4">Nome / Tipo</th>
                      <th className="p-4">Painel</th>
                      <th className="p-4">Detalhes / Qtde</th>
                      <th className="p-4">Valor Bruto</th>
                      <th className="p-4">Lucro Líquido</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-500">Nenhum cliente ou revendedor cadastrado ainda.</td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-[#1f2937]/30 transition">
                          <td className="p-4 font-medium text-white">
                            <div>{client.nome}</div>
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-md mt-1 ${client.tipo === 'Revendedor' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}`}>
                              {client.tipo}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300">{client.painel}</td>
                          <td className="p-4 text-gray-300 text-xs">
                            {client.tipo === 'Revendedor' ? (
                              <div>
                                <div>P1 (Sigma): {client.qtd_ativos_p1} ativos</div>
                                <div>P2 (Zen): {client.qtd_ativos_p2} ativos</div>
                              </div>
                            ) : (
                              <div>
                                <div>{client.dispositivo}</div>
                                <div className="text-amber-400/90 italic mt-0.5">{client.observacoes || 'Sem obs'}</div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-semibold text-white">R$ {client.bruto.toFixed(2)}</td>
                          <td className="p-4 font-semibold text-green-400">R$ {client.liquido.toFixed(2)}</td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => handleOpenEdit(client)} className="p-2 bg-amber-500/15 text-amber-400 rounded-lg hover:bg-amber-500/30" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(client.id)} className="p-2 bg-red-950/40 text-red-400 rounded-lg hover:bg-red-900/50" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          isAdmin && (
            <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-6 max-w-2xl mx-auto shadow-2xl space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Settings className="w-6 h-6 text-amber-400" />
                <span>Configurações Financeiras e Valores</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Custo por Ativo - Painel 1 (Sigma)</label>
                  <input type="number" step="0.01" value={config.custo_painel1} onChange={(e) => setConfig({...config, custo_painel1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Valor Padrão Revenda - Painel 1</label>
                  <input type="number" step="0.01" value={config.revenda_painel1} onChange={(e) => setConfig({...config, revenda_painel1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Custo Fixo Mensal - Painel 2 (Zenpanel)</label>
                  <input type="number" step="0.01" value={config.custo_painel2_fixo} onChange={(e) => setConfig({...config, custo_painel2_fixo: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Valor Padrão Revenda - Painel 2</label>
                  <input type="number" step="0.01" value={config.revenda_painel2} onChange={(e) => setConfig({...config, revenda_painel2: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                </div>
                <button onClick={handleSaveConfig} className="w-full py-3 bg-amber-500 text-gray-950 font-bold rounded-xl mt-4">
                  Salvar Configurações
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">{editingClient ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Tipo de Cadastro</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white">
                  <option value="Cliente Direto">Cliente Direto</option>
                  <option value="Revendedor">Revendedor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Nome</label>
                <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" placeholder="Nome do cliente ou revendedor" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Painel</label>
                <select value={formData.painel} onChange={(e) => setFormData({...formData, painel: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white">
                  <option value="Painel 1 (Sigma)">Painel 1 (Sigma)</option>
                  <option value="Painel 2 (Zenpanel)">Painel 2 (Zenpanel)</option>
                </select>
              </div>

              {formData.tipo === 'Revendedor' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Qtde Ativos Painel 1</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p1} onChange={(e) => setFormData({...formData, qtd_ativos_p1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Qtde Ativos Painel 2</label>
                    <input type="number" min="0" value={formData.qtd_ativos_p2} onChange={(e) => setFormData({...formData, qtd_ativos_p2: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Valor do Plano (R$)</label>
                    <input type="number" step="0.01" required value={formData.valor_plano} onChange={(e) => setFormData({...formData, valor_plano: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" placeholder="35.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Dispositivo</label>
                    <input type="text" value={formData.dispositivo} onChange={(e) => setFormData({...formData, dispositivo: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" placeholder="TV Box, Smart TV..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Observações</label>
                    <input type="text" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" placeholder="Vencimento dia 10..." />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-gray-950 font-bold rounded-xl">{editingClient ? 'Atualizar' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
