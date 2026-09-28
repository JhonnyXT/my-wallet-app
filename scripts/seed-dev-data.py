#!/usr/bin/env python3
"""
Carga (o borra) datos de prueba en la app DEV instalada en el dispositivo por adb.

El variant dev (com.mywallet.app) es la app con los datos REALES del usuario, así que:
  - Antes de tocar nada, respalda la base completa en ~/mywallet-backups/<fecha>/.
  - Todo lo generado lleva la etiqueta "datos-prueba" y `--remove` borra SOLO eso.
  - Cargar dos veces reemplaza los datos de prueba anteriores (no los duplica).

Uso:
  python3 scripts/seed-dev-data.py            # cargar 6 meses de datos de prueba
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
from datetime import date, datetime, timedelta

PKG = "com.mywallet.app"
TAG = "datos-prueba"
MONTHS_BACK = 6
ADB = os.path.expanduser(os.environ.get("ADB", "~/Android/Sdk/platform-tools/adb"))
DB_FILES = ["mywallet.db", "mywallet.db-wal", "mywallet.db-shm"]

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


def user_categories(rk_path):
    con = sqlite3.connect(rk_path)
    row = con.execute("SELECT value FROM catalystLocalStorage WHERE key = 'mywallet-settings'").fetchone()
    con.close()
    if not row:
        sys.exit("No encontré la configuración de la app (mywallet-settings) — ¿terminaste el onboarding?")
    return json.loads(row[0])["state"]["userCategories"]


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
    pull("databases/RKStorage", os.path.join(work, "RKStorage"))
    # Respaldo intacto aparte: la copia de trabajo se modifica abajo.
    backup = os.path.join(work, "backup")
    os.makedirs(backup)
    for name in DB_FILES + ["RKStorage"]:
        shutil.copy2(os.path.join(work, name), backup)

    db_path = os.path.join(work, "mywallet.db")
    con = sqlite3.connect(db_path)  # aplica el -wal que está al lado
    before = con.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    removed = con.execute("DELETE FROM transactions WHERE tags LIKE ?", (f'%"{TAG}"%',)).rowcount
    added = 0
    if not remove:
        rows = build_rows(user_categories(os.path.join(work, "RKStorage")), datetime.now())
        con.executemany(
            "INSERT INTO transactions (amount, description, category_emoji, date, tags, payment_method)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            rows,
        )
        added = len(rows)
    con.commit()
    con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    con.close()

    tmp = "/data/local/tmp/mywallet-seed.db"
    adb("push", db_path, tmp)
    adb("shell", "chmod", "644", tmp)
    run_as("cp", tmp, "files/SQLite/mywallet.db")
    run_as("rm", "-f", "files/SQLite/mywallet.db-wal", "files/SQLite/mywallet.db-shm")
    adb("shell", "rm", tmp)

    after = before - removed + added
    print(f"Respaldo: {backup}")
    print(f"Movimientos: {before} antes → {after} ahora (−{removed} de prueba viejos, +{added} nuevos)")


if __name__ == "__main__":
    main()
