const fetchAppData = async (userId, userEmail) => {
    try {
      const { data: clientData } = await supabase.from('clientes_max').select('*').eq('user_id', userId);
      if (clientData) setClients(clientData);

      // BUSCA PELO E-MAIL (userEmail) EM VEZ DO ID (userId)
      const { data: configData } = await supabase.from('config_max').select('*').eq('user_id', userEmail).maybeSingle();
      
      // Se não achar por e-mail, tenta pelo ID (para garantir compatibilidade)
      const finalConfig = configData || (await supabase.from('config_max').select('*').eq('user_id', userId).maybeSingle()).data;

      if (finalConfig) {
        setConfig({
          custo_painel1: finalConfig.custo_painel1 ?? 5.00,
          revenda_painel1: finalConfig.revenda_painel1 ?? 8.00,
          revenda_painel2: finalConfig.revenda_painel2 ?? 5.00,
          custo_painel2_fixo: finalConfig.custo_painel2_fixo ?? 200.00,
          data_vencimento: finalConfig.data_vencimento ?? new Date().toISOString()
        });
      }
    } catch (e) {
      console.error(e);
    }
  };
