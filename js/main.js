class CurrencyConverter {
    constructor() {
        this.baseURLs = [
            'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1',
            'https://latest.currency-api.pages.dev/v1'
        ];
        this.currentBaseURL = this.baseURLs[0];
        this.currencies = {};
        this.popularCurrencies = ['usd', 'eur', 'brl', 'gbp', 'jpy', 'btc', 'eth'];
        
        this.initializeApp();
    }

    // Inicializar a aplicação
    initializeApp() {
        this.setCurrentDate();
        this.setupEventListeners();
        this.loadCurrencies();
    }

    // Configurar data atual
    setCurrentDate() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR');
        document.getElementById('current-date').textContent = formattedDate;
        
        const dateInput = document.getElementById('date');
        const today = now.toISOString().split('T')[0];
        dateInput.max = today;
    }

    // Carregar lista de moedas
    async loadCurrencies() {
        try {
            console.log('Iniciando carregamento de moedas...');
            
            // Primeiro: carregar a lista de moedas disponíveis
            const currenciesData = await this.fetchWithFallback('currencies.json');
            console.log('Lista de moedas carregada:', currenciesData);
            
            this.currencies = currenciesData;
            
            // Preencher os selects
            this.populateCurrencySelects();
            
            // Carregar moedas populares
            await this.loadPopularCurrencies();
            
            console.log('Todas as moedas carregadas com sucesso!');
            
        } catch (error) {
            console.error('Erro crítico ao carregar moedas:', error);
            this.showError('Erro ao carregar a lista de moedas. Verifique sua conexão e tente recarregar a página.');
        }
    }

    // Preencher selects de moedas
    populateCurrencySelects() {
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        
        // Limpar options
        fromSelect.innerHTML = '<option value="">Selecione a moeda...</option>';
        toSelect.innerHTML = '<option value="">Selecione a moeda...</option>';
        
        // Ordenar e adicionar moedas
        const sortedCurrencies = Object.keys(this.currencies).sort();
        
        sortedCurrencies.forEach(currencyCode => {
            const currencyName = this.currencies[currencyCode];
            const optionText = `${currencyCode.toUpperCase()} - ${currencyName}`;
            
            const fromOption = new Option(optionText, currencyCode);
            const toOption = new Option(optionText, currencyCode);
            
            fromSelect.add(fromOption);
            toSelect.add(toOption);
        });
        
        // Valores padrão
        fromSelect.value = 'usd';
        toSelect.value = 'brl';
    }

    // Carregar moedas populares
    async loadPopularCurrencies() {
        const container = document.getElementById('popular-currencies');
        const baseCurrency = 'usd';
        
        try {
            console.log('Carregando moedas populares...');
            
            const responseData = await this.fetchWithFallback(`currencies/${baseCurrency}.json`);
            console.log('Dados das moedas populares:', responseData);
            
            const rates = responseData[baseCurrency];
            
            if (!rates) {
                throw new Error('Estrutura de dados inesperada da API');
            }
            
            let htmlContent = '';
            
            this.popularCurrencies.forEach(currency => {
                if (currency !== baseCurrency && rates[currency]) {
                    const rate = rates[currency];
                    const currencyName = this.currencies[currency] || currency.toUpperCase();
                    
                    htmlContent += `
                        <div class="col-md-4 col-lg-3">
                            <div class="currency-card" data-currency="${currency}">
                                <div class="currency-code">${currency.toUpperCase()}</div>
                                <div class="currency-name small mb-2">${currencyName}</div>
                                <div class="currency-value">1 ${baseCurrency.toUpperCase()} = ${rate.toFixed(4)} ${currency.toUpperCase()}</div>
                            </div>
                        </div>
                    `;
                }
            });
            
            container.innerHTML = htmlContent || '<div class="col-12 text-center text-muted">Nenhuma moeda popular disponível</div>';
            
            // Adicionar event listeners para os cards de moedas populares
            this.setupPopularCurrencyListeners();
            
        } catch (error) {
            console.error('Erro ao carregar moedas populares:', error);
            container.innerHTML = '<div class="col-12 text-center text-muted">Erro ao carregar moedas populares</div>';
        }
    }

    // Configurar listeners para moedas populares
    setupPopularCurrencyListeners() {
        const currencyCards = document.querySelectorAll('.currency-card');
        
        currencyCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault(); // Prevenir comportamento padrão
                e.stopPropagation(); // Parar propagação do evento
                
                const currencyCode = card.getAttribute('data-currency');
                this.selectPopularCurrency(currencyCode);
            });
        });
    }

    // Selecionar moeda popular
    selectPopularCurrency(currencyCode) {
        console.log('Moeda popular selecionada:', currencyCode);
        
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        
        // Alternar entre moedas: se uma já estiver selecionada, usar como "De"
        if (fromSelect.value && fromSelect.value !== currencyCode) {
            toSelect.value = currencyCode;
        } else {
            fromSelect.value = 'usd'; // USD como padrão para "De"
            toSelect.value = currencyCode;
        }
        
        // Focar no campo de valor
        document.getElementById('amount').focus();
        
        // Opcional: fazer conversão automática
        // this.performConversion();
    }

    // Nova função para executar conversão diretamente
    async performConversion() {
        const fromCurrency = document.getElementById('from-currency').value;
        const toCurrency = document.getElementById('to-currency').value;
        const amount = parseFloat(document.getElementById('amount').value);
        
        if (!fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
            return; // Validação básica
        }
        
        try {
            this.showLoadingState('Convertendo...');
            
            const responseData = await this.fetchWithFallback(`currencies/${fromCurrency}.json`);
            const rates = responseData[fromCurrency];
            
            if (!rates || !rates[toCurrency]) {
                throw new Error('Taxa de câmbio não disponível');
            }
            
            const rate = rates[toCurrency];
            const convertedAmount = amount * rate;
            
            this.displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate, 'latest');
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Erro na conversão automática:', error);
            this.hideLoadingState();
        }
    }

    // Converter moedas
    async convertCurrency(event) {
        event.preventDefault();
        
        const fromCurrency = document.getElementById('from-currency').value;
        const toCurrency = document.getElementById('to-currency').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value || 'latest';
        
        // Validações
        if (!fromCurrency || !toCurrency) {
            this.showError('Por favor, selecione as moedas para conversão.');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            this.showError('Por favor, insira um valor válido maior que zero.');
            return;
        }
        
        if (fromCurrency === toCurrency) {
            this.showError('Por favor, selecione moedas diferentes para conversão.');
            return;
        }
        
        try {
            this.showLoadingState('Convertendo...');
            
            console.log(`Convertendo: ${amount} ${fromCurrency} para ${toCurrency}`);
            
            // Buscar taxas de câmbio
            const responseData = await this.fetchWithFallback(`currencies/${fromCurrency}.json`);
            console.log('Dados de conversão:', responseData);
            
            const rates = responseData[fromCurrency];
            
            if (!rates) {
                throw new Error(`Não foi possível encontrar taxas para ${fromCurrency}`);
            }
            
            if (!rates[toCurrency]) {
                throw new Error(`Taxa de câmbio não disponível para ${toCurrency}`);
            }
            
            const rate = rates[toCurrency];
            const convertedAmount = amount * rate;
            
            this.displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate, date);
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Erro na conversão:', error);
            this.showError(`Erro: ${error.message || 'Não foi possível completar a conversão'}`);
            this.hideLoadingState();
        }
    }

    // Exibir resultado
    displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate, date) {
        const resultDiv = document.getElementById('result');
        const conversionResult = document.getElementById('conversion-result');
        const conversionDetails = document.getElementById('conversion-details');
        const lastUpdate = document.getElementById('last-update');
        
        const formattedAmount = this.formatCurrency(amount, fromCurrency);
        const formattedConverted = this.formatCurrency(convertedAmount, toCurrency);
        
        conversionResult.innerHTML = `
            ${formattedAmount} = <span class="text-primary">${formattedConverted}</span>
        `;
        
        conversionDetails.innerHTML = `
            Taxa de câmbio: 1 ${fromCurrency.toUpperCase()} = ${rate.toFixed(6)} ${toCurrency.toUpperCase()}
        `;
        
        const displayDate = date === 'latest' ? 'mais recente' : new Date(date).toLocaleDateString('pt-BR');
        lastUpdate.textContent = `Dados de: ${displayDate}`;
        
        resultDiv.classList.remove('d-none');
        document.getElementById('error').classList.add('d-none');
    }

    // Formatar valor monetário
    formatCurrency(amount, currency) {
        try {
            // Tenta usar Intl.NumberFormat para moedas conhecidas
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency.toUpperCase(),
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
            }).format(amount);
        } catch (error) {
            // Fallback para moedas não suportadas
            return `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency.toUpperCase()}`;
        }
    }

    // Fetch com fallback e retry
    async fetchWithFallback(endpoint) {
        let lastError = null;
        
        for (const baseURL of this.baseURLs) {
            try {
                const url = `${baseURL}/${endpoint}`;
                console.log(`Tentando: ${url}`);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`Sucesso com: ${baseURL}`, data);
                
                this.currentBaseURL = baseURL;
                return data;
                
            } catch (error) {
                console.warn(`Falha com ${baseURL}:`, error);
                lastError = error;
                continue;
            }
        }
        
        throw new Error(`Todas as URLs falharam. Último erro: ${lastError?.message}`);
    }

    // Mostrar loading
    showLoadingState(message = 'Carregando...') {
        const spinner = document.getElementById('loading-spinner');
        const convertBtn = document.getElementById('convert-btn');
        
        if (spinner) spinner.classList.remove('d-none');
        if (convertBtn) {
            convertBtn.disabled = true;
            convertBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ${message}`;
        }
    }

    // Esconder loading
    hideLoadingState() {
        const spinner = document.getElementById('loading-spinner');
        const convertBtn = document.getElementById('convert-btn');
        
        if (spinner) spinner.classList.add('d-none');
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.textContent = 'Converter';
        }
    }

    // Mostrar erro
    showError(message) {
        const errorDiv = document.getElementById('error');
        const errorMessage = document.getElementById('error-message');
        const resultDiv = document.getElementById('result');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.classList.remove('d-none');
            if (resultDiv) resultDiv.classList.add('d-none');
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        const form = document.getElementById('conversion-form');
        if (form) {
            form.addEventListener('submit', (e) => this.convertCurrency(e));
        }
        
        // Trocar moedas com duplo clique
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        
        if (fromSelect) {
            fromSelect.addEventListener('dblclick', () => this.swapCurrencies());
        }
        if (toSelect) {
            toSelect.addEventListener('dblclick', () => this.swapCurrencies());
        }
    }

    // Trocar moedas
    swapCurrencies() {
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        
        if (fromSelect && toSelect) {
            const temp = fromSelect.value;
            fromSelect.value = toSelect.value;
            toSelect.value = temp;
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando Conversor de Moedas...');
    new CurrencyConverter();
});

// Atualização de Ano automático
document.getElementById("year").textContent = new Date().getFullYear();