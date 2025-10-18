import json, os, math, uuid, time

# Helper: build a simple timeseries panel
def ts_panel(panel_id, title, expr, x, y, w, h, legend=True):
    return {
        "id": panel_id,
        "type": "timeseries",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {
            "legend": {"displayMode": "list", "placement": "bottom"} if legend else {"displayMode": "hidden"},
            "tooltip": {"mode": "multi", "sort": "none"},
        },
        "fieldConfig": {"defaults": {"unit": "short"}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Helper: stat panel
def stat_panel(panel_id, title, expr, x, y, w, h, unit="short", color_mode="value"):
    return {
        "id": panel_id,
        "type": "stat",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {
            "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
            "orientation": "auto",
            "textMode": "auto",
            "colorMode": color_mode,
            "graphMode": "none",
            "justifyMode": "auto",
        },
        "fieldConfig": {"defaults": {"unit": unit}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Helper: gauge panel
def gauge_panel(panel_id, title, expr, x, y, w, h, unit="percentunit"):
    return {
        "id": panel_id,
        "type": "gauge",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False}},
        "fieldConfig": {
            "defaults": {
                "unit": unit,
                "min": 0,
                "max": 1,
                "thresholds": {"mode": "percentage", "steps": [{"color": "red", "value": None}, {"color": "yellow", "value": 0.7}, {"color": "green", "value": 0.9}]},
            },
            "overrides": [],
        },
        "pluginVersion": "10.0.0",
    }

# Helper: heatmap panel for histogram
def heatmap_panel(panel_id, title, expr, x, y, w, h):
    return {
        "id": panel_id,
        "type": "heatmap",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {"legend": {"show": True}},
        "fieldConfig": {"defaults": {"unit": "short"}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Helper: bar gauge panel
def bargauge_panel(panel_id, title, expr, x, y, w, h, unit="short"):
    return {
        "id": panel_id,
        "type": "bargauge",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "fieldConfig": {"defaults": {"unit": unit}, "overrides": []},
        "options": {"displayMode": "gradient", "orientation": "horizontal"},
        "pluginVersion": "10.0.0",
    }

# Helper: table panel
def table_panel(panel_id, title, expr, x, y, w, h, unit="short"):
    return {
        "id": panel_id,
        "type": "table",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A", "format": "table"}],
        "options": {"showHeader": True},
        "fieldConfig": {"defaults": {"unit": unit}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Dashboard skeleton
dashboard = {
    "uid": "agro-overview",
    "title": "AGRO Overview",
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "editable": True,
    "style": "dark",
    "graphTooltip": 0,
    "time": {"from": "now-6h", "to": "now"},
    "__inputs": [
        {
            "name": "DS_PROMETHEUS",
            "label": "Prometheus",
            "type": "datasource",
            "pluginId": "prometheus",
            "pluginName": "Prometheus",
        }
    ],
    "__requires": [
        {"type": "grafana", "id": "grafana", "name": "Grafana", "version": "10.0.0"},
        {"type": "datasource", "id": "prometheus", "name": "Prometheus", "version": "2.5.0"},
        {"type": "panel", "id": "timeseries", "name": "Time series", "version": ""},
        {"type": "panel", "id": "stat", "name": "Stat", "version": ""},
        {"type": "panel", "id": "gauge", "name": "Gauge", "version": ""},
        {"type": "panel", "id": "bargauge", "name": "Bar gauge", "version": ""},
        {"type": "panel", "id": "heatmap", "name": "Heatmap", "version": ""},
        {"type": "panel", "id": "table", "name": "Table", "version": ""},
    ],
    "templating": {
        "list": [
            {
                "name": "provider",
                "type": "query",
                "label": "Provider",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": "label_values(agro_requests_total, provider)",
                "refresh": 2,
                "sort": 1,
                "definition": "label_values(agro_requests_total, provider)",
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
            {
                "name": "model",
                "type": "query",
                "label": "Model",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": 'label_values(agro_requests_total{provider=~"$provider"}, model)',
                "refresh": 2,
                "definition": 'label_values(agro_requests_total{provider=~"$provider"}, model)',
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
            {
                "name": "route",
                "type": "query",
                "label": "Route",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": "label_values(agro_requests_total, route)",
                "refresh": 2,
                "definition": "label_values(agro_requests_total, route)",
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
            {
                "name": "stage",
                "type": "query",
                "label": "Stage",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": "label_values(agro_request_duration_seconds_bucket, stage)",
                "refresh": 2,
                "definition": "label_values(agro_request_duration_seconds_bucket, stage)",
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
        ]
    },
    "panels": [],
}

pid = 1
row = 0
col_w = 8  # 3 columns across (8+8+8 = 24)

# Row 1: RPS, Error Rate, Cost/min
dashboard["panels"].append(stat_panel(pid, "Requests/sec (ok)", 'sum(rate(agro_requests_total{success="true",provider=~"$provider",model=~"$model",route=~"$route"}[5m]))', 0, row, col_w, 8, unit="req/s")); pid+=1
dashboard["panels"].append(stat_panel(pid, "Error/sec", 'sum(rate(agro_errors_total[5m]))', 8, row, col_w, 8, unit="ops")); pid+=1
dashboard["panels"].append(stat_panel(pid, "Cost/min (USD)", 'sum(rate(agro_cost_usd_total{provider=~"$provider",model=~"$model"}[5m])) * 60', 16, row, col_w, 8, unit="currencyUSD")); pid+=1
row += 8

# Row 2: Requests by route, Error rate by type, Tokens/min
dashboard["panels"].append(ts_panel(pid, "Requests/sec by route", 'sum by (route) (rate(agro_requests_total{provider=~"$provider",model=~"$model",route=~"$route"}[5m]))', 0, row, col_w, 10)); pid+=1
dashboard["panels"].append(ts_panel(pid, "Errors/sec by type", 'sum by (type) (rate(agro_errors_total[5m]))', 8, row, col_w, 10)); pid+=1
dashboard["panels"].append(ts_panel(pid, "Tokens/min by role", 'sum by (role) (rate(agro_tokens_total{provider=~"$provider",model=~"$model"}[5m])) * 60', 16, row, col_w, 10)); pid+=1
row += 10

# Row 3: Latency P95 by stage, Cost per request, Top models by cost
lat_q = 'histogram_quantile(0.95, sum by (le, stage) (rate(agro_request_duration_seconds_bucket{stage=~"$stage"}[5m])))'
dashboard["panels"].append(ts_panel(pid, "P95 latency by stage (s)", lat_q, 0, row, col_w, 10)); pid+=1
cpr = '(sum(rate(agro_cost_usd_total{provider=~"$provider",model=~"$model"}[5m])))/(sum(rate(agro_requests_total{provider=~"$provider",model=~"$model"}[5m])) )'
dashboard["panels"].append(stat_panel(pid, "Cost per request (USD)", cpr, 8, row, col_w, 10, unit="currencyUSD")); pid+=1
dashboard["panels"].append(bargauge_panel(pid, "Top 5 models by cost (5m)", 'topk(5, sum by (model) (rate(agro_cost_usd_total[5m])))', 16, row, col_w, 10, unit="currencyUSD")); pid+=1
row += 10

# Row 4: Retrieval quality
dashboard["panels"].append(gauge_panel(pid, "MRR (avg, 5m)", 'avg_over_time(agro_rr_mrr[5m])', 0, row, col_w, 10, unit="none")); pid+=1
dashboard["panels"].append(bargauge_panel(pid, "Hits@K (avg, 5m)", 'avg_over_time(agro_retrieval_hits[5m])', 8, row, col_w, 10)); pid+=1
dashboard["panels"].append(ts_panel(pid, "Canary pass ratio by model", 'sum by (model) (rate(agro_canary_pass_total[5m])) / sum by (model) (rate(agro_canary_total[5m]))', 16, row, col_w, 10)); pid+=1
row += 10

# Row 5: Reranker diagnostics
dashboard["panels"].append(heatmap_panel(pid, "Reranker margin (abs) histogram", 'sum by (le) (rate(agro_reranker_margin_abs_bucket[5m]))', 0, row, 12, 12)); pid+=1
dashboard["panels"].append(bargauge_panel(pid, "Reranker winner (count, 5m)", 'sum by (winner) (rate(agro_reranker_winner_total[5m]))', 12, row, 12, 12)); pid+=1
row += 12

# Save
out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "out")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "agro_overview_dashboard.json")

with open(out_path, "w") as f:
    json.dump({"dashboard": dashboard, "overwrite": True, "message": "AGRO Overview initial import"}, f, indent=2)

print(f"✓ Dashboard saved to: {out_path}")
print(f"✓ Import via: http://127.0.0.1:3000/dashboard/import")
print(f"  Login: admin / Trenton2023")