/**
 * CORE MAINTENANCE SYSTEM - Mesh Engine PRO
 * Altere a variável abaixo para travar/destravar o acesso.
 */

const CONFIG = {
    isUnderMaintenance: false, // TRUE = Bloqueado | FALSE = Liberado
    maintenancePage: "manutencao.html"
};

(function checkSystemStatus() {
    const currentPage = window.location.pathname.split("/").pop();

    if (CONFIG.isUnderMaintenance) {
        // Se estiver em manutenção e NÃO estiver na página de manutenção, redireciona
        if (currentPage !== CONFIG.maintenancePage) {
            window.location.href = CONFIG.maintenancePage;
        }
    } else {
        // Se NÃO estiver em manutenção e estiver na página de erro, volta para a home
        if (currentPage === CONFIG.maintenancePage) {
            window.location.href = "index.html";
        }
    }
})();
