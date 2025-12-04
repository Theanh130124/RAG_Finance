class RealTimeChart {
    constructor() {
        this.chart = null;
        this.updateInterval = 1000; // 1 second
        this.timeframe = '1s';
        this.dataPoints = 60; // Show last 60 data points
        this.priceData = [];
        this.volumeData = [];
        this.currentSymbol = '';
        this.basePrice = 0;
        this.updateTimer = null;
        this.isLive = true;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initChart();
    }

    setupEventListeners() {
        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                this.timeframe = e.target.dataset.timeframe;
                this.updateFrequency();
                this.updateChartConfig();
            });
        });

        // Refresh button
        document.getElementById('refreshStock')?.addEventListener('click', () => {
            if (this.currentSymbol) {
                this.resetChart();
                this.startLiveUpdates();
            }
        });
    }

    initChart() {
        const ctx = document.getElementById('realTimeChart').getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Giá',
                        data: [],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Khối lượng',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    label += new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND'
                                    }).format(context.parsed.y);
                                } else {
                                    label += new Intl.NumberFormat('vi-VN').format(context.parsed.y) + ' CP';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second',
                            displayFormats: {
                                second: 'HH:mm:ss'
                            }
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#718096',
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(226, 232, 240, 0.5)'
                        },
                        ticks: {
                            color: '#718096',
                            callback: function(value) {
                                return new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                    minimumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: '#718096',
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M';
                                }
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value;
                            }
                        }
                    }
                },
                animation: {
                    duration: 0 // No animation for real-time updates
                }
            }
        });
    }

    updateFrequency() {
        switch(this.timeframe) {
            case '1s':
                this.updateInterval = 1000;
                document.getElementById('updateFrequency').textContent = '1s';
                break;
            case '5s':
                this.updateInterval = 5000;
                document.getElementById('updateFrequency').textContent = '5s';
                break;
            case '30s':
                this.updateInterval = 30000;
                document.getElementById('updateFrequency').textContent = '30s';
                break;
            case '1m':
                this.updateInterval = 60000;
                document.getElementById('updateFrequency').textContent = '1p';
                break;
            case '5m':
                this.updateInterval = 300000;
                document.getElementById('updateFrequency').textContent = '5p';
                break;
        }
    }

    updateChartConfig() {
        if (this.chart) {
            const timeUnit = this.timeframe.replace(/[0-9]/g, '').replace('m', 'minute');
            this.chart.options.scales.x.time.unit = timeUnit;
            this.chart.update('none');
        }
    }

    startForSymbol(symbol, basePrice) {
        this.currentSymbol = symbol;
        this.basePrice = basePrice;
        this.resetChart();

        // Show real-time chart section
        document.getElementById('realTimeChartSection').style.display = 'block';
        document.getElementById('priceTicker').style.display = 'flex';

        // Update ticker
        document.getElementById('tickerSymbol').textContent = symbol;
        document.getElementById('tickerName').textContent = this.getStockName(symbol);

        // Generate initial data
        this.generateInitialData();

        // Start live updates
        this.startLiveUpdates();

        // Initialize order book
        this.initOrderBook();
    }

    generateInitialData() {
        const now = Date.now();
        this.priceData = [];
        this.volumeData = [];

        let currentPrice = this.basePrice;

        for (let i = this.dataPoints - 1; i >= 0; i--) {
            const timestamp = now - (i * this.updateInterval);

            // Simulate price movement
            const change = (Math.random() - 0.5) * this.basePrice * 0.002;
            currentPrice += change;

            // Ensure price doesn't go negative
            currentPrice = Math.max(currentPrice, this.basePrice * 0.9);

            // Simulate volume
            const volume = Math.floor(Math.random() * 500000) + 100000;

            this.priceData.push({
                x: timestamp,
                y: currentPrice
            });

            this.volumeData.push({
                x: timestamp,
                y: volume
            });
        }

        this.updateChart();
        this.updateTicker(currentPrice);
    }

    addNewDataPoint() {
        if (!this.isLive) return;

        const now = Date.now();
        const lastPrice = this.priceData[this.priceData.length - 1]?.y || this.basePrice;

        // Simulate price movement with slight trending
        let change;
        if (Math.random() > 0.7) {
            // Occasionally bigger moves
            change = (Math.random() - 0.5) * lastPrice * 0.01;
        } else {
            // Normal small moves
            change = (Math.random() - 0.5) * lastPrice * 0.002;
        }

        const newPrice = lastPrice + change;
        const volume = Math.floor(Math.random() * 800000) + 200000;

        // Add new data point
        this.priceData.push({
            x: now,
            y: newPrice
        });

        this.volumeData.push({
            x: now,
            y: volume
        });

        // Keep only last N data points
        if (this.priceData.length > this.dataPoints) {
            this.priceData.shift();
            this.volumeData.shift();
        }

        // Update chart
        this.updateChart();

        // Update ticker
        this.updateTicker(newPrice);

        // Update order book
        this.updateOrderBook(newPrice, volume);
    }

    updateChart() {
        if (this.chart) {
            this.chart.data.datasets[0].data = this.priceData;
            this.chart.data.datasets[1].data = this.volumeData;
            this.chart.update('none');
        }
    }

    updateTicker(currentPrice) {
        const firstPrice = this.priceData[0]?.y || this.basePrice;
        const change = currentPrice - firstPrice;
        const changePercent = (change / firstPrice) * 100;

        const tickerPrice = document.getElementById('tickerPrice');
        const tickerChange = document.getElementById('tickerChange');
        const tickerTime = document.getElementById('tickerTime');

        tickerPrice.textContent = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(currentPrice);

        tickerChange.innerHTML = `
            <span class="${change >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-${change >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                ${change >= 0 ? '+' : ''}${change.toFixed(2)}
                (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)
            </span>
        `;

        tickerTime.textContent = new Date().toLocaleTimeString('vi-VN');
    }

    initOrderBook() {
        const bidOrders = document.getElementById('bidOrders');
        const askOrders = document.getElementById('askOrders');

        bidOrders.innerHTML = '';
        askOrders.innerHTML = '';

        // Generate initial bid orders (5 levels)
        for (let i = 4; i >= 0; i--) {
            const price = this.basePrice * (1 - (i + 1) * 0.001);
            const volume = Math.floor(Math.random() * 50000) + 10000;
            this.addOrderRow(bidOrders, 'bid', price, volume);
        }

        // Generate initial ask orders (5 levels)
        for (let i = 0; i < 5; i++) {
            const price = this.basePrice * (1 + (i + 1) * 0.001);
            const volume = Math.floor(Math.random() * 50000) + 10000;
            this.addOrderRow(askOrders, 'ask', price, volume);
        }
    }

    updateOrderBook(currentPrice, volume) {
        // Simulate order book updates
        if (Math.random() > 0.3) {
            // Update bid orders occasionally
            const bidOrders = document.getElementById('bidOrders');
            if (bidOrders.children.length > 0 && Math.random() > 0.5) {
                const randomIndex = Math.floor(Math.random() * bidOrders.children.length);
                bidOrders.removeChild(bidOrders.children[randomIndex]);

                // Add new bid order
                const newPrice = currentPrice * (1 - Math.random() * 0.005);
                const newVolume = Math.floor(Math.random() * 50000) + 10000;
                this.addOrderRow(bidOrders, 'bid', newPrice, newVolume, true);
            }
        }

        if (Math.random() > 0.3) {
            // Update ask orders occasionally
            const askOrders = document.getElementById('askOrders');
            if (askOrders.children.length > 0 && Math.random() > 0.5) {
                const randomIndex = Math.floor(Math.random() * askOrders.children.length);
                askOrders.removeChild(askOrders.children[randomIndex]);

                // Add new ask order
                const newPrice = currentPrice * (1 + Math.random() * 0.005);
                const newVolume = Math.floor(Math.random() * 50000) + 10000;
                this.addOrderRow(askOrders, 'ask', newPrice, newVolume, true);
            }
        }
    }

    addOrderRow(container, type, price, volume, prepend = false) {
        const row = document.createElement('div');
        row.className = `order-row ${type}`;
        row.innerHTML = `
            <span class="order-price ${type}">${price.toLocaleString('vi-VN')} ₫</span>
            <span class="order-volume">${volume.toLocaleString('vi-VN')} CP</span>
        `;

        if (prepend && container.firstChild) {
            container.insertBefore(row, container.firstChild);
        } else {
            container.appendChild(row);
        }

        // Limit to 5 rows
        if (container.children.length > 5) {
            container.removeChild(container.lastChild);
        }
    }

    startLiveUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(() => {
            this.addNewDataPoint();
        }, this.updateInterval);
    }

    stopLiveUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        this.isLive = false;
    }

    resetChart() {
        this.stopLiveUpdates();
        this.priceData = [];
        this.volumeData = [];
        this.isLive = true;

        if (this.chart) {
            this.chart.data.datasets[0].data = [];
            this.chart.data.datasets[1].data = [];
            this.chart.update('none');
        }
    }

    getStockName(symbol) {
        const stockNames = {
            'VIC': 'Tập đoàn Vingroup',
            'VCB': 'Ngân hàng TMCP Ngoại thương Việt Nam',
            'FPT': 'Tập đoàn FPT',
            'AAPL': 'Apple Inc.',
            'GOOGL': 'Alphabet Inc.',
            'MSFT': 'Microsoft Corporation',
            'TSLA': 'Tesla Inc.',
            'AMZN': 'Amazon.com Inc.',
            'VNINDEX': 'VN-INDEX',
            'VHM': 'Vinhomes',
            'BID': 'Ngân hàng BIDV',
            'CTG': 'Ngân hàng Vietinbank'
        };

        return stockNames[symbol] || symbol;
    }

    destroy() {
        this.stopLiveUpdates();
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Initialize real-time chart
let realTimeChart = null;

// Export for use in stocks.js
window.RealTimeChart = RealTimeChart;