document.addEventListener("DOMContentLoaded", () => {
    // API endpoint paths
    const DASHBOARD_ANALYTICS_URL = `${API_BASE_URL}/campaigns/analytics/dashboard`;
    const CAMPAIGNS_URL = `${API_BASE_URL}/campaigns/`;

    // Fetch and render dashboard analytics data
    fetchDashboardAnalytics();

    // Fetch and render recent campaigns list
    fetchRecentCampaigns();

    // Initialize the Chart.js Funnel/Bar Chart reference globally to update/destroy properly
    let funnelChart = null;

    async function fetchDashboardAnalytics() {
        try {
            const response = await fetch(DASHBOARD_ANALYTICS_URL);
            if (!response.ok) {
                throw new Error(`Analytics API error: ${response.status}`);
            }
            const data = await response.json();

            // 1. Populate KPI stats
            document.getElementById("kpi-customers").textContent = data.summary.total_customers_registered ?? 0;
            document.getElementById("kpi-campaigns").textContent = data.summary.total_campaigns ?? 0;
            document.getElementById("kpi-messages").textContent = data.summary.total_messages_triggered ?? 0;

            // 2. Populate Performance benchmark rates
            const deliveryPct = data.performance_rates.delivery_rate_pct ?? 0;
            const openPct = data.performance_rates.open_rate_pct ?? 0;
            const clickPct = data.performance_rates.click_rate_pct ?? 0;

            document.getElementById("rate-delivery-pct").textContent = `${deliveryPct}%`;
            document.getElementById("rate-delivery-bar").style.width = `${deliveryPct}%`;

            document.getElementById("rate-open-pct").textContent = `${openPct}%`;
            document.getElementById("rate-open-bar").style.width = `${openPct}%`;

            document.getElementById("rate-click-pct").textContent = `${clickPct}%`;
            document.getElementById("rate-click-bar").style.width = `${clickPct}%`;

            // 3. Render Funnel Bar Chart
            renderFunnelChart(data.aggregate_funnel);

        } catch (error) {
            console.error("Failed to load dashboard analytics:", error);
            // Display friendly text in place of values
            document.getElementById("kpi-customers").textContent = "Error";
            document.getElementById("kpi-campaigns").textContent = "Error";
            document.getElementById("kpi-messages").textContent = "Error";
        }
    }

    async function fetchRecentCampaigns() {
        try {
            const response = await fetch(CAMPAIGNS_URL);
            if (!response.ok) {
                throw new Error(`Campaigns API error: ${response.status}`);
            }
            const campaigns = await response.json();
            const tableBody = document.getElementById("recent-campaigns-table");

            if (!campaigns || campaigns.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            No campaigns created yet. Start by building a segment and campaign.
                        </td>
                    </tr>`;
                return;
            }

            // Order campaigns by latest created first (if id is auto-incrementing, sort descending)
            const sortedCampaigns = campaigns.sort((a, b) => b.id - a.id).slice(0, 5);

            tableBody.innerHTML = "";
            sortedCampaigns.forEach(campaign => {
                let statusBadge = "";
                if (campaign.status === "sent" || campaign.status === "completed") {
                    statusBadge = `<span class="badge bg-success-subtle text-success border border-success-subtle">Sent</span>`;
                } else if (campaign.status === "draft") {
                    statusBadge = `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Draft</span>`;
                } else {
                    statusBadge = `<span class="badge bg-warning-subtle text-warning border border-warning-subtle">${campaign.status}</span>`;
                }

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="font-weight-semibold">${escapeHtml(campaign.name)}</td>
                    <td class="text-muted text-truncate" style="max-width: 250px;">${escapeHtml(campaign.subject)}</td>
                    <td><span class="badge bg-light text-dark border">${campaign.segment_id ? campaign.segment_id : "None"}</span></td>
                    <td>${statusBadge}</td>
                    <td>
                        <a href="/campaigns" class="btn btn-sm btn-light border">View details</a>
                    </td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error("Failed to load recent campaigns:", error);
            document.getElementById("recent-campaigns-table").innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to fetch campaigns. Please check connection to the backend.
                    </td>
                </tr>`;
        }
    }

    function renderFunnelChart(funnelData) {
        const ctx = document.getElementById("funnelChart").getContext("2d");
        
        // Destructure metrics
        const delivered = funnelData.delivered ?? 0;
        const opened = funnelData.opened ?? 0;
        const clicked = funnelData.clicked ?? 0;
        const failed = funnelData.failed ?? 0;

        if (funnelChart) {
            funnelChart.destroy();
        }

        funnelChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Delivered', 'Opened', 'Clicked', 'Failed'],
                datasets: [{
                    label: 'Message Count',
                    data: [delivered, opened, clicked, failed],
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.85)', // Blue
                        'rgba(16, 185, 129, 0.85)', // Green
                        'rgba(6, 182, 212, 0.85)',  // Cyan/Info
                        'rgba(239, 68, 68, 0.85)'   // Red
                    ],
                    borderColor: [
                        '#2563eb',
                        '#10b981',
                        '#06b6d4',
                        '#ef4444'
                    ],
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.55
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.y} messages`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                weight: 500
                            }
                        }
                    }
                }
            }
        });
    }

    // Utility function to escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return "";
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
});
