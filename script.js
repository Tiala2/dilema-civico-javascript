document.addEventListener('DOMContentLoaded', () => {
  let moedas = 0;
  let bemEstar = 50;
  let rodada = 1;
  const totalRodadas = 6;

  // Classes sociais
  const classesSociais = {
    baixa: { rendaInicial: 50, irpf: 0.075, consumo: 5 },
    mÃ©dia: { rendaInicial: 100, irpf: 0.15, consumo: 10 },
    alta: { rendaInicial: 200, irpf: 0.275, consumo: 20 }
  };
  let classeAtual = null;

  // Telas
  const telas = {
    menu: document.getElementById('tela-menu'),
    classe: document.getElementById('tela-classe'),
    instrucoes: document.getElementById('tela-instrucoes'),
    jogo: document.getElementById('tela-jogo'),
    resultado: document.getElementById('tela-resultado')
  };

  // Displays
  const displayRodada = document.getElementById('display-rodada');
  const displayMoedas = document.getElementById('display-moedas');
  const displayBemestar = document.getElementById('display-bemestar');
  const textoDecisao = document.getElementById('texto-decisao');
  const finalMoedas = document.getElementById('final-moedas');
  const finalBemestar = document.getElementById('final-bemestar');
  const mensagemFinal = document.getElementById('mensagem-final');

  // BotÃµes
  const btnJogar = document.getElementById('btn-jogar');
  const btnInstrucoes = document.getElementById('btn-instrucoes');
  const btnVoltarInstrucoes = document.getElementById('btn-voltar-instrucoes');
  const btnSair = document.getElementById('btn-sair');
  const btnPagar = document.getElementById('btn-pagar');
  const btnSonegar = document.getElementById('btn-sonegar');
  const btnVoltarMenu = document.getElementById('btn-voltar-menu');

  // Pop-up de informaÃ§Ãµes
  const infoPopup = document.getElementById('info-popup');
  const voltarBtn = document.getElementById('voltar-btn');
  let popupTimeoutId = null;

  // Pop-up de crise financeira
  const crisePopup = document.getElementById('crise-popup');
  const criseTexto = document.getElementById('crise-texto');
  const btnPedirEmprestimo = document.getElementById('btn-pedir-emprestimo');
  const btnSonegarCrise = document.getElementById('btn-sonegar-crise');
  let criseAberta = false;

  // Toast de alerta (fiscalizaÃ§Ã£o)
  const alertaToast = document.getElementById('alert-toast');
  const alertaToastMsg = document.getElementById('alert-toast-msg');
  let alertaTimeoutId = null;
  let decisaoBloqueada = false;

  function bloquearDecisao() {
    decisaoBloqueada = true;
    [btnPagar, btnSonegar].forEach(btn => {
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
    });
  }

  function liberarDecisao() {
    decisaoBloqueada = false;
    [btnPagar, btnSonegar].forEach(btn => {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    });
  }

  // Estado adicional de jogo
  let jogadorEstaSonegando = false; // flag ativada pela escolha na crise
  let classeSelecionada = null;     // mantÃ©m a chave da classe ('baixa' | 'mÃ©dia' | 'alta')
  const emprestimosPorClasse = {
    baixa: 120,
    mÃ©dia: 240,
    alta: 400,
  };

  // Ãudio
  const audioFundo = document.getElementById('audio-fundo');

  function mostrarTela(nome) {
    const telaDestino = telas[nome];
    if (!telaDestino) return;
    if (nome !== 'jogo') liberarDecisao();

    Object.values(telas).forEach(t => {
      t.classList.add('hidden');
      t.classList.remove('screen-enter');
    });

    telaDestino.classList.remove('hidden');
    void telaDestino.offsetWidth;
    telaDestino.classList.add('screen-enter');

    // Reinicia o Ã¡udio sem quebrar o fluxo quando o navegador bloquear autoplay.
    if (audioFundo) {
      audioFundo.currentTime = 0;
      const playPromise = audioFundo.play();
      if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
    }

    // Sempre que trocar de tela, garantir que o pop-up esteja oculto
    if (nome !== 'resultado' && infoPopup) {
      infoPopup.style.display = 'none';
    }
    // Cancelar timer pendente ao trocar de tela
    if (popupTimeoutId) {
      clearTimeout(popupTimeoutId);
      popupTimeoutId = null;
    }
    // Sempre esconder crise ao trocar de tela
    if (crisePopup) {
      crisePopup.style.display = 'none';
      criseAberta = false;
    }
    // Ocultar alerta ao trocar de tela
    if (alertaToast) {
      alertaToast.classList.remove('show');
      if (alertaTimeoutId) {
        clearTimeout(alertaTimeoutId);
        alertaTimeoutId = null;
      }
    }
  }

  function atualizarDisplays() {
    displayRodada.textContent = `${rodada}/${totalRodadas}`;
    displayMoedas.textContent = moedas;
    displayBemestar.textContent = bemEstar;
  }

  function iniciarSelecaoClasse() {
    mostrarTela('classe');
  }

  document.querySelectorAll('.class-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      const classe = btn.dataset.classe;
      classeAtual = classesSociais[classe];
      classeSelecionada = classe; // guardamos a chave da classe
      moedas = classeAtual.rendaInicial;
      bemEstar = 50;
      rodada = 1;
      atualizarDisplays();
      mostrarTela('jogo');

    });
  });

  function iniciarJogo() {
    iniciarSelecaoClasse();
  }
  
  
  function proximaRodada() {
    rodada++;
    if (rodada > totalRodadas) fimDeJogo();
    else {
      atualizarDisplays();
      textoDecisao.textContent = 'Aguardando sua decisÃ£o...';
      liberarDecisao();
    }
  }

  function pagar() {
    if (decisaoBloqueada) return;
    bloquearDecisao();
    // Se o jogador escolheu sonegar via crise, pular pagamento
    if (jogadorEstaSonegando) {
      textoDecisao.textContent = 'VocÃª optou por nÃ£o pagar impostos nas prÃ³ximas rodadas.';
      atualizarDisplays();
      setTimeout(proximaRodada, 800);
      return;
    }
    const irpfRodada = Math.round(moedas * classeAtual.irpf);
    const consumoRodada = classeAtual.consumo;
    moedas -= (irpfRodada + consumoRodada);
    bemEstar += 10;
    textoDecisao.textContent = `VocÃª pagou os impostos desta rodada (-${irpfRodada + consumoRodada} moedas).`;
    atualizarDisplays();
    const tratado = verificarCriseFinanceira();
    if (!tratado) {
      setTimeout(proximaRodada, 800);
    }
  }

  function sonegar() {
    if (decisaoBloqueada) return;
    bloquearDecisao();
    // Ganho e fiscalizaÃ§Ã£o 
    const ganho = 8 + Math.floor(Math.random() * 8); // 8 a 15 moedas
    moedas += ganho;
    bemEstar -= 5;
    let msg = `VocÃª optou por sonegar nesta rodada (+${ganho} moedas).`;

    // Probabilidade varia entre 10% e 35% a cada tentativa, para parecer mais "na sorte"
    const probFiscalizacao = 0.10 + Math.random() * 0.25; // [0.10, 0.35]
    if (Math.random() < probFiscalizacao) {
      const multa = 30 + Math.floor(Math.random() * 31); // 30 a 60
      const perdaBemEstar = 10 + Math.floor(Math.random() * 11); // 10 a 20
      moedas -= multa;
      bemEstar -= perdaBemEstar;
      msg += ` âš ï¸ VocÃª foi pego na auditoria! Penalidade (-${multa} moedas, -${perdaBemEstar} bem-estar).`;
      // Exibe alerta visual de fiscalizaÃ§Ã£o
      mostrarAlertaFiscalizacao('ALERTA: VocÃª foi pego na auditoria!');
    }
    textoDecisao.textContent = msg;
    atualizarDisplays();
    const tratado = verificarCriseFinanceira();
    if (!tratado) {
      setTimeout(proximaRodada, 1000);
    }
  }

  function mostrarAlertaFiscalizacao(texto) {
    if (!alertaToast) return;
    if (alertaTimeoutId) {
      clearTimeout(alertaTimeoutId);
      alertaTimeoutId = null;
    }
    if (alertaToastMsg) alertaToastMsg.textContent = texto;
    alertaToast.classList.add('show');
    alertaTimeoutId = setTimeout(() => {
      alertaToast.classList.remove('show');
    }, 2500);
  }

  // Verifica se moedas <= 0 e decide aÃ§Ã£o: 
  function verificarCriseFinanceira() {
    if (moedas <= 0) {
      // 6Âª (Ãºltima) rodada negativa: pular pop-up e ir direto ao resultado
      if (rodada === totalRodadas) {
        fimDeJogo();
        return true;
      }
      if (crisePopup && !criseAberta && telas.jogo && !telas.jogo.classList.contains('hidden')) {
        // Atualiza texto com valor do emprÃ©stimo pela classe
        const chave = classeSelecionada || 'mÃ©dia';
        const valorEmprestimo = emprestimosPorClasse[chave] ?? emprestimosPorClasse['mÃ©dia'];
        if (criseTexto) {
          criseTexto.textContent = `VocÃª ficou sem moedas. EmprÃ©stimo disponÃ­vel para sua classe: ${valorEmprestimo} moedas.`;
        }
        crisePopup.style.display = 'flex';
        criseAberta = true;
        return true;
      }
    }
    return false;
  }

  function fimDeJogo() {
    mostrarTela('resultado');
    finalMoedas.textContent = moedas;
    finalBemestar.textContent = bemEstar;

    if (bemEstar >= 70 && moedas >= 100)
      mensagemFinal.textContent = 'ParabÃ©ns! VocÃª manteve equilÃ­brio entre finanÃ§as e bem-estar.';
    else if (bemEstar < 60 && moedas > 150)
      mensagemFinal.textContent = 'VocÃª ficou rico, mas a sociedade entrou em colapso!';
    else if (bemEstar >= 60 && moedas < 80)
      mensagemFinal.textContent = 'VocÃª se sacrificou pelas pessoas â€” a sociedade agradece!';
    else
      mensagemFinal.textContent = 'Resultado neutro â€” hÃ¡ espaÃ§o para melhorias!';

    // Exibir pop-up 6 segundos apÃ³s carregar a tela de resultado
    if (infoPopup) {
      if (popupTimeoutId) {
        clearTimeout(popupTimeoutId);
      }
      popupTimeoutId = setTimeout(() => {
        // Garante que ainda estamos na tela de resultado antes de mostrar
        if (!telas.resultado.classList.contains('hidden')) {
          infoPopup.style.display = 'flex'; // Usa flex para centralizaÃ§Ã£o conforme CSS
        }
      }, 6000);
    }
  }

  function reiniciarParaMenu() {
    moedas = 100;
    bemEstar = 50;
    rodada = 1;
    jogadorEstaSonegando = false;
    atualizarDisplays();
    // Oculta pop-up e cancela timer ao voltar ao menu
    if (popupTimeoutId) {
      clearTimeout(popupTimeoutId);
      popupTimeoutId = null;
    }
    if (infoPopup) infoPopup.style.display = 'none';
    if (crisePopup) {
      crisePopup.style.display = 'none';
      criseAberta = false;
    }
    liberarDecisao();
    mostrarTela('menu');
  }

  // Eventos dos botÃµes
  btnJogar.addEventListener('click', iniciarJogo);
  btnInstrucoes.addEventListener('click', () => mostrarTela('instrucoes'));
  btnVoltarInstrucoes.addEventListener('click', () => mostrarTela('menu'));
  btnSair.addEventListener('click', () => window.close());
  btnPagar.addEventListener('click', pagar);
  btnSonegar.addEventListener('click', sonegar);
  btnVoltarMenu.addEventListener('click', reiniciarParaMenu);

  // BotÃ£o de fechar do pop-up
  if (voltarBtn) {
    voltarBtn.addEventListener('click', () => {
      infoPopup.style.display = 'none';
    });
  }

  // AÃ§Ãµes do pop-up de crise
  if (btnPedirEmprestimo) {
    btnPedirEmprestimo.addEventListener('click', () => {
      const chave = classeSelecionada || 'mÃ©dia';
      const valorEmprestimo = emprestimosPorClasse[chave] ?? emprestimosPorClasse['mÃ©dia'];
      moedas += valorEmprestimo;
      textoDecisao.textContent = `VocÃª pegou um emprÃ©stimo de ${valorEmprestimo} moedas.`;
      crisePopup.style.display = 'none';
      criseAberta = false;
      atualizarDisplays();
      // ApÃ³s resolver a crise, seguir para a prÃ³xima rodada
      setTimeout(proximaRodada, 600);
    });
  }

  if (btnSonegarCrise) {
    btnSonegarCrise.addEventListener('click', () => {
      jogadorEstaSonegando = true;
      textoDecisao.textContent = 'VocÃª escolheu nÃ£o pagar impostos nas prÃ³ximas rodadas.';
      crisePopup.style.display = 'none';
      criseAberta = false;
      atualizarDisplays();
      // ApÃ³s resolver a crise, seguir para a prÃ³xima rodada
      setTimeout(proximaRodada, 600);
    });
  }

  mostrarTela('menu');
  atualizarDisplays();
});
