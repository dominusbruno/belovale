//ARQUIVO COM TODAS AS FUNÇÕES UTILITÁRIAS DO SISTEMAS


//*******************************************************************************************
// Retorna a data/hora atual no formato brasileiro "DD/MM/AAAA HH:mm:ss"
//*******************************************************************************************
export const dataHoraBR = () => {
  const agora = new Date();
  return agora.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

//*******************************************************************************************
// Mostra um popup de alerta no centro inferior da página
//*******************************************************************************************
export function mostrarAlerta(mensagem, tipo = 'success') {
  const alerta = document.getElementById('alertaCustom');
  const texto = document.getElementById('textoAlerta');

  texto.textContent = mensagem;

  // Reseta classes visuais
  alerta.className = `fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded text-center text-white text-sm shadow-lg z-50 ${
    tipo === 'error' ? 'error' : 'success'
  } hidden`;

  // Remove hidden com delay de renderização
  requestAnimationFrame(() => {
    alerta.classList.remove('hidden'); // torna visível
    requestAnimationFrame(() => {
      alerta.classList.add('mostrar'); // aplica a animação de subida

      // Inicia processo de ocultar
      setTimeout(() => {
        alerta.classList.remove('mostrar');
        alerta.classList.add('ocultar');

        setTimeout(() => {
          alerta.classList.remove('ocultar');
          alerta.classList.add('hidden');
        }, 400); // tempo da animação de saída
      }, 3000); // tempo que fica visível
    });
  });
}


//*******************************************************************************************
// Aplica máscara ao campo de input baseado na configuração
//*******************************************************************************************

//FORMULÁRIO
export function aplicarMascaraInput(input, col) {
  if (!window.IMask || !col.mascara) return;

  const mascara = col.mascara;

  if (mascara === 'moeda') {
    IMask(input, {
      mask: 'R$ num',
      blocks: {
        num: {
          mask: Number,
          scale: 2,
          signed: false,
          thousandsSeparator: '.',
          radix: ',',
          mapToRadix: ['.'],
          normalizeZeros: true,
          padFractionalZeros: true
        }
      }
    });
    input.classList.add('imask-field', 'mascara-moeda');
  }

  else if (mascara === 'data') {
    IMask(input, {
      mask: Date,
      pattern: 'd/`m/`Y',
      blocks: {
        d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
        m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
        Y: { mask: IMask.MaskedRange, from: 1900, to: 2099 }
      },
      format: date => date.toLocaleDateString('pt-BR'),
      parse: str => {
        const [dia, mes, ano] = str.split('/');
        return new Date(`${ano}-${mes}-${dia}`);
      }
    });
  }
    
  else if (mascara === 'lote') {
    IMask(input, {
      mask: 'AA000000',
      definitions: {
        'A': /[A-Z]/,      // Apenas letras maiúsculas
        '0': /[0-9]/       // Apenas dígitos
      },
      prepare: (str) => str.toUpperCase(),
      overwrite: true
    });
  }
  
  else if (mascara === 'cpf') {
    IMask(input, {
      mask: '000.000.000-00'
    });
  }

  else if (mascara === 'cnpj') {
    IMask(input, {
      mask: '00.000.000/0000-00'
    });
  }

  else if (mascara === 'cep') {
    IMask(input, {
      mask: '00000-000'
    });
  }

  else if (mascara === 'telefone') {
    IMask(input, {
      mask: [
        { mask: '(00) 00000-0000' }
      ]
    });
  }

  else {
    // fallback genérico se for uma máscara literal customizada
    IMask(input, { mask: mascara });
  }
}


//TABELAS
export function formatarValorParaVisualizacao(valor, mascara) {
  if (!valor || !mascara) return valor;

  switch (mascara) {
    case 'moeda':
      return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    case 'data':
      if (typeof valor === 'string' && valor.includes('-')) {
        const [ano, mes, dia] = valor.split('-');
        return `${dia}/${mes}/${ano}`;
      }
      return valor;
    case 'cpf':
      return valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    case 'cnpj':
      return valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    case 'cep':
      return valor.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    case 'telefone':
      return valor.length === 10
        ? valor.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
        : valor.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    default:
      return valor;
  }
}
