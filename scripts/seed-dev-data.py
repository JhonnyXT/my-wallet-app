#!/usr/bin/env python3
"""
Carga (o borra) datos de prueba en la app DEV instalada en el dispositivo por adb.

El variant dev (com.mywallet.app) es la app con los datos REALES del usuario, así que:
  - Antes de tocar nada, respalda la base completa en ~/mywallet-backups/<fecha>/.
  - Todo lo generado lleva la etiqueta "datos-prueba" y `--remove` borra SOLO eso.
  - Cargar dos veces reemplaza los datos de prueba anteriores (no los duplica).

Además de 6 meses de movimientos en Personal, crea dos listas de prueba con más personas
("Opa! (prueba)" y "Paseo a Cartagena (prueba)"), con gastos pagados por distintos
miembros, para probar listas, "quién pagó" y las cuentas; y pone presupuesto a las 3
categorías con más gasto del período actual (116%, 92% y 60%), para ver el diseño de la
gráfica con presupuesto. `--remove` quita las listas y restaura los presupuestos de antes.

Uso:
  python3 scripts/seed-dev-data.py            # cargar datos de prueba
  python3 scripts/seed-dev-data.py --remove   # borrar solo los datos de prueba

Requiere un build DEBUG de dev instalado (run-as solo funciona con apps debuggable) y
el dispositivo conectado. La app se cierra durante la operación.
"""
import json
import os
import random
import shutil
import sqlite3
import subprocess
import sys
import time
import uuid
from datetime import date, datetime, timedelta

PKG = "com.mywallet.app"
TAG = "datos-prueba"
MONTHS_BACK = 6
ADB = os.path.expanduser(os.environ.get("ADB", "~/Android/Sdk/platform-tools/adb"))
DB_FILES = ["mywallet.db", "mywallet.db-wal", "mywallet.db-shm"]
RK_FILES = ["RKStorage", "RKStorage-wal", "RKStorage-shm", "RKStorage-journal"]
SEED_LIST_PREFIX = "list_seed_"
SEED_META_KEY = "mywallet-seed-meta"  # fila propia en AsyncStorage; la app no la lee
# Qué tan lleno queda cada presupuesto de prueba (gastado / presupuesto), por gasto desc.
SEED_BUDGET_RATIOS = [1.16, 0.92, 0.60]

# Categorías propias de cada lista de prueba (cada lista tiene las suyas en la app).
def seed_cat(cid, emoji, name, bg, accent, kind="expense"):
    return {
        "id": cid, "emoji": emoji, "name": name, "colorBg": bg, "colorAccent": accent,
        "type": kind, "keywords": [], "isPreset": False,
    }


SEED_LIST_CATEGORIES = {
    f"{SEED_LIST_PREFIX}opa": [
        seed_cat("seed_catering", "🍔", "Catering", "#FFE8D6", "#D2601A"),
        seed_cat("seed_transporte", "🚗", "Transporte", "#DBEAFE", "#2563EB"),
        seed_cat("seed_props", "🛍️", "Props y equipo", "#EDE9FE", "#7C3AED"),
        seed_cat("seed_cliente", "💼", "Pagos de clientes", "#D1FAE5", "#059669", "income"),
    ],
    f"{SEED_LIST_PREFIX}viaje": [
        seed_cat("seed_viaje", "✈️", "Vuelos y hotel", "#CFFAFE", "#0891B2"),
        seed_cat("seed_comida", "🍔", "Comida", "#FFE8D6", "#D2601A"),
        seed_cat("seed_taxis", "🚗", "Taxis", "#DBEAFE", "#2563EB"),
    ],
}
# Presupuestos de cada lista de prueba: uno pasado y otro holgado, para ver la gráfica.
SEED_LIST_BUDGETS = {
    f"{SEED_LIST_PREFIX}opa": {"🛍️": 3_000_000, "🍔": 600_000},
    f"{SEED_LIST_PREFIX}viaje": {"✈️": 3_500_000, "🍔": 150_000},
}

# Listas de prueba: (id, nombre, emoji, miembros, gastos). Cada gasto:
# (días atrás, monto, descripción, emoji, pagó, etiquetas extra). pagó "" = el dueño del teléfono.
# Montos negativos = ingresos (convención de la app).
SEED_LISTS = [
    (
        f"{SEED_LIST_PREFIX}opa",
        "Opa! (prueba)",
        "💼",
        [{"id": "m_seed_miguel", "name": "Miguelangel"}, {"id": "m_seed_laura", "name": "Laura"}],
        [
            (1, 300_000, "Hamburguesas de Catering", "🍔", "m_seed_miguel", []),
            (2, 250_000, "Transporte del equipo", "🚗", "", []),
            (3, 2_000_000, "Props", "🛍️", "m_seed_laura", []),
            (5, 180_000, "Almuerzo rodaje", "🍔", "", []),
            (8, 450_000, "Alquiler de luces", "🛍️", "m_seed_miguel", []),
            (10, -5_000_000, "Pago del cliente", "💼", "", []),
            (12, 95_000, "Taxis", "🚗", "m_seed_laura", []),
            (15, 1_200_000, "Cámara de apoyo", "🛍️", "", []),
        ],
    ),
    (
        f"{SEED_LIST_PREFIX}viaje",
        "Paseo a Cartagena (prueba)",
        "✈️",
        [{"id": "m_seed_ana", "name": "Ana"}],
        [
            (20, 1_450_000, "Vuelos Bogotá–Cartagena", "✈️", "", ["#viaje"]),
            (19, 980_000, "Hotel Getsemaní", "✈️", "m_seed_ana", ["#viaje"]),
            (18, 210_000, "Cena en La Cevichería", "🍔", "m_seed_ana", ["#viaje"]),
            (18, 320_000, "Tour Islas del Rosario", "✈️", "", ["#viaje"]),
            (17, 65_000, "Taxi al aeropuerto", "🚗", "", ["#viaje"]),
        ],
    ),
]

# Comercios y rango de monto (COP) por emoji de categoría predefinida; el resto, genérico.
PROFILES = {
    "🍔": (["Rappi", "Crepes & Waffles", "El Corral", "Frisby", "Panadería"], 12_000, 65_000, 5),
    "🚗": (["Uber", "DiDi", "TransMilenio", "Taxi"], 3_000, 32_000, 4),
    "🛍️": (["Éxito", "D1", "Ara", "Amazon", "Falabella"], 18_000, 160_000, 1.5),
    "🎮": (["Netflix", "Cine Colombia", "Steam", "Spotify"], 15_000, 90_000, 1),
    "🏥": (["Droguería", "Cita médica"], 20_000, 150_000, 0.4),
    "👕": (["Zara", "Arturo Calle", "Adidas"], 60_000, 280_000, 0.3),
    "👤": (["Peluquería", "Gimnasio"], 25_000, 120_000, 0.5),
}
GENERIC = (["Compra"], 10_000, 70_000, 0.25)


def adb(*args, binary=False, input_bytes=None):
    out = subprocess.run([ADB, *args], capture_output=True, input=input_bytes, check=True)
    return out.stdout if binary else out.stdout.decode()


def run_as(*cmd, binary=False):
    return adb("exec-out", "run-as", PKG, *cmd, binary=binary)


def pull(remote, local):
    data = run_as("cat", remote, binary=True)
    with open(local, "wb") as f:
        f.write(data)


def local_iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000")


def read_settings(rk_path):
    con = sqlite3.connect(rk_path)
    row = con.execute("SELECT value FROM catalystLocalStorage WHERE key = 'mywallet-settings'").fetchone()
    con.close()
    if not row:
        sys.exit("No encontré la configuración de la app (mywallet-settings) — ¿terminaste el onboarding?")
    return json.loads(row[0])


def write_settings(rk_path, settings):
    con = sqlite3.connect(rk_path)
    con.execute(
        "UPDATE catalystLocalStorage SET value = ? WHERE key = 'mywallet-settings'",
        (json.dumps(settings, ensure_ascii=False),),
    )
    con.commit()
    con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    con.close()


def read_meta(rk_path):
    con = sqlite3.connect(rk_path)
    row = con.execute("SELECT value FROM catalystLocalStorage WHERE key = ?", (SEED_META_KEY,)).fetchone()
    con.close()
    return json.loads(row[0]) if row else {}


def write_meta(rk_path, meta):
    con = sqlite3.connect(rk_path)
    if meta:
        con.execute(
            "INSERT OR REPLACE INTO catalystLocalStorage (key, value) VALUES (?, ?)",
            (SEED_META_KEY, json.dumps(meta, ensure_ascii=False)),
        )
    else:
        con.execute("DELETE FROM catalystLocalStorage WHERE key = ?", (SEED_META_KEY,))
    con.commit()
    con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    con.close()


def personal_config(state):
    """Categorías y presupuestos de Personal: en el estado si es la lista activa; si no, los
    guardados en su entrada de `lists` (la app los intercambia al cambiar de lista)."""
    if state.get("activeListId", "personal") == "personal":
        return state.get("userCategories", []), state.setdefault("budgetByCategory", {})
    personal = next(l for l in state["lists"] if l["id"] == "personal")
    return personal.get("categories", []), personal.setdefault("budgets", {})


def restore_budgets(state, meta):
    """Deja los presupuestos de Personal como estaban antes de la última carga de prueba."""
    _, budgets = personal_config(state)
    for emoji, prev in meta.get("budgets_prev", {}).items():
        if prev is None:
            budgets.pop(emoji, None)
        else:
            budgets[emoji] = prev


def cycle_start(period, now):
    """Inicio del ciclo actual del período predeterminado (mismo criterio que la app, simplificado)."""
    today = now.date()
    kind = (period or {}).get("type")
    if kind == "semimonthly":
        days = sorted(period.get("days") or [1, 16])
        past = [d for d in days if d <= today.day]
        if past:
            return today.replace(day=past[-1])
        prev_month = (today.replace(day=1) - timedelta(days=1))
        return prev_month.replace(day=min(days[-1], 28))
    if kind == "monthly":
        start = period.get("startDay", 1)
        if today.day >= start:
            return today.replace(day=start)
        prev_month = (today.replace(day=1) - timedelta(days=1))
        return prev_month.replace(day=start)
    if kind in ("weekly", "biweekly"):
        return today - timedelta(days=(today.weekday() + 1 - period.get("weekStartsOn", 0)) % 7)
    return today.replace(day=1)


def seed_budgets(state, con, now):
    """Presupuesto a las 3 categorías de gasto con más gasto en Personal en el ciclo actual."""
    categories, budgets = personal_config(state)
    expense_emojis = {c["emoji"] for c in categories if c["type"] == "expense"}
    start = local_iso(datetime.combine(cycle_start(state.get("defaultPeriod"), now), datetime.min.time()))
    rows = con.execute(
        "SELECT category_emoji, SUM(amount) FROM transactions"
        " WHERE amount > 0 AND list_id = 'personal' AND date >= ?"
        " GROUP BY category_emoji ORDER BY 2 DESC",
        (start,),
    ).fetchall()
    top = [(e, total) for e, total in rows if e in expense_emojis][: len(SEED_BUDGET_RATIOS)]
    prev = {}
    for (emoji, spent), ratio in zip(top, SEED_BUDGET_RATIOS):
        prev[emoji] = budgets.get(emoji)
        budgets[emoji] = max(round(spent / ratio / 10_000) * 10_000, 10_000)
    return prev


def apply_seed_lists(state, add):
    """Quita las listas de prueba de los ajustes y, si `add`, las vuelve a crear."""
    lists = state.get("lists") or [
        {
            "id": "personal",
            "name": "Personal",
            "emoji": "👤",
            "period": state.get("defaultPeriod"),
            "updatedAt": 0,
        }
    ]
    if str(state.get("activeListId", "personal")).startswith(SEED_LIST_PREFIX):
        # Estaba parado en una lista de prueba: vuelve a Personal con su período guardado.
        # (lo de la lista activa vive en el estado; lo de Personal, guardado en su entrada).
        personal = next((l for l in lists if l["id"] == "personal"), None)
        state["activeListId"] = "personal"
        if personal:
            if personal.get("period"):
                state["defaultPeriod"] = personal["period"]
            if personal.get("categories") is not None:
                state["userCategories"] = personal["categories"]
            state["budgetByCategory"] = personal.get("budgets") or {}
    lists = [l for l in lists if not l["id"].startswith(SEED_LIST_PREFIX)]
    if add:
        for list_id, name, emoji, members, _ in SEED_LISTS:
            lists.append(
                {
                    "id": list_id,
                    "name": name,
                    "emoji": emoji,
                    "members": members,
                    "period": {"type": "all"},
                    "categories": SEED_LIST_CATEGORIES[list_id],
                    "budgets": SEED_LIST_BUDGETS[list_id],
                    "showIncome": True,
                    "updatedAt": now_ms(),
                }
            )
    state["lists"] = lists


def seed_list_rows(now):
    rows = []
    for list_id, _, _, _, expenses in SEED_LISTS:
        for days_ago, amount, desc, emoji, paid_by, extra_tags in expenses:
            dt = (now - timedelta(days=days_ago)).replace(hour=12 + days_ago % 8, minute=days_ago * 7 % 60)
            tags = json.dumps(extra_tags + [TAG], ensure_ascii=False)
            rows.append((amount, desc, emoji, local_iso(dt), tags, "savings", list_id, paid_by))
    return rows


def now_ms():
    """Instante de máquina en ms, como `updated_at`/`updatedAt` de la app (sync)."""
    return int(time.time() * 1000)


def ensure_columns(con):
    """La app agrega estas columnas al arrancar; el script no depende de que ya haya corrido."""
    cols = {r[1] for r in con.execute("PRAGMA table_info(transactions)")}
    for name, ddl in [
        ("list_id", "TEXT NOT NULL DEFAULT 'personal'"),
        ("paid_by", "TEXT NOT NULL DEFAULT ''"),
        ("uid", "TEXT"),
        ("updated_at", "INTEGER NOT NULL DEFAULT 0"),
        ("deleted_at", "INTEGER"),
        ("sync_state", "TEXT NOT NULL DEFAULT 'pending'"),
    ]:
        if name not in cols:
            con.execute(f"ALTER TABLE transactions ADD COLUMN {name} {ddl}")


def with_sync_cols(row):
    """Agrega uid/updated_at a una fila (sync_state queda 'pending' por defecto)."""
    return (*row, str(uuid.uuid4()), now_ms())


def build_rows(categories, now):
    rnd = random.Random(20260928)
    expense = [c for c in categories if c["type"] == "expense"]
    income = [c for c in categories if c["type"] == "income"]
    salary = next((c for c in income if c["emoji"] == "💼"), income[0] if income else None)
    home = next((c for c in expense if c["emoji"] == "🏠"), None)
    rows = []

    def add(dt, amount, desc, emoji, method="savings"):
        if dt <= now:
            rows.append((amount, desc, emoji, local_iso(dt), json.dumps([TAG]), method))

    m = now.month - MONTHS_BACK
    y = now.year + (m - 1) // 12
    d = date(y, (m - 1) % 12 + 1, 1)
    while d <= now.date():
        at = lambda h: datetime(d.year, d.month, d.day, h, rnd.randrange(60))  # noqa: E731
        if salary and d.day in (1, 16):
            add(at(8), -2_600_000, "Pago de nómina", salary["emoji"])  # negativo = ingreso
        if home and d.day == 5:
            add(at(10), 1_250_000, "Arriendo", home["emoji"])
        for cat in expense:
            if cat["emoji"] == "🏠":
                continue
            merchants, lo, hi, per_week = PROFILES.get(cat["emoji"], GENERIC)
            if rnd.random() < per_week / 7:
                amount = round((lo + rnd.random() * (hi - lo)) / 100) * 100
                method = "savings" if rnd.random() < 0.6 else "cash"
                add(at(9 + rnd.randrange(12)), amount, rnd.choice(merchants), cat["emoji"], method)
        d += timedelta(days=1)
    return rows


def main():
    remove = "--remove" in sys.argv
    if adb("get-state").strip() != "device":
        sys.exit("No hay dispositivo conectado.")

    adb("shell", "am", "force-stop", PKG)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    work = os.path.expanduser(f"~/mywallet-backups/{stamp}")
    os.makedirs(work)
    for name in DB_FILES:
        pull(f"files/SQLite/{name}", os.path.join(work, name))
    rk_present = set(run_as("ls", "databases").split())
    rk_files = [n for n in RK_FILES if n in rk_present]
    for name in rk_files:
        pull(f"databases/{name}", os.path.join(work, name))
    # Respaldo intacto aparte: la copia de trabajo se modifica abajo.
    backup = os.path.join(work, "backup")
    os.makedirs(backup)
    for name in DB_FILES + rk_files:
        shutil.copy2(os.path.join(work, name), backup)

    rk_path = os.path.join(work, "RKStorage")
    settings = read_settings(rk_path)  # aplica el -wal que está al lado
    meta = read_meta(rk_path)
    restore_budgets(settings["state"], meta)
    apply_seed_lists(settings["state"], add=not remove)

    db_path = os.path.join(work, "mywallet.db")
    con = sqlite3.connect(db_path)  # aplica el -wal que está al lado
    ensure_columns(con)
    before = con.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    removed = con.execute("DELETE FROM transactions WHERE tags LIKE ?", (f'%"{TAG}"%',)).rowcount
    added = 0
    budgets_prev = {}
    if not remove:
        now = datetime.now()
        rows = build_rows(settings["state"]["userCategories"], now)
        con.executemany(
            "INSERT INTO transactions"
            " (amount, description, category_emoji, date, tags, payment_method, uid, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [with_sync_cols(r) for r in rows],
        )
        list_rows = seed_list_rows(now)
        con.executemany(
            "INSERT INTO transactions"
            " (amount, description, category_emoji, date, tags, payment_method, list_id, paid_by,"
            " uid, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [with_sync_cols(r) for r in list_rows],
        )
        added = len(rows) + len(list_rows)
        budgets_prev = seed_budgets(settings["state"], con, now)
    con.commit()
    write_settings(rk_path, settings)
    write_meta(rk_path, {"budgets_prev": budgets_prev} if not remove else {})
    con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    con.close()

    tmp = "/data/local/tmp/mywallet-seed.db"
    adb("push", db_path, tmp)
    adb("shell", "chmod", "644", tmp)
    run_as("cp", tmp, "files/SQLite/mywallet.db")
    run_as("rm", "-f", "files/SQLite/mywallet.db-wal", "files/SQLite/mywallet.db-shm")
    adb("shell", "rm", tmp)

    tmp_rk = "/data/local/tmp/mywallet-seed-rk.db"
    adb("push", rk_path, tmp_rk)
    adb("shell", "chmod", "644", tmp_rk)
    run_as("cp", tmp_rk, "databases/RKStorage")
    run_as("rm", "-f", *[f"databases/{n}" for n in RK_FILES[1:]])
    adb("shell", "rm", tmp_rk)

    after = before - removed + added
    print(f"Respaldo: {backup}")
    print(f"Movimientos: {before} antes → {after} ahora (−{removed} de prueba viejos, +{added} nuevos)")
    print("Listas de prueba: " + ("quitadas" if remove else ", ".join(n for _, n, _, _, _ in SEED_LISTS)))
    if remove:
        print("Presupuestos: restaurados a como estaban antes de los datos de prueba")
    else:
        _, b = personal_config(settings["state"])
        print("Presupuestos de prueba: " + ", ".join(f"{e} ${b[e]:,}".replace(",", ".") for e in budgets_prev))


if __name__ == "__main__":
    main()
