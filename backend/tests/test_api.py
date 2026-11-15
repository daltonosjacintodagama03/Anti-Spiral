def test_health(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_and_list_sites(client):
    payload = {
        "name": "Crater candidate",
        "xKm": 12,
        "yKm": -8,
        "slopeDeg": 4.2,
        "illuminationPct": 78,
        "earthVisibilityPct": 61,
    }
    created = client.post("/api/sites", json=payload)

    assert created.status_code == 201
    assert created.json()["name"] == payload["name"]
    assert created.json()["xKm"] == payload["xKm"]
    assert len(client.get("/api/sites").json()) == 1


def test_sites_reject_out_of_range_measurements(client):
    response = client.post(
        "/api/sites",
        json={
            "name": "Invalid candidate",
            "xKm": 12,
            "yKm": -8,
            "slopeDeg": 91,
            "illuminationPct": 78,
            "earthVisibilityPct": 61,
        },
    )

    assert response.status_code == 422


def test_sites_reject_duplicate_names(client):
    payload = {
        "name": "Duplicate candidate",
        "xKm": 12,
        "yKm": -8,
        "slopeDeg": 4.2,
        "illuminationPct": 78,
        "earthVisibilityPct": 61,
    }

    assert client.post("/api/sites", json=payload).status_code == 201
    duplicate = client.post("/api/sites", json=payload)

    assert duplicate.status_code == 409


def test_create_and_list_jobs(client):
    payload = {
        "name": "South pole analysis",
        "kind": "site-ranking",
        "payload": {"energyWeight": 50},
    }
    created = client.post("/api/jobs", json=payload)

    assert created.status_code == 201
    assert created.json()["status"] == "pending"
    assert created.json()["payload"] == payload["payload"]
    assert len(client.get("/api/jobs").json()) == 1
