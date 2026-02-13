export async function carregarCaixaSection() {
    // Carregar estado do caixa
    await carregarEstadoCaixa();

    const content = document.getElementById('caixa-content');

    const saldoAtual = caixaAberto
        ? (caixaData.valorAbertura + caixaData.totalVendas + caixaData.totalReforcos - caixaData.totalSangrias)
        : 0;

    const statusCor = caixaAberto ? '#28a745' : '#dc3545';
    const statusTexto = caixaAberto ? '🔓 Caixa Aberto' : '🔒 Caixa Fechado';
    const statusBg = caixaAberto ? '#d4edda' : '#f8d7da';

    content.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
            <!-- Status do Caixa -->
            <div style="background: ${statusBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; border-left: 4px solid ${statusCor};">
                <h3 style="margin: 0 0 10px 0; color: ${statusCor};">${statusTexto}</h3>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${statusCor};">
                    Saldo Atual: R$ ${saldoAtual.toFixed(2)}
                </p>
            </div>

            <!-- Botoes de Acao -->
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button 
                    type="button" 
                    onclick="abrirModalAberturaCaixa()" 
                    id="btnAbrirCaixaSection" 
                    class="btn btn-success" 
                    style="font-size: 18px; padding: 18px;"
                    ${caixaAberto ? 'disabled' : ''}>
                    🔓 Abrir Caixa
                </button>

                <button 
                    type="button" 
                    onclick="abrirModalReforcoCaixa()" 
                    id="btnReforcoCaixaSection" 
                    class="btn btn-primary" 
                    style="font-size: 18px; padding: 18px;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    💵 Reforco de Caixa
                </button>

                <button 
                    type="button" 
                    onclick="abrirModalSangria()" 
                    id="btnSangriaSection" 
                    class="btn btn-warning" 
                    style="font-size: 18px; padding: 18px; background: #ff9800; border-color: #ff9800;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    📉 Sangria
                </button>

                <button 
                    type="button" 
                    onclick="abrirModalFechamentoCaixa()" 
                    id="btnFecharCaixaSection" 
                    class="btn btn-danger" 
                    style="font-size: 18px; padding: 18px;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    🔒 Fechar Caixa
                </button>

                <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">

                <button 
                    type="button" 
                    onclick="abrirHistoricoFechamentos()" 
                    class="btn btn-info" 
                    style="font-size: 18px; padding: 18px; background: #6c757d; border-color: #6c757d;">
                    📊 Historico de Fechamentos
                </button>
            </div>
        </div>
    `;
}
