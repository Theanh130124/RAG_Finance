$(document).ready(function() {
    // Tải dữ liệu khi trang được tải
    loadMarketIndices();
    loadTopStocks();

    // Tìm kiếm khi nhấn nút
    $('#searchBtn').click(searchStock);

    // Tìm kiếm khi nhấn Enter
    $('#stockSearch').keypress(function(e) {
        if (e.which == 13) {
            searchStock();
        }
    });

    // Tự động tải lại dữ liệu mỗi 5 phút
    setInterval(loadMarketIndices, 300000); // 5 phút
});

function loadMarketIndices() {
    $.ajax({
        url: '/api/stocks/market-indices',
        method: 'GET',
        beforeSend: function() {
            $('#marketIndices').html(`
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                </div>
            `);
        },
        success: function(response) {
            if (response.success) {
                renderMarketIndices(response.indices);
            } else {
                showError('marketIndices', response.message);
            }
        },
        error: function() {
            showError('marketIndices', 'Không thể kết nối đến server');
        }
    });
}

function renderMarketIndices(indices) {
    if (indices.length === 0) {
        $('#marketIndices').html('<p class="text-muted">Không có dữ liệu chỉ số thị trường</p>');
        return;
    }

    let html = '';
    indices.forEach(index => {
        const changeClass = index.is_positive ? 'text-success' : 'text-danger';
        const changeIcon = index.is_positive ? 'fa-arrow-up' : 'fa-arrow-down';
        const borderClass = index.is_positive ? 'index-positive' : 'index-negative';

        html += `
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="market-index-card ${borderClass}">
                    <div class="index-name">${index.name}</div>
                    <div class="index-value">${formatNumber(index.current)}</div>
                    <div class="index-change ${changeClass}">
                        <i class="fas ${changeIcon}"></i>
                        ${index.change >= 0 ? '+' : ''}${formatNumber(index.change)}
                        (${index.change_percent >= 0 ? '+' : ''}${index.change_percent.toFixed(2)}%)
                    </div>
                </div>
            </div>
        `;
    });

    $('#marketIndices').html(html);
}

function searchStock() {
    const symbol = $('#stockSearch').val().trim().toUpperCase();

    if (!symbol) {
        alert('Vui lòng nhập mã cổ phiếu');
        return;
    }

    $.ajax({
        url: '/api/stocks/search',
        method: 'GET',
        data: { q: symbol },
        beforeSend: function() {
            $('#searchResultSection').show();
            $('#stockInfo').html(`
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Đang tải thông tin...</span>
                    </div>
                </div>
            `);
        },
        success: function(response) {
            if (response.success) {
                renderStockInfo(response.stock, response.chart_data);
            } else {
                $('#stockInfo').html(`
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${response.message}
                    </div>
                `);
            }
        },
        error: function() {
            $('#stockInfo').html(`
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Không thể kết nối đến server
                </div>
            `);
        }
    });
}

function renderStockInfo(stock, chartData) {
    const changeClass = stock.change >= 0 ? 'price-positive' : 'price-negative';
    const changeIcon = stock.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

    let detailsHtml = '';
    const details = [
        { label: 'Khối lượng giao dịch', value: formatNumber(stock.volume) },
        { label: 'Vốn hóa thị trường', value: formatCurrency(stock.market_cap, stock.currency) },
        { label: 'P/E Ratio', value: stock.pe_ratio ? stock.pe_ratio.toFixed(2) : 'N/A' },
        { label: 'Tỷ suất cổ tức', value: stock.dividend_yield ? (stock.dividend_yield * 100).toFixed(2) + '%' : 'N/A' },
        { label: 'Ngành', value: stock.sector },
        { label: 'Lĩnh vực', value: stock.industry },
        { label: 'Quốc gia', value: stock.country },
        { label: 'Đóng cửa trước', value: formatCurrency(stock.previous_close, stock.currency) }
    ];

    details.forEach(detail => {
        detailsHtml += `
            <div class="detail-item">
                <div class="detail-label">${detail.label}</div>
                <div class="detail-value">${detail.value}</div>
            </div>
        `;
    });

    const html = `
        <div class="stock-info-card">
            <div class="stock-header">
                <div class="d-flex align-items-center">
                    <span class="stock-symbol">${stock.symbol}</span>
                    <span class="stock-name">${stock.name}</span>
                </div>
                <div class="stock-price ${changeClass}">
                    ${formatCurrency(stock.current_price, stock.currency)}
                    <span class="change-indicator" style="font-size: 1.2rem;">
                        <i class="fas ${changeIcon}"></i>
                        ${stock.change >= 0 ? '+' : ''}${formatCurrency(stock.change, stock.currency)}
                        (${stock.change_percent >= 0 ? '+' : ''}${stock.change_percent.toFixed(2)}%)
                    </span>
                </div>
            </div>

            <div class="stock-details">
                ${detailsHtml}
            </div>

            ${chartData.length > 0 ? `
                <div class="mt-4">
                    <h5><i class="fas fa-chart-line me-2"></i>Biểu đồ giá 30 ngày qua</h5>
                    <div id="priceChart" style="height: 300px; width: 100%;">
                        <!-- Có thể tích hợp biểu đồ bằng Chart.js tại đây -->
                        <canvas id="stockChart"></canvas>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    $('#stockInfo').html(html);

    // Vẽ biểu đồ nếu có dữ liệu
    if (chartData.length > 0) {
        drawStockChart(chartData);
    }
}

function loadTopStocks() {
    // Tải top gainers
    $.ajax({
        url: '/api/stocks/top-gainers',
        method: 'GET',
        success: function(response) {
            if (response.success) {
                renderTopStocks('#topGainers tbody', response.gainers, true);
            }
        }
    });

    // Tải top losers
    $.ajax({
        url: '/api/stocks/top-losers',
        method: 'GET',
        success: function(response) {
            if (response.success) {
                renderTopStocks('#topLosers tbody', response.losers, false);
            }
        }
    });
}

function renderTopStocks(selector, stocks, isGainers) {
    let html = '';
    stocks.forEach(stock => {
        const changeClass = isGainers ? 'text-success' : 'text-danger';
        const changeIcon = isGainers ? 'fa-arrow-up' : 'fa-arrow-down';

        html += `
            <tr>
                <td><strong>${stock.symbol}</strong></td>
                <td>${stock.name}</td>
                <td>${formatNumber(stock.price)}</td>
                <td class="${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    ${stock.change >= 0 ? '+' : ''}${formatNumber(stock.change)}
                    (${stock.change_percent >= 0 ? '+' : ''}${stock.change_percent.toFixed(2)}%)
                </td>
            </tr>
        `;
    });

    $(selector).html(html);
}

function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(num, currency) {
    if (!num) return 'N/A';

    const formattedNum = formatNumber(num);
    switch(currency) {
        case 'VND':
            return formattedNum + ' ₫';
        case 'USD':
            return '$' + formattedNum;
        default:
            return formattedNum + ' ' + currency;
    }
}

function showError(containerId, message) {
    $(`#${containerId}`).html(`
        <div class="error-message">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `);
}

// Hàm vẽ biểu đồ (đơn giản)
function drawStockChart(chartData) {
    const ctx = document.getElementById('stockChart').getContext('2d');

    // Kiểm tra xem Chart đã được định nghĩa chưa
    if (typeof Chart === 'undefined') {
        // Load Chart.js nếu chưa có
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = function() {
            createChart(ctx, chartData);
        };
        document.head.appendChild(script);
    } else {
        createChart(ctx, chartData);
    }
}

function createChart(ctx, chartData) {
    const dates = chartData.map(d => d.date);
    const prices = chartData.map(d => d.close);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Giá đóng cửa',
                data: prices,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: '#f0f4f8'
                    }
                }
            }
        }
    });
}
// Biến toàn cục cho realtime chart
let realTimeChart = null;

// Thêm sự kiện click cho các cổ phiếu trong bảng
function setupStockClickEvents() {
    // Khi click vào mã cổ phiếu trong bảng
    $('#topGainers tbody, #topLosers tbody').on('click', 'tr', function() {
        const symbol = $(this).find('td:first-child').text().trim();
        if (symbol) {
            $('#stockSearch').val(symbol);
            searchStock();
        }
    });

    // Khi click vào mã cổ phiếu trong kết quả tìm kiếm
    $(document).on('click', '.stock-symbol', function() {
        const symbol = $(this).text().trim();
        if (symbol && realTimeChart) {
            // Lấy giá hiện tại từ thông tin cổ phiếu
            const currentPrice = parseFloat($('#stockInfo .stock-price').text().replace(/[^\d.-]/g, ''));
            if (!isNaN(currentPrice) && realTimeChart) {
                realTimeChart.startForSymbol(symbol, currentPrice);
                // Cuộn đến phần biểu đồ realtime
                $('html, body').animate({
                    scrollTop: $('#realTimeChartSection').offset().top - 100
                }, 500);
            }
        }
    });
}

// Cập nhật hàm renderStockInfo để thêm nút xem biểu đồ realtime
function renderStockInfo(stock, chartData) {
    const changeClass = stock.change >= 0 ? 'price-positive' : 'price-negative';
    const changeIcon = stock.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

    let detailsHtml = '';
    const details = [
        { label: 'Khối lượng giao dịch', value: formatNumber(stock.volume) },
        { label: 'Vốn hóa thị trường', value: formatCurrency(stock.market_cap, stock.currency) },
        { label: 'P/E Ratio', value: stock.pe_ratio ? stock.pe_ratio.toFixed(2) : 'N/A' },
        { label: 'Tỷ suất cổ tức', value: stock.dividend_yield ? (stock.dividend_yield * 100).toFixed(2) + '%' : 'N/A' },
        { label: 'Ngành', value: stock.sector },
        { label: 'Lĩnh vực', value: stock.industry },
        { label: 'Quốc gia', value: stock.country },
        { label: 'Đóng cửa trước', value: formatCurrency(stock.previous_close, stock.currency) }
    ];

    details.forEach(detail => {
        detailsHtml += `
            <div class="detail-item">
                <div class="detail-label">${detail.label}</div>
                <div class="detail-value">${detail.value}</div>
            </div>
        `;
    });

    const html = `
        <div class="stock-info-card">
            <div class="stock-header">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <span class="stock-symbol" style="cursor: pointer;" title="Xem biểu đồ realtime">${stock.symbol}</span>
                        <span class="stock-name">${stock.name}</span>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" id="viewRealtimeChartBtn">
                        <i class="fas fa-chart-line me-1"></i>
                        Xem realtime
                    </button>
                </div>
                <div class="stock-price ${changeClass}">
                    ${formatCurrency(stock.current_price, stock.currency)}
                    <span class="change-indicator" style="font-size: 1.2rem;">
                        <i class="fas ${changeIcon}"></i>
                        ${stock.change >= 0 ? '+' : ''}${formatCurrency(stock.change, stock.currency)}
                        (${stock.change_percent >= 0 ? '+' : ''}${stock.change_percent.toFixed(2)}%)
                    </span>
                </div>
            </div>

            <div class="stock-details">
                ${detailsHtml}
            </div>

            ${chartData.length > 0 ? `
                <div class="mt-4">
                    <h5><i class="fas fa-chart-line me-2"></i>Biểu đồ giá 30 ngày qua</h5>
                    <div id="priceChart" style="height: 300px; width: 100%;">
                        <canvas id="stockChart"></canvas>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    $('#stockInfo').html(html);

    // Thêm sự kiện cho nút xem realtime
    $('#viewRealtimeChartBtn').click(function() {
        if (window.RealTimeChart && stock.current_price) {
            // Khởi tạo realtime chart nếu chưa có
            if (!realTimeChart) {
                realTimeChart = new RealTimeChart();
            }

            // Bắt đầu biểu đồ với mã cổ phiếu và giá hiện tại
            realTimeChart.startForSymbol(stock.symbol, stock.current_price);

            // Cuộn đến phần biểu đồ realtime
            $('html, body').animate({
                scrollTop: $('#realTimeChartSection').offset().top - 100
            }, 500);
        }
    });

    // Vẽ biểu đồ nếu có dữ liệu
    if (chartData.length > 0) {
        drawStockChart(chartData);
    }
}

// Thêm hàm khởi tạo vào $(document).ready
$(document).ready(function() {
    // Tải dữ liệu khi trang được tải
    loadMarketIndices();
    loadTopStocks();

    // Tìm kiếm khi nhấn nút
    $('#searchBtn').click(searchStock);

    // Tìm kiếm khi nhấn Enter
    $('#stockSearch').keypress(function(e) {
        if (e.which == 13) {
            searchStock();
        }
    });

    // Tự động tải lại dữ liệu mỗi 5 phút
    setInterval(loadMarketIndices, 300000); // 5 phút

    // Thiết lập sự kiện click cho cổ phiếu
    setupStockClickEvents();

    // Khởi tạo realtime chart
    if (window.RealTimeChart) {
        realTimeChart = new RealTimeChart();
    }

    // Cập nhật thời gian
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Hàm cập nhật thời gian và trạng thái thị trường
function updateDateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN');
    const dateString = now.toLocaleDateString('vi-VN');

    $('#updateTime').text(timeString);

    // Xác định trạng thái thị trường dựa trên giờ
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...

    let marketStatus = 'Đóng cửa';
    if (day >= 1 && day <= 5) { // Thứ 2 đến thứ 6
        if ((hour >= 9 && hour < 11) || (hour >= 13 && hour < 15)) {
            marketStatus = 'Mở';
            $('#marketStatus').html('<span class="text-success">Mở</span>');
        } else if (hour >= 7 && hour < 9) {
            marketStatus = 'Chuẩn bị mở cửa';
            $('#marketStatus').html('<span class="text-warning">Chuẩn bị</span>');
        } else if ((hour >= 11 && hour < 13) || (hour >= 15 && hour < 17)) {
            marketStatus = 'Nghỉ giữa phiên';
            $('#marketStatus').html('<span class="text-info">Nghỉ giữa phiên</span>');
        } else {
            $('#marketStatus').html('<span class="text-danger">Đóng cửa</span>');
        }
    } else {
        $('#marketStatus').html('<span class="text-danger">Đóng cửa</span>');
    }
}
