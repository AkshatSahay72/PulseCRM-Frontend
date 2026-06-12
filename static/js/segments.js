document.addEventListener("DOMContentLoaded", () => {
    const SEGMENTS_API_URL = `${API_BASE_URL}/segments/`;
    const AI_BUILD_API_URL = `${API_BASE_URL}/segments/ai-build`;

    // Fetch and display segments list on page load
    fetchSegmentsList();

    // Suggestion chips event listeners
    document.querySelectorAll(".prompt-suggestion-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const input = document.getElementById("ai-prompt-input");
            input.value = chip.textContent;
            input.focus();
        });
    });

    // Form submit: Build Segment using AI
    const aiForm = document.getElementById("ai-segment-form");
    aiForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const promptInput = document.getElementById("ai-prompt-input");
        const buildBtn = document.getElementById("build-segment-btn");
        const originalText = buildBtn.innerHTML;

        const promptValue = promptInput.value.trim();
        if (!promptValue) return;

        // Set loading state
        buildBtn.disabled = true;
        buildBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating...`;

        try {
            const response = await fetch(`${AI_BUILD_API_URL}?prompt=${encodeURIComponent(promptValue)}`, {
                method: "POST"
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to generate segment from prompt.");
            }

            const segment = await response.json();
            showAlert("success", `AI successfully generated and saved segment: "${segment.name}"`);
            promptInput.value = "";
            fetchSegmentsList();

        } catch (error) {
            console.error("Error generating segment:", error);
            showAlert("danger", `Generation Failed: ${error.message}`);
        } finally {
            buildBtn.disabled = false;
            buildBtn.innerHTML = originalText;
        }
    });

    async function fetchSegmentsList() {
        try {
            const response = await fetch(SEGMENTS_API_URL);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            const segments = await response.json();
            renderSegments(segments);
        } catch (error) {
            console.error("Failed to load segments:", error);
            document.getElementById("segments-table-body").innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-5">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to fetch segments. Please check connection to backend.
                    </td>
                </tr>`;
        }
    }

    function renderSegments(segments) {
        const tbody = document.getElementById("segments-table-body");
        if (!segments || segments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-5">
                        No segments created yet. Describe an audience in the AI prompt builder above to get started.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = "";
        segments.forEach(segment => {
            const tr = document.createElement("tr");

            // Format rules cleanly instead of raw JSON
            let rulesHtml = "";
            if (segment.rules && Object.keys(segment.rules).length > 0) {
                const rules = segment.rules;
                const badges = [];
                if (rules.min_spending !== undefined && rules.min_spending !== null) {
                    badges.push(`<span class="badge bg-primary-subtle text-primary border border-primary-subtle me-1">Spending &ge; $${rules.min_spending}</span>`);
                }
                if (rules.min_orders !== undefined && rules.min_orders !== null) {
                    badges.push(`<span class="badge bg-info-subtle text-info border border-info-subtle me-1">Orders &ge; ${rules.min_orders}</span>`);
                }
                if (rules.status !== undefined && rules.status !== null) {
                    badges.push(`<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle me-1">Status: ${rules.status}</span>`);
                }
                rulesHtml = badges.join(" ") || `<pre class="m-0 text-muted small" style="font-size: 0.75rem;">${JSON.stringify(rules)}</pre>`;
            } else {
                rulesHtml = `<span class="text-muted small">No specific criteria (All Customers)</span>`;
            }

            tr.innerHTML = `
                <td><span class="text-muted small">#${segment.id}</span></td>
                <td><strong>${escapeHtml(segment.name)}</strong></td>
                <td><span class="text-muted small">${escapeHtml(segment.description || "No description provided")}</span></td>
                <td>${rulesHtml}</td>
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-light border btn-evaluate" data-id="${segment.id}" data-name="${escapeHtml(segment.name)}" data-desc="${escapeHtml(segment.description)}">
                        <i class="bi bi-people me-1"></i>Preview
                    </button>
                    <button class="btn btn-sm btn-light border text-primary font-weight-semibold btn-analytics ms-1" data-id="${segment.id}" data-name="${escapeHtml(segment.name)}">
                        <i class="bi bi-graph-up me-1"></i>Analytics
                    </button>
                    <button class="btn btn-sm btn-light border text-danger btn-delete ms-1" data-id="${segment.id}" data-name="${escapeHtml(segment.name)}">
                        <i class="bi bi-trash me-1"></i>Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Event listener: Preview Audience
        document.querySelectorAll(".btn-evaluate").forEach(button => {
            button.addEventListener("click", async (e) => {
                const btn = e.currentTarget;
                const segmentId = btn.getAttribute("data-id");
                const segmentName = btn.getAttribute("data-name");
                const segmentDesc = btn.getAttribute("data-desc");

                // Clear prior evaluation list & show spinner
                const previewBody = document.getElementById("audience-preview-tbody");
                previewBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-muted py-5">
                            <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            Evaluating segment rules...
                        </td>
                    </tr>`;
                
                document.getElementById("previewAudienceModalLabel").textContent = `Audience Preview: ${segmentName}`;
                document.getElementById("preview-segment-desc").textContent = segmentDesc || "Evaluating customer rules...";
                document.getElementById("preview-count-label").textContent = "Evaluating match count...";

                // Show modal structure
                const modal = new bootstrap.Modal(document.getElementById("previewAudienceModal"));
                modal.show();

                try {
                    const response = await fetch(`${SEGMENTS_API_URL}${segmentId}/evaluate`);
                    if (!response.ok) {
                        throw new Error(`Failed to evaluate segment: ${response.status}`);
                    }
                    const customers = await response.json();
                    
                    if (!customers || customers.length === 0) {
                        previewBody.innerHTML = `
                            <tr>
                                <td colspan="3" class="text-center text-muted py-4">
                                    <i class="bi bi-info-circle me-1"></i>No customers currently match this segment rules.
                                </td>
                            </tr>`;
                        document.getElementById("preview-count-label").textContent = "0 contacts matched";
                        return;
                    }

                    previewBody.innerHTML = "";
                    customers.forEach(cust => {
                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td><span class="text-muted small">#${cust.id}</span></td>
                            <td><strong>${escapeHtml(cust.first_name)} ${escapeHtml(cust.last_name)}</strong></td>
                            <td><a href="mailto:${escapeHtml(cust.email)}" class="text-decoration-none">${escapeHtml(cust.email)}</a></td>
                        `;
                        previewBody.appendChild(tr);
                    });

                    document.getElementById("preview-count-label").textContent = `${customers.length} contact(s) matched`;

                } catch (error) {
                    console.error(error);
                    previewBody.innerHTML = `
                        <tr>
                            <td colspan="3" class="text-center text-danger py-4">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to preview matched audience.
                            </td>
                        </tr>`;
                    document.getElementById("preview-count-label").textContent = "Evaluation Error";
                }
            });
        });

        // Event listener: View Analytics
        document.querySelectorAll(".btn-analytics").forEach(button => {
            button.addEventListener("click", async (e) => {
                const btn = e.currentTarget;
                const segmentId = btn.getAttribute("data-id");
                const segmentName = btn.getAttribute("data-name");

                const analyticsBody = document.getElementById("segment-analytics-body");
                analyticsBody.innerHTML = `
                    <div class="text-center py-5">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Fetching performance analytics...
                    </div>`;

                document.getElementById("segmentAnalyticsModalLabel").textContent = `Analytics: ${segmentName}`;

                const modal = new bootstrap.Modal(document.getElementById("segmentAnalyticsModal"));
                modal.show();

                try {
                    const response = await fetch(`${SEGMENTS_API_URL}${segmentId}/analytics`);
                    if (!response.ok) {
                        throw new Error(`Failed to load analytics: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    const metrics = data.metrics || {};
                    const rates = data.performance_rates || {};

                    const campaignsCount = metrics.total_campaigns ?? 0;
                    const sentCount = metrics.total_sent ?? 0;
                    const deliveredVal = metrics.delivered_count ?? 0;
                    const openedVal = metrics.opened_count ?? 0;
                    const clickedVal = metrics.clicked_count ?? 0;
                    const failedVal = metrics.failed_count ?? 0;

                    const deliveryPct = rates.delivery_rate_pct ?? 0;
                    const openPct = rates.open_rate_pct ?? 0;
                    const clickPct = rates.click_rate_pct ?? 0;

                    analyticsBody.innerHTML = `
                        <!-- Stats Grid -->
                        <div class="row g-3 mb-4">
                            <div class="col-6">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="text-muted small font-weight-semibold uppercase">Campaigns</div>
                                    <div class="fs-4 font-weight-bold text-main">${campaignsCount}</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="text-muted small font-weight-semibold uppercase">Total Sent</div>
                                    <div class="fs-4 font-weight-bold text-main">${sentCount}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Funnel Breakdown Numbers -->
                        <h6 class="font-weight-bold text-main mb-3 small uppercase">Funnel Metrics</h6>
                        <ul class="list-group list-group-flush mb-4 small">
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                <span>Delivered Messages</span>
                                <span class="badge bg-success-subtle text-success border border-success-subtle">${deliveredVal}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                <span>Opened Messages</span>
                                <span class="badge bg-primary-subtle text-primary border border-primary-subtle">${openedVal}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                <span>Clicked Messages</span>
                                <span class="badge bg-info-subtle text-info border border-info-subtle">${clickedVal}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                <span>Failed Messages</span>
                                <span class="badge bg-danger-subtle text-danger border border-danger-subtle">${failedVal}</span>
                            </li>
                        </ul>

                        <!-- Progress rates -->
                        <h6 class="font-weight-bold text-main mb-3 small uppercase">Performance Benchmarks</h6>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="small font-weight-semibold">Delivery Rate</span>
                                <span class="small font-weight-semibold">${deliveryPct}%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-success" role="progressbar" style="width: ${deliveryPct}%"></div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="small font-weight-semibold">Open Rate</span>
                                <span class="small font-weight-semibold">${openPct}%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-primary" role="progressbar" style="width: ${openPct}%"></div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="small font-weight-semibold">Click Rate (CTR)</span>
                                <span class="small font-weight-semibold">${clickPct}%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-info" role="progressbar" style="width: ${clickPct}%"></div>
                            </div>
                        </div>
                    `;

                } catch (error) {
                    console.error(error);
                    analyticsBody.innerHTML = `
                        <div class="alert alert-danger m-0 border-0 shadow-sm text-center">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to fetch analytics metrics.
                        </div>`;
                }
            });
        });

        // Event listener: Delete Segment
        document.querySelectorAll(".btn-delete").forEach(button => {
            button.addEventListener("click", (e) => {
                const targetBtn = e.target.closest(".btn-delete") || e.currentTarget;
                const segmentId = targetBtn.getAttribute("data-id");
                const segmentName = targetBtn.getAttribute("data-name");

                window.confirmAction({
                    title: "Delete Segment",
                    heading: "Delete Segment?",
                    message: `Are you sure you want to delete the segment "${segmentName}"?`,
                    btnText: "Delete",
                    onConfirm: async () => {
                        try {
                            const response = await fetch(`${SEGMENTS_API_URL}${segmentId}`, {
                                method: "DELETE"
                            });
                            if (!response.ok) {
                                const errData = await response.json().catch(() => ({}));
                                throw new Error(errData.detail || "Failed to delete segment.");
                            }
                            showAlert("success", `Segment "${segmentName}" deleted successfully.`);
                            fetchSegmentsList();
                        } catch (error) {
                            console.error("Error deleting segment:", error);
                            showAlert("danger", `Delete Failed: ${error.message}`);
                        }
                    }
                });
            });
        });
    }

    // Helper: Show bootstrap dismissible alerts
    function showAlert(type, message) {
        const container = document.getElementById("alerts-container");
        const alertDiv = document.createElement("div");
        alertDiv.className = `alert alert-${type} alert-dismissible fade show shadow-sm border-0 mb-4`;
        alertDiv.role = "alert";
        alertDiv.innerHTML = `
            <div><i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>${escapeHtml(message)}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        container.appendChild(alertDiv);

        // Auto-dismiss alert after 5 seconds
        setTimeout(() => {
            alertDiv.classList.remove("show");
            setTimeout(() => alertDiv.remove(), 150);
        }, 5000);
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
