const API_URL = window.API_URL;

/**
 * Verificar conexao com servidor
 */
export async function verificarConexaoERP() {
    try {
        const response = await fetch(`${API_URL}/health`);
        window.serverOnline = response.ok;

        const badge = document.getElementById('statusBadge');
        if (window.serverOnline) {
            badge.className = 'status-badge online';
            badge.textContent = '● Online';
        } else {
            badge.className = 'status-badge offline';
            badge.textContent = '● Offline';
        }
    } catch (error) {
        window.serverOnline = false;
        const badge = document.getElementById('statusBadge');
        badge.className = 'status-badge offline';
        badge.textContent = '● Servidor Offline';
    }
}
