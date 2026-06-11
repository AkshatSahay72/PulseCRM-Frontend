import os
from flask import Flask, render_template, redirect, url_for
import config

app = Flask(__name__)
app.config.from_object(config)

# Inject API_BASE_URL into all templates dynamically
@app.context_processor
def inject_global_vars():
    return {
        "API_BASE_URL": app.config.get("API_BASE_URL", "https://pulsecrm-backend.onrender.com/api/v1")
    }

@app.route('/')
def index():
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/customers')
def customers():
    return render_template('customers.html')

@app.route('/segments')
def segments():
    return render_template('segments.html')

@app.route('/campaigns')
def campaigns():
    return render_template('campaigns.html')

@app.route('/customers/<int:customer_id>')
def customer_profile(customer_id):
    return render_template('customer_profile.html', customer_id=customer_id)


if __name__ == '__main__':
    # Bind to PORT if set by environment (Vercel/Render friendly)
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
