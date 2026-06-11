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
});
