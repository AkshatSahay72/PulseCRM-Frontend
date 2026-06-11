# PulseCRM Frontend

A simple, clean, professional internal CRM dashboard frontend for PulseCRM built using **Flask**, **Jinja Templates**, **Bootstrap 5**, and **Vanilla JavaScript** (Fetch API).

## Folder Structure

```
frontend/
│
├── app.py                      # Core Flask server routing & config injection
├── config.py                   # Central API configuration
│
├── templates/                  # Jinja2 HTML Templates
│   ├── base.html               # Shared layout boilerplate & sidebar navigation
│   ├── dashboard.html          # KPI summary, conversion funnel, recent campaigns
│   ├── customers.html          # Searchable customer directory & logs
│   ├── segments.html           # AI prompt segment generator, previews, segment stats
│   └── campaigns.html          # Composer form, AI sandbox copywriting, analytics
│
├── static/
│   ├── css/
│   │   └── style.css           # Global HSL slate/blue theme
│   │
│   └── js/                     # Client-side API fetch integrations
│       ├── dashboard.js
│       ├── customers.js
│       ├── segments.js
│       └── campaigns.js
│
├── requirements.txt            # Python dependencies
└── README.md                   # Setup documentation
```

## Setup & Running Locally

### Prerequisites

- Python 3.8+

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd Frontend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure your API base URL in `config.py` (defaults to the deployed backend):
   ```python
   API_BASE_URL = "https://pulsecrm-backend.onrender.com/api/v1"
   ```

4. Start the local Flask development server:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to:
   [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

---

## Deployed Backend Issues Notice

The deployed backend (Render) may experience connectivity issues or `500 Internal Server Error` responses on database endpoints. This happens because:
1. **Supabase Database Project is Paused**: The host `db.vgpowimrovjtlzprhlwf.supabase.co` DNS record cannot resolve. Log into your Supabase dashboard and click **Restore / Unpause Project** to bring it back online.
2. **Groq Model Decommissioned**: The AI builder uses the old model `"llama3-8b-8192"`. We have updated the code locally in `Backend/app/services/ai.py` to use `"llama-3.1-8b-instant"`. Redeploy your backend on Render to activate this fix.
