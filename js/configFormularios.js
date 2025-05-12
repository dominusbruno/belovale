//***************************************************************************************
// CONFIGURAÇÃO DE CAMPOS PARA FORMULÁRIOS DINÂMICOS (simples e compostos)
// Cada objeto de configuração representa um campo do formulário ou coluna de uma tabela.
// Ele pode conter as seguintes propriedades:

// 🔹 GERAIS
// - campo: (string) nome da propriedade no objeto de dados do Firebase (obrigatório)
// - label: (string) texto visível para o usuário como título do campo
// - tipo: (string) tipo de campo. Pode ser:
//    • 'text'   → texto livre (padrão se omitido)
//    • 'number' → valor numérico (com suporte a min/max)
//    • 'date'   → data com seletor nativo
//    • 'select' → lista suspensa (deve incluir 'opcoes')
//    • 'textarea' → campo de texto multiline (não implementado)
// - placeholder: (string) dica exibida quando o campo está vazio

// 🔹 SELECT
// - opcoes: (array) lista de strings disponíveis no dropdown (usado apenas com tipo: 'select')
//   Exemplo: opcoes: ['Receita', 'Despesa']

// 🔹 VALIDAÇÕES
// - required: (boolean) torna o campo obrigatório para salvar
// - readOnly: (boolean) impede a edição do campo
// - verificarDuplicidade: (boolean) impede salvar se outro registro tiver o mesmo valor
// - min / max: (string | number) valores mínimos/máximos permitidos (datas ou números)
// - defaultValue: (string | number) valor inicial usado em novos cadastros

// 🔹 VISUAL E FORMATAÇÃO
// - descricao: (string) legenda auxiliar exibida abaixo do campo
// - mascara: (string) máscara IMask (ex: 'cpf', 'telefone', 'cnpj', 'lote', etc...)
// - formatoCondicionalCelula: (function) aplica classes CSS na CELULA com base no valor ou no registro inteiro
//        Você pode usar o 'valor' quando quiser estilizar com base na célula atual, e o 'registro' quando quiser
//        usar qualquer outro campo da linha.
//            formatoCondicionalCelula: (valor, registro) => {
//              if (registro.loteStatus === 'INATIVO') return 'bg-red-100 text-red-800 font-bold';
//              if (registro.loteStatus === 'ATIVO') return 'bg-green-100 text-green-800 font-bold';
//              if (registro.loteStatus === 'PENDENTE') return 'bg-yellow-100 text-yellow-800 font-bold';
//              return '';
//            }


// - formatoCondicionalLinha: (function) aplica classes CSS na LINHA INTEIRA com base no valor da celula
//        Abaixo segue um exemplo de uso
//             formatoCondicionalLinha: (registro) => {
//               let classes = '';
//               if (registro.loteStatus === 'INATIVO') classes += 'bg-red-50 text-red-800';
//               if (registro.loteStatus === 'ATIVO') classes += 'bg-green-50 text-green-800';
//               return classes.trim();
//             }

// 🔹 TABELA (apresentação)
// - eColuna: (boolean) define se o campo aparece na tabela de listagem
// - filtrar: (boolean) define se o campo deve gerar um filtro dinâmico (com múltipla seleção)
// - calculado: (boolean) define se o campo é gerado com base em outros valores (não editável)

// 🔹 ORDENAÇÃO
// - ordenacaoPadrao: (object) define ordenação inicial na listagem
//   Exemplo: { campo: 'criadoEm', direcao: 'desc' }

//***************************************************************************************

  

export const configuracoesFormularios = {
  // Configurações dos formulários SIMPLES
  simples: {
    lotes: {
      ordenacaoPadrao: { campo: 'criadoEm', direcao: 'desc' },
      campos: [
        {
          campo: 'loteStatus', label: 'Status', tipo: 'select', opcoes: ['ATIVO', 'INATIVO'],
          placeholder: 'Ativo ou Inativo?', required: true, defaultValue: 'ATIVO',
          filtrar: true, eColuna: true
        },
        {
          campo: 'loteIdentificador', mascara: 'lote' ,label: 'Identificador', placeholder: 'EX: AL042025',
          required: true, verificarDuplicidade: true, filtrar: false, eColuna: true,
          formatoCondicionalCelula: (valor, registro) => {
            if (registro.loteStatus === 'INATIVO') return 'bg-red-100 text-red-800 font-bold';
            if (registro.loteStatus === 'ATIVO') return 'bg-green-100 text-green-800 font-bold';
            return '';
          },
        },
        {
          campo: 'loteLinhagem', label: 'Linhagem', placeholder: 'Linhagem das aves',
          required: true, filtrar: true, eColuna: true
        },
        {
          campo: 'loteGalpao', label: 'Galpão', tipo: 'select',
          opcoes: ['Pinteiro', 'Recria', '01', '02', '03', '04', '05', 'GRANJA'],
          placeholder: 'Selecione o galpão...', required: true,
          filtrar: true, eColuna: true
        },
        {
          campo: 'loteProprietario', label: 'Proprietário', placeholder: 'Alex, Bruno ou Carlos?',
          required: true, filtrar: true, eColuna: true
        },
        {
          campo: 'loteDataNascimento', label: 'Nascimento', tipo: 'date', defaultValue: 'hoje',
          required: true, filtrar: false, eColuna: true
        },
        {
          campo: '_idadeSemanas', label: 'Idade (sem)', calculado: true, eColuna: true
        },
        {
          campo: 'loteDataChegada', label: 'Chegada', tipo: 'date', defaultValue: 'hoje',
          required: true, filtrar: false, eColuna: true
        },
        {
          campo: 'loteQuantAves', label: 'Qtd Aves', placeholder: 'Ex: 5000', required: true,
          filtrar: false, eColuna: true
        }
      ]
    },

    colaboradores: {
      ordenacaoPadrao: { campo: 'criadoEm', direcao: 'desc' },
      campos: [
        {
          campo: 'colabNome', label: 'Nome', required: true, filtrar: false, eColuna: true
        },
        {
          campo: 'colabLogin', label: 'Login', required: true, verificarDuplicidade: true,
          filtrar: false, eColuna: true
        },
        {
          campo: 'colabSenha', label: 'Senha', required: true,
          filtrar: false, eColuna: true
        },
        {
          campo: 'colabTipo', label: 'Tipo', required: true, tipo: 'select',
          opcoes: ['admin', 'colaborador'], placeholder: 'Escolha um tipo...',
          filtrar: true, eColuna: true
        }
      ]
    }
  },



  // Configurações dos formulários COMPOSTOS
  composto: {
    financeiro: {
      ordenacaoPadrao: { campo: 'criadoEm', direcao: 'desc' },
      seções: [
        {
          tipo: 'cabecalho',
          titulo: 'Informações Gerais',
          campos: [
            { campo: 'finData', label: 'Data', tipo: 'date', required: true, defaultValue: 'hoje' },
            { campo: 'finTipo', label: 'Tipo', tipo: 'select', opcoes: ['RECEITA', 'DESPESA'], required: true },
            { campo: 'finFornecedor', label: 'Fornecedor', placeholder: 'Fornecedor', required: true },
            { campo: 'finNota', label: 'Nº da Nota', placeholder: 'Ex: 1001', defaultValue: 'S/N', required: true },
            { campo: 'finCategoria', label: 'Categoria', placeholder: 'Categoria', required: true },
            { campo: 'finSubCategoria', label: 'Subcategoria', placeholder: 'Subcategoria', required: true },
            { campo: 'finObservacao', label: 'Observações', tipo: 'textarea' ,placeholder: 'Breve observação.' }
          ]
        },
        {
          tipo: 'tabela',
          id: 'finProduto',
          titulo: 'Itens',
          colunas: [
            { campo: 'finProdDescricao', label: 'Descrição', tipo: 'text', required: true, placeholder: 'Produto ou serviço' },
            { campo: 'finProdQuant', label: 'Quant.', tipo: 'number', required: true, placeholder: 'Quantidade' },
            { campo: 'finProdPreco', label: 'Preço', mascara: 'moeda', required: true, placeholder: 'Preço' },
            { campo: '_finProdvalorTotal', label: 'Total', mascara: 'moeda', required: true, placeholder: 'Total' },  // Esse campo
            { campo: 'finProdLote', label: 'Lote', required: true, placeholder: 'Categoria' }
          ]
        },
        {
          tipo: 'tabela',
          id: 'finParcelas',
          titulo: 'Parcelas',
          colunas: [
            { campo: 'finParcNum', label: 'Parcela', tipo: 'number', required: true },
            { campo: 'finParcValor', label: 'Valor', mascara: 'moeda', required: true },
            { campo: 'finParcVencimento', label: 'Vencimento', tipo: 'date', defaultValue: 'hoje', required: true, filtrar: true, eColuna: true },
            { campo: 'finParcStatus', label: 'Status', tipo: 'select', opcoes: ['PAGO', 'PENDENTE'], required: true }
          ]
        }
      ]
    }
  }
};










//***************************************************************************************
//Define campos calculados por Formulário
//***************************************************************************************
export const camposCalculadosPersonalizados = {
  lotes: {
    //Calcula a idade em semanas
    _idadeSemanas: (item) => {
      const nascimento = item.loteDataNascimento;
      if (!nascimento) return '-';
      const nasc = new Date(nascimento);
      const hoje = new Date();
      const dias = Math.floor((hoje - nasc) / (1000 * 60 * 60 * 24));
      return dias < 7 ? '1' : `${Math.ceil(dias / 7)}`;
    }
  },

  financeiro: {
    //Calcula o valor total dos produtos.
    _finProdvalorTotal: (item) => {
      const preco = parseFloat(item.finProdPreco?.toString().replace(',', '.') || '0');
      const quant = parseFloat(item.finProdQuant?.toString().replace(',', '.') || '0');
      const total = preco * quant;
      return isNaN(total) ? '' : total;
    }
  }
};
