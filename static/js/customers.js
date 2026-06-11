document.addEventListener("DOMContentLoaded", () => {
    const CUSTOMERS_API_URL = `${API_BASE_URL}/customers/`;
    const ORDERS_API_URL = `${API_BASE_URL}/orders/`;

    let allCustomers = [];

    // Fetch customers list on page load
    fetchCustomersList();

    // Check for sessionStorage alert from customer profile page deletion
    const deleteAlert = sessionStorage.getItem("customer_deleted_alert");
    if (deleteAlert) {
        // Wait briefly for UI list loading before alert rendering
        setTimeout(() => showAlert("success", deleteAlert), 100);
        sessionStorage.removeItem("customer_deleted_alert");
    }

    // Event listener for search input
    const searchInput = document.getElementById("customer-search");
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderCustomers(allCustomers);
            return;
        }

        const filtered = allCustomers.filter(customer => {
            const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
            const email = (customer.email || "").toLowerCase();
            const phone = (customer.phone || "").toLowerCase();

            return fullName.includes(query) || email.includes(query) || phone.includes(query);
        });

        renderCustomers(filtered);
    });

    // Form submit: Add Customer
    const addCustomerForm = document.getElementById("add-customer-form");
    addCustomerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("save-customer-btn");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...`;

        const payload = {
            first_name: document.getElementById("first_name").value.trim(),
            last_name: document.getElementById("last_name").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim()
        };

        try {
            const response = await fetch(CUSTOMERS_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to create customer.");
            }

            showAlert("success", "Customer registered successfully!");
            
            // Hide modal
            const modalElement = document.getElementById("addCustomerModal");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            
            addCustomerForm.reset();
            fetchCustomersList();

        } catch (error) {
            console.error("Error creating customer:", error);
            showAlert("danger", `Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Form submit: Add Order
    const addOrderForm = document.getElementById("add-order-form");
    addOrderForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("save-order-btn");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Recording...`;

        const customerId = parseInt(document.getElementById("order-customer-id").value, 10);
        const amount = parseFloat(document.getElementById("order-amount").value);
        const status = document.getElementById("order-status").value;

        const payload = {
            customer_id: customerId,
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

            showAlert("success", `Transaction recorded successfully for customer ID ${customerId}!`);
            
            // Hide modal
            const modalElement = document.getElementById("addOrderModal");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            
            addOrderForm.reset();

        } catch (error) {
            console.error("Error logging transaction:", error);
            showAlert("danger", `Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    async function fetchCustomersList() {
        try {
            const response = await fetch(CUSTOMERS_API_URL);
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            allCustomers = await response.json();
            renderCustomers(allCustomers);
        } catch (error) {
            console.error("Failed to fetch customers:", error);
            document.getElementById("customers-table-body").innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger py-5">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to fetch customers. Please check backend connection.
                    </td>
                </tr>`;
        }
    }

    function renderCustomers(customers) {
        const tbody = document.getElementById("customers-table-body");
        if (!customers || customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-5">
                        No customers found. Click "Add Customer" to create your first client.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = "";
        customers.forEach(customer => {
            const tr = document.createElement("tr");
            
            // Format created_at timestamp
            let formattedDate = "-";
            if (customer.created_at) {
                try {
                    const d = new Date(customer.created_at);
                    formattedDate = d.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } catch (e) {
                    formattedDate = customer.created_at;
                }
            }

            tr.innerHTML = `
                <td><span class="text-muted small">#${customer.id}</span></td>
                <td><a href="/customers/${customer.id}" class="text-decoration-none text-primary font-weight-bold">${escapeHtml(customer.first_name)} ${escapeHtml(customer.last_name)}</a></td>
                <td><a href="mailto:${escapeHtml(customer.email)}" class="text-decoration-none">${escapeHtml(customer.email)}</a></td>
                <td><span class="text-muted">${escapeHtml(customer.phone)}</span></td>
                <td>${formattedDate}</td>
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-light border text-primary font-weight-semibold btn-add-order" 
                            data-id="${customer.id}" 
                            data-name="${escapeHtml(customer.first_name)} ${escapeHtml(customer.last_name)}">
                        <i class="bi bi-plus-circle me-1"></i>Add Order
                    </button>
                    <button class="btn btn-sm btn-light border text-danger btn-delete-customer ms-1" 
                            data-id="${customer.id}" 
                            data-name="${escapeHtml(customer.first_name)} ${escapeHtml(customer.last_name)}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach event listeners to all dynamically created "Add Order" buttons
        document.querySelectorAll(".btn-add-order").forEach(button => {
            button.addEventListener("click", (e) => {
                const btn = e.currentTarget;
                const customerId = btn.getAttribute("data-id");
                const customerName = btn.getAttribute("data-name");

                // Populate modal data fields
                document.getElementById("order-customer-id").value = customerId;
                document.getElementById("order-customer-name").value = customerName;

                // Show modal
                const orderModal = new bootstrap.Modal(document.getElementById("addOrderModal"));
                orderModal.show();
            });
        });

        // Attach event listeners to all dynamically created "Delete Customer" buttons
        document.querySelectorAll(".btn-delete-customer").forEach(button => {
            button.addEventListener("click", async (e) => {
                const btn = e.currentTarget;
                const customerId = btn.getAttribute("data-id");
                const customerName = btn.getAttribute("data-name");

                if (confirm(`Are you sure you want to delete the customer "${customerName}"? This will delete all their purchase records and campaign timeline logs.`)) {
                    try {
                        const response = await fetch(`${CUSTOMERS_API_URL}${customerId}`, {
                            method: "DELETE"
                        });
                        if (!response.ok) {
                            const errData = await response.json().catch(() => ({}));
                            throw new Error(errData.detail || "Failed to delete customer.");
                        }
                        showAlert("success", `Customer "${customerName}" deleted successfully.`);
                        fetchCustomersList();
                    } catch (error) {
                        console.error("Error deleting customer:", error);
                        showAlert("danger", `Delete Failed: ${error.message}`);
                    }
                }
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

    // --- Dynamic Bulk Customer Import ---
    const BULK_API_URL = `${API_BASE_URL}/customers/bulk`;
    const importFileInput = document.getElementById("import-file-input");
    const importSubmitBtn = document.getElementById("import-submit-btn");
    const importPreviewPanel = document.getElementById("import-preview-panel");
    const importPreviewTbody = document.getElementById("import-preview-tbody");
    const importTotalBadge = document.getElementById("import-total-badge");
    const importForm = document.getElementById("import-customers-form");
    
    let parsedRecords = [];

    if (importFileInput) {
        importFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) {
                resetImportModal();
                return;
            }

            const reader = new FileReader();
            reader.onload = function(evt) {
                const text = evt.target.result;
                try {
                    if (file.name.endsWith(".json")) {
                        parsedRecords = JSON.parse(text);
                        if (!Array.isArray(parsedRecords)) {
                            throw new Error("JSON file must be an array of customer objects.");
                        }
                    } else {
                        parsedRecords = parseCSV(text);
                    }

                    if (parsedRecords.length === 0) {
                        throw new Error("No customer rows detected in the file.");
                    }

                    // Render Preview (up to first 5 rows)
                    importPreviewTbody.innerHTML = "";
                    const previewRows = parsedRecords.slice(0, 5);
                    
                    previewRows.forEach(row => {
                        const mapped = mapRecordFuzzy(row);
                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td><span class="${mapped.first_name ? 'text-dark font-weight-medium' : 'text-danger small'}">${escapeHtml(mapped.first_name || 'Missing name (Skipped)')}</span></td>
                            <td><span class="text-muted">${escapeHtml(mapped.last_name || '')}</span></td>
                            <td><span class="${mapped.email ? 'text-dark' : 'text-danger small'}">${escapeHtml(mapped.email || 'Missing email (Skipped)')}</span></td>
                            <td><span class="text-muted">${escapeHtml(mapped.phone || '-')}</span></td>
                        `;
                        importPreviewTbody.appendChild(tr);
                    });

                    importTotalBadge.textContent = `${parsedRecords.length} records parsed`;
                    importPreviewPanel.classList.remove("d-none");
                    importSubmitBtn.disabled = false;

                } catch (err) {
                    console.error("Parse error:", err);
                    showAlert("danger", `File Reading Error: ${err.message}`);
                    resetImportModal();
                }
            };
            reader.readAsText(file);
        });
    }

    if (importForm) {
        importForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (parsedRecords.length === 0) return;

            const originalText = importSubmitBtn.innerHTML;
            importSubmitBtn.disabled = true;
            importSubmitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...`;

            try {
                const response = await fetch(BULK_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(parsedRecords)
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || "Bulk upload failed.");
                }

                const result = await response.json();
                
                showAlert("success", `Import Complete! Created: ${result.imported} client(s). Skipped: ${result.skipped_duplicates} duplicate(s), ${result.skipped_invalid} invalid rows.`);
                
                // Hide modal
                const modalElement = document.getElementById("importCustomersModal");
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                resetImportModal();
                importForm.reset();
                fetchCustomersList();

            } catch (error) {
                console.error("Error bulk uploading:", error);
                showAlert("danger", `Upload Failed: ${error.message}`);
                importSubmitBtn.disabled = false;
                importSubmitBtn.innerHTML = originalText;
            }
        });
    }

    function resetImportModal() {
        parsedRecords = [];
        importSubmitBtn.disabled = true;
        importSubmitBtn.innerHTML = "Upload & Import";
        importPreviewPanel.classList.add("d-none");
        importPreviewTbody.innerHTML = "";
        if (importFileInput) importFileInput.value = "";
    }

    // RFC 4180 compliant CSV parser
    function parseCSV(text) {
        const lines = [];
        let row = [""];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            const next = text[i + 1];

            if (c === '"') {
                if (inQuotes && next === '"') {
                    row[row.length - 1] += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                row.push('');
            } else if ((c === '\r' || c === '\n') && !inQuotes) {
                if (c === '\r' && next === '\n') {
                    i++;
                }
                lines.push(row);
                row = [''];
            } else {
                row[row.length - 1] += c;
            }
        }
        if (row.length > 1 || row[0] !== '') {
            lines.push(row);
        }

        if (lines.length === 0) return [];

        const headers = lines[0].map(h => h.trim());
        const records = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i];
            // Skip empty rows
            if (values.length === 1 && values[0] === "") continue;
            
            const record = {};
            for (let j = 0; j < headers.length; j++) {
                record[headers[j]] = values[j] ? values[j].trim() : '';
            }
            records.push(record);
        }

        return records;
    }

    // Fuzzy matching preview mapper
    function mapRecordFuzzy(record) {
        let first_name = "";
        let last_name = "";
        let email = "";
        let phone = "";

        for (const [k, v] of Object.entries(record)) {
            if (!v) continue;
            const v_str = String(v).trim();
            if (!v_str) continue;

            const k_lower = k.toLowerCase();

            if (k_lower.includes("email") || k_lower.includes("mail") || k_lower.includes("addr")) {
                if (!email) email = v_str;
            } else if (k_lower.includes("phone") || k_lower.includes("tel") || k_lower.includes("cell") || k_lower.includes("mob") || k_lower.includes("contact")) {
                if (!phone) phone = v_str;
            } else if (k_lower.includes("first") || k_lower.includes("fname") || k_lower.includes("given")) {
                if (!first_name) first_name = v_str;
            } else if (k_lower.includes("last") || k_lower.includes("lname") || k_lower.includes("sur") || k_lower.includes("family")) {
                if (!last_name) last_name = v_str;
            }
        }

        // Fallback name splitting
        if (!first_name) {
            for (const [k, v] of Object.entries(record)) {
                if (!v) continue;
                const v_str = String(v).trim();
                if (!v_str) continue;

                const k_lower = k.toLowerCase();
                if (k_lower === "name" || k_lower.includes("fullname") || k_lower.includes("full name")) {
                    const parts = v_str.split(/\s+/);
                    first_name = parts[0];
                    if (parts.length > 1) {
                        last_name = parts.slice(1).join(" ");
                    }
                    break;
                }
            }
        }

        if (!last_name && first_name) {
            last_name = "Customer";
        }

        return { first_name, last_name, email, phone };
    }
});
