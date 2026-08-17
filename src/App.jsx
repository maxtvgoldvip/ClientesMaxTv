import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, LogOut, Plus, Trash2, Edit2, Search } from 'lucide-react';

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
    fetchData(session.user.id);
  };

  const handleDelete = async (id) => {
    await supabase.from('clientes_max').delete().eq('id', id);
    fetchData(session.user.id);
  };

  const totalReceita = clients.reduce((acc, c) => acc + (parseFloat(c.valor_plano) || 0), 0);

  if (loading) return <div className="p-10 text-center text-amber-500">Carregando...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email, password }); window.location.reload(); }} className="bg-[#111827] p-8 rounded-2xl w-full max-w-sm border border-gray-800">
          <h1 className="text-xl font-bold text-white mb-6 text-center">MAX TV GOLD VIP</h1>
          <input type="email" placeholder="E-mail" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 bg-gray-900 rounded-xl text-white text-sm" />
          <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-gray-900 rounded-xl text-white text-sm" />
          <button type="submit" className="w-full bg-amber-500 p-3 rounded-xl font-bold text-black">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4">
      <header className="flex justify-between items-center pb-6 border-b border-gray-800 mb-6">
        <h1 className="font-bold flex items-center gap-2"><Tv className="text-amber-500"/> MAX TV GOLD</h1>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}><LogOut className="w-5 h-5 text-red-500"/></button>
      </header>

      <div className="bg-gray-900 p-6 rounded-2xl mb-6 text-center border border-gray-800">
        <p className="text-xs text-gray-400">RECEITA TOTAL</p>
        <h2 className="text-3xl font-bold">R$ {totalReceita.toFixed(2)}</h2>
      </div>

      <button onClick={() => setShowModal(true)} className="w-full bg-amber-500 py-3 rounded-xl font-bold text-black mb-6 flex items-center justify-center gap-2">
        <Plus/> Adicionar Cliente
      </button>

      <div className="space-y-3">
        {clients.map(c => (
          <div key={c.id} className="bg-[#111827] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">{c.nome}</p>
              <p className="text-xs text-gray-500">{c.painel} - R$ {parseFloat(c.valor_plano).toFixed(2)}</p>
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6">
          <form onSubmit={handleSaveClient} className="bg-[#111827] p-6 rounded-2xl w-full max-w-sm border border-gray-800">
            <input placeholder="Nome" required onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full p-3 mb-2 bg-gray-900 rounded text-sm"/>
            <input type="number" placeholder="Valor (R$)" required onChange={(e) => setFormData({...formData, valor_plano: e.target.value})} className="w-full p-3 mb-2 bg-gray-900 rounded text-sm"/>
            <button type="submit" className="w-full bg-amber-500 py-2 rounded font-bold text-black mt-2">Salvar</button>
            <button type="button" onClick={() => setShowModal(false)} className="w-full mt-2 text-gray-500 text-sm">Cancelar</button>
          </form>
        </div>
      )}
    </div>
  );
}
