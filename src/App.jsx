import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, LogOut, Plus, Trash2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(session.user.id);
      setLoading(false);
    });
  }, []);

  const fetchData = async (userId) => {
    const { data } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
    if (data) setClients(data);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    await supabase.from('clientes_max').insert([{ user_id: session.user.id, ...formData }]);
    setShowModal(false);
    setFormData({ nome: '', tipo: 'Cliente Direto', painel: 'Painel 1 (Sigma)', valor_plano: '', dispositivo: 'TV Box' });
    fetchData(session.user.id);
  };

  const handleDelete = async (id) => {
    await supabase.from('clientes_max').delete().eq('id', id);
    fetchData(session.user.id);
  };

  const totalReceita = clients.reduce((acc, c) => acc + (parseFloat(c.valor_plano) || 0), 0);

  if (loading) return <div className="p-10 text-center text-amber-500 bg-[#0b0f19] min-h-screen">Carregando...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email, password }); window.location.reload(); }} className="bg-[#111827] p-8 rounded-2xl w-full max-w-sm border border-gray-800 shadow-xl">
          <h1 className="text-xl font-bold text-white mb-6 text-center tracking-wide">MAX TV <span className="text-amber-400">GOLD</span></h1>
          <input type="email" placeholder="E-mail" required onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-amber-500" />
          <input type="password" placeholder="Senha" required onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-amber-500" />
          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 p-3 rounded-xl font-bold text-gray-950 transition">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4 max-w-4xl mx-auto flex flex-col space-y-5">
      {/* Cabeçalho Perfeitamente Alinhado */}
      <header className="bg-[#111827] border border-gray-800 px-5 py-4 rounded-2xl flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-2.5">
          <Tv className="w-6 h-6 text-amber-400" />
          <h1 className="font-bold text-base tracking-wide">MAX TV <span className="text-amber-400">GOLD</span></h1>
        </div>
        <button 
          onClick={() => supabase.auth.signOut().then(() => window.location.reload())} 
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-950/50 border border-red-900/50 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-900/40 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </header>

      {/* Card de Receita Total */}
      <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl text-center shadow-xl">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Receita Total</p>
        <h2 className="text-3xl font-bold text-white">R$ {totalReceita.toFixed(2)}</h2>
      </div>

      {/* Botão Adicionar */}
      <button 
        onClick={() => setShowModal(true)} 
        className="w-full bg-amber-500 hover:bg-amber-600 py-3.5 rounded-2xl font-bold text-gray-950 shadow-lg flex items-center justify-center space-x-2 transition"
      >
        <Plus className="w-5 h-5" />
        <span>Adicionar Cliente</span>
      </button>

      {/* Lista de Clientes */}
      <div className="space-y-3 pb-6">
        {clients.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm bg-[#111827] border border-gray-800 rounded-2xl">
            Nenhum cliente cadastrado ainda.
          </div>
        ) : (
          clients.map(c => (
            <div key={c.id} className="bg-[#111827] border border-gray-800 p-4 rounded-2xl flex justify-between items-center shadow-md">
              <div className="space-y-0.5">
                <p className="font-bold text-sm text-white">{c.nome}</p>
                <p className="text-xs text-gray-400">{c.painel} — <span className="text-amber-400 font-semibold">R$ {parseFloat(c.valor_plano || 0).toFixed(2)}</span></p>
              </div>
              <button 
                onClick={() => handleDelete(c.id)} 
                className="p-2 bg-red-950/40 border border-red-900/30 text-red-400 rounded-xl hover:bg-red-900/40 transition"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveClient} className="bg-[#111827] border border-gray-800 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Novo Cliente</h3>
            <div>
              <label className="block text-[10px] uppercase text-gray-400 mb-1">Nome do Cliente</label>
              <input type="text" required placeholder="Ex: João Silva" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-400 mb-1">Painel</label>
              <select value={formData.painel} onChange={(e) => setFormData({...formData, painel: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-amber-500">
                <option value="Painel 1 (Sigma)">Painel 1 (Sigma)</option>
                <option value="Painel 2 (Zenpanel)">Painel 2 (Zenpanel)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-400 mb-1">Valor do Plano (R$)</label>
              <input type="number" step="0.01" required placeholder="0.00" value={formData.valor_plano} onChange={(e) => setFormData({...formData, valor_plano: e.target.value})} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-amber-500" />
            </div>
            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="w-1/2 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-700 transition">Cancelar</button>
              <button type="submit" className="w-1/2 py-3 bg-amber-500 text-gray-950 font-bold rounded-xl text-sm hover:bg-amber-600 transition">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
