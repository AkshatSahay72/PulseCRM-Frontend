document.addEventListener("DOMContentLoaded", () => {
    const PROFILE_API_URL = `${API_BASE_URL}/customers/${CUSTOMER_ID}/profile`;
    const ORDERS_API_URL = `${API_BASE_URL}/orders/`;

    // Fetch and populate page data
    fetchProfileData();

    // Event listener: Delete Customer from profile page
    const deleteProfileBtn = document.getElementById("btn-profile-delete-customer");
    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener("click", async () => {
            const customerName = document.getElementById("profile-name").textContent || "this customer";
            if (confirm(`Are you sure you want to delete the customer "${customerName}"? This will delete all their purchase records and campaign timeline logs, and redirect you back to the directory.`)) {
                try {
                    const deleteUrl = `${API_BASE_URL}/customers/${CUSTOMER_ID}`;
                    const response = await fetch(deleteUrl, {
                        method: "DELETE"
                    });
                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.detail || "Failed to delete customer profile.");
                    }
                    
                    // Save deletion message to session storage for cross-page toast alert
                    sessionStorage.setItem("customer_deleted_alert", `Customer "${customerName}" was deleted successfully.`);
                    window.location.href = "/customers";
                } catch (error) {
                    console.error("Error deleting customer profile:", error);
                    showAlert("danger", `Delete Failed: ${error.message}`);
                }
            }
        });
    }

    // Event listener: Add Order from profile page
    const addOrderBtn = document.getElementById("btn-profile-add-order");
    const orderModalEl = document.getElementById("profileOrderModal");
    let orderModalInstance = null;

    if (addOrderBtn && orderModalEl) {
        orderModalInstance = new bootstrap.Modal(orderModalEl);
        addOrderBtn.addEventListener("click", () => {
            orderModalInstance.show();
        });
    }

    const addOrderForm = document.getElementById("profile-order-form");
    if (addOrderForm) {
        addOrderForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById("profile-save-order-btn");
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Recording...`;

            const amount = parseFloat(document.getElementById("profile-order-amount").value);
            const status = document.getElementById("profile-order-status").value;

            const payload = {
                customer_id: CUSTOMER_ID,
                amount: amount,
                status: status
            };

            try {
                const response = await fetch(ORDERS_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to log transaction.");
                }

                showAlert("success", `Transaction of $${amount.toFixed(2)} recorded successfully!`);
                
                if (orderModalInstance) {
                    orderModalInstance.hide();
                }
                
                addOrderForm.reset();
                
                // Reload dashboard metrics and grids
                fetchProfileData();

            } catch (error) {
                console.error("Error logging purchase:", error);
                showAlert("danger", `Error: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    async function fetchProfileData() {
        try {
            const response = await fetch(PROFILE_API_URL);
            if (!response.ok) {
                throw new Error(`Profile API returned status ${response.status}`);
            }
            const data = await response.json();
            renderProfile(data);
        } catch (error) {
            console.error("Failed to load customer profile details:", error);
            document.getElementById("profile-name").textContent = "Connection Error";
            showAlert("danger", `Failed to load profile details: ${error.message}`);
        }
    }

    function renderProfile(data) {
        const cust = data.customer || {};
        const fullName = `${escapeHtml(cust.first_name)} ${escapeHtml(cust.last_name)}`;
        const initials = `${cust.first_name ? cust.first_name[0] : ""}${cust.last_name ? cust.last_name[0] : ""}`.toUpperCase();

        // 1. Populate biography sidebar details
        document.getElementById("profile-name").textContent = fullName;
        document.getElementById("profile-card-name").textContent = fullName;
        document.getElementById("profile-card-id").textContent = `ID: #${cust.id}`;
        document.getElementById("profile-initials").textContent = initials || "?";
        document.getElementById("profile-email").textContent = escapeHtml(cust.email);
        document.getElementById("profile-email").href = `mailto:${escapeHtml(cust.email)}`;
        document.getElementById("profile-phone").textContent = escapeHtml(cust.phone || "No phone added");

        // Format created_at date
        let registeredDate = "-";
        if (cust.created_at) {
            try {
                const d = new Date(cust.created_at);
                registeredDate = d.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                registeredDate = cust.created_at;
            }
        }
        document.getElementById("profile-registered").textContent = registeredDate;

        // 2. Populate KPI cards
        const ltvVal = data.ltv ?? 0;
        document.getElementById("kpi-ltv").textContent = `$${ltvVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        // Completed orders count
        const completedCount = data.orders ? data.orders.filter(o => o.status === 'completed').length : 0;
        const pendingCount = data.orders ? data.orders.filter(o => o.status === 'pending').length : 0;
        
        document.getElementById("kpi-orders-count").textContent = completedCount;
        document.getElementById("kpi-orders-pending").textContent = `${pendingCount} orders currently pending`;

        // Lifecycle Stage logic visual badge classes
        const lifecycleVal = data.lifecycle_stage || "Lead";
        const lifecycleEl = document.getElementById("kpi-lifecycle");
        const lifecycleDescEl = document.getElementById("kpi-lifecycle-desc");
        const lifecycleIconEl = document.getElementById("kpi-lifecycle-icon");
        
        lifecycleEl.textContent = lifecycleVal;
        
        if (lifecycleVal === "Lead") {
            lifecycleEl.className = "card-value text-warning";
            lifecycleDescEl.textContent = "Lead (0 orders completed)";
            lifecycleIconEl.className = "fs-1 text-warning opacity-25";
            lifecycleIconEl.innerHTML = `<i class="bi bi-person-fill-exclamation"></i>`;
        } else if (lifecycleVal === "Active Customer") {
            lifecycleEl.className = "card-value text-success";
            lifecycleDescEl.textContent = "Active Client (1-2 completed purchases)";
            lifecycleIconEl.className = "fs-1 text-success opacity-25";
            lifecycleIconEl.innerHTML = `<i class="bi bi-person-fill-check"></i>`;
        } else {
            // Loyal Customer
            lifecycleEl.className = "card-value text-primary";
            lifecycleDescEl.textContent = "Loyal Client (3+ completed purchases)";
            lifecycleIconEl.className = "fs-1 text-primary opacity-25";
            lifecycleIconEl.innerHTML = `<i class="bi bi-person-fill-star"></i>`;
        }

        // 3. Render Purchase History grid
        const purchaseTbody = document.getElementById("purchases-table-body");
        if (!data.orders || data.orders.length === 0) {
            purchaseTbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-bag-x me-2"></i>No purchase history logged.
                    </td>
                </tr>`;
        } else {
            purchaseTbody.innerHTML = "";
            data.orders.forEach(order => {
                let badgeClass = "bg-secondary-subtle text-secondary border-secondary-subtle";
                if (order.status === "completed") {
                    badgeClass = "bg-success-subtle text-success border-success-subtle";
                } else if (order.status === "failed") {
                    badgeClass = "bg-danger-subtle text-danger border-danger-subtle";
                } else if (order.status === "pending") {
                    badgeClass = "bg-warning-subtle text-warning border-warning-subtle";
                }

                let orderDate = "-";
                if (order.created_at) {
                    try {
                        const d = new Date(order.created_at);
                        orderDate = d.toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } catch (e) {
                        orderDate = order.created_at;
                    }
                }

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>#${order.id}</strong></td>
                    <td class="font-weight-semibold">$${order.amount.toFixed(2)}</td>
                    <td><span class="badge ${badgeClass} border">${order.status}</span></td>
                    <td class="text-muted small">${orderDate}</td>
                `;
                purchaseTbody.appendChild(tr);
            });
        }

        // 4. Render Campaign Outbound History timeline
        const timelineWrapper = document.getElementById("campaign-timeline-wrapper");
        if (!data.campaign_history || data.campaign_history.length === 0) {
            timelineWrapper.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-chat-left-dots fs-2 opacity-50 mb-3 d-block"></i>
                    No marketing campaigns or dispatches logged for this customer.
                </div>`;
        } else {
            timelineWrapper.innerHTML = '<div class="campaign-timeline-container"></div>';
            const container = timelineWrapper.querySelector(".campaign-timeline-container");
            
            data.campaign_history.forEach(history => {
                const div = document.createElement("div");
                
                // Set campaign state classes
                let stateClass = "";
                if (history.status === "failed") {
                    stateClass = "failed";
                } else if (history.status === "clicked" || history.status === "opened" || history.status === "delivered") {
                    stateClass = "completed";
                }

                div.className = `campaign-timeline-item ${stateClass}`;
                
                // Format sent time
                let sentDateStr = "-";
                if (history.sent_at) {
                    try {
                        const d = new Date(history.sent_at);
                        sentDateStr = d.toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } catch (e) {
                        sentDateStr = history.sent_at;
                    }
                }

                // Determine step statuses (Pending ➔ Delivered ➔ Opened ➔ Clicked)
                const logStatus = history.status;
                
                let step1 = "active"; // Queued / Pending is always active once campaign is sent
                let step2 = "";        // Delivered
                let step3 = "";        // Opened
                let step4 = "";        // Clicked

                if (logStatus === "failed") {
                    step1 = "failed";
                    step2 = "";
                } else if (logStatus === "delivered") {
                    step1 = "success";
                    step2 = "active";
                } else if (logStatus === "opened") {
                    step1 = "success";
                    step2 = "success";
                    step3 = "active";
                } else if (logStatus === "clicked") {
                    step1 = "success";
                    step2 = "success";
                    step3 = "success";
                    step4 = "success";
                }

                // Compile steps HTML
                const stepsHtml = `
                    <div class="timeline-steps">
                        <div class="timeline-step ${step1}">
                            <div class="step-icon">
                                ${step1 === 'success' ? '<i class="bi bi-check"></i>' : step1 === 'failed' ? '<i class="bi bi-x"></i>' : '1'}
                            </div>
                            <div class="step-label">Queued</div>
                        </div>
                        <div class="timeline-step ${step2}">
                            <div class="step-icon">
                                ${step2 === 'success' ? '<i class="bi bi-check"></i>' : '2'}
                            </div>
                            <div class="step-label">Delivered</div>
                        </div>
                        <div class="timeline-step ${step3}">
                            <div class="step-icon">
                                ${step3 === 'success' ? '<i class="bi bi-check"></i>' : '3'}
                            </div>
                            <div class="step-label">Opened</div>
                        </div>
                        <div class="timeline-step ${step4}">
                            <div class="step-icon">
                                ${step4 === 'success' ? '<i class="bi bi-check"></i>' : '4'}
                            </div>
                            <div class="step-label">Clicked</div>
                        </div>
                    </div>
                `;

                // Compile webhook event logs
                let logsHtml = "";
                if (history.events && history.events.length > 0) {
                    const listItems = history.events.map(ev => {
                        let evTime = "-";
                        if (ev.timestamp) {
                            try {
                                const d = new Date(ev.timestamp);
                                evTime = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            } catch (e) { evTime = ev.timestamp; }
                        }
                        
                        let badgeClass = "bg-primary";
                        if (ev.event_type === "delivered") badgeClass = "bg-success";
                        if (ev.event_type === "opened") badgeClass = "bg-primary";
                        if (ev.event_type === "clicked") badgeClass = "bg-info";
                        if (ev.event_type === "failed") badgeClass = "bg-danger";

                        return `<span class="badge ${badgeClass} text-capitalize me-2 mb-1">${ev.event_type} at ${evTime}</span>`;
                    }).join("");
                    
                    logsHtml = `<div class="mt-3 bg-light p-2 rounded small border d-flex flex-wrap align-items-center">
                        <span class="text-muted small me-2 font-weight-semibold uppercase" style="font-size: 0.65rem;">Webhook callbacks:</span>
                        ${listItems}
                    </div>`;
                }

                // Error message display if failed
                const errorAlert = history.error_message ? `
                    <div class="alert alert-danger-subtle text-danger border border-danger-subtle p-2 rounded small mt-3 mb-0">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>Error: ${escapeHtml(history.error_message)}
                    </div>
                ` : "";

                div.innerHTML = `
                    <div class="card border border-light-subtle shadow-xs p-3">
                        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                            <div>
                                <h6 class="font-weight-bold text-main m-0">${escapeHtml(history.campaign_name)}</h6>
                                <p class="text-muted small m-0 text-truncate" style="max-width: 320px;">Subject: ${escapeHtml(history.campaign_subject)}</p>
                            </div>
                            <span class="text-muted small text-end">${sentDateStr}</span>
                        </div>
                        
                        <!-- Timeline steps tracker -->
                        ${stepsHtml}

                        <!-- Events callbacks log -->
                        ${logsHtml}

                        <!-- Error alert -->
                        ${errorAlert}
                    </div>
                `;
                container.appendChild(div);
            });
        }
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
