import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Tv, DollarSign, Plus, Settings, LogOut, Trash2, Edit2, Search, CheckCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState([]);
  const [config, setConfig] = useState({
    custo_p1: 5.00, revenda_p1: 8.00, custo_p2_fixo: 200.00, revenda_p2: 30.00
  });

  // ... (manter estados de modal e formulário)
  
  // Lógica de cálculo avançada
  const totalReceitaP2 = clients.filter(c => c.painel.includes('Painel 2')).reduce((acc, c) => {
    const ativos = c.tipo === 'Revendedor' ? (c.qtd_ativos_p2 || 0) : 1;
    return acc + (ativos * config.revenda_p2);
  }, 0);

  const painel2Pago = totalReceitaP2 >= config.custo_p2_fixo;
  const saldoP2 = config.custo_p2_fixo - totalReceitaP2;

  const processedClients = clients.map(c => {
    let bruto = 0, liquido = 0;
    
    if (c.painel.includes('Painel 1')) {
      const ativos = c.tipo === 'Revendedor' ? (c.qtd_ativos_p1 || 0) : 1;
      bruto = ativos * config.revenda_p1;
      liquido = ativos * (config.revenda_p1 - config.custo_p1);
    } else {
      // Painel 2
      const ativos = c.tipo === 'Revendedor' ? (c.qtd_ativos_p2 || 0) : 1;
      bruto = ativos * config.revenda_p2;
      
      // Se painel2Pago, custo = 0, senão custo = rateio do que falta pagar
      liquido = painel2Pago ? bruto : Math.max(0, bruto - saldoP2); 
    }
    return { ...c, bruto, liquido };
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 p-6">
      {/* Indicador de Status do Painel 2 */}
      <div className={`p-4 mb-6 rounded-xl border ${painel2Pago ? 'bg-green-950/30 border-green-500' : 'bg-amber-950/30 border-amber-500'}`}>
        <div className="flex justify-between items-center">
          <span className="font-bold">{painel2Pago ? "PAINEL 2: PAGO E LUCRANDO" : `PAINEL 2: Falta pagar R$ ${saldoP2.toFixed(2)}`}</span>
          {painel2Pago && <CheckCircle className="text-green-500" />}
        </div>
      </div>
      
      {/* ... (restante da interface mantendo a lógica anterior) */}
    </div>
  );
}
