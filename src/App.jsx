// ... (mantenha os imports e estados iniciais iguais)

  return (
    // ... (no cabeçalho, substitua o botão de Configurações por este bloco inteligente)
            
            <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 transition ${activeTab === 'config' ? 'bg-amber-500 text-gray-950 font-semibold' : 'bg-[#1f2937] text-gray-300'}`}>
              <Settings className="w-4 h-4" />
              <span>{isAdmin ? 'Configurações' : 'Meus Custos'}</span>
            </button>

    // ... (dentro do bloco do activeTab === 'config', substitua pelo novo formulário)

        ) : (
          <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-6 max-w-2xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Settings className="w-6 h-6 text-amber-400" />
              <span>{isAdmin ? "Configurações do Administrador" : "Meus Custos por Ativo"}</span>
            </h2>

            <div className="space-y-4">
              {/* ESTES CAMPOS APARECEM PARA TODOS */}
              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Custo por Ativo - Painel 1 (Sigma)</label>
                <input type="number" step="0.01" value={config.custo_painel1} onChange={(e) => setConfig({...config, custo_painel1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
              </div>

              {/* CAMPOS EXCLUSIVOS DO ADMIN */}
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Custo Fixo Mensal - Painel 2 (Zenpanel)</label>
                    <input type="number" step="0.01" value={config.custo_painel2_fixo} onChange={(e) => setConfig({...config, custo_painel2_fixo: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Valor de Revenda Padrão - Painel 1</label>
                    <input type="number" step="0.01" value={config.revenda_painel1} onChange={(e) => setConfig({...config, revenda_painel1: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 uppercase mb-1">Valor de Revenda Padrão - Painel 2</label>
                    <input type="number" step="0.01" value={config.revenda_painel2} onChange={(e) => setConfig({...config, revenda_painel2: e.target.value})} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white" />
                  </div>
                </>
              )}

              <button onClick={handleSaveConfig} className="w-full py-3 bg-amber-500 text-gray-950 font-bold rounded-xl mt-4">
                Salvar Configurações
              </button>
            </div>
          </div>
        )}
