import asyncio
import time

import websockets

import os
from dotenv import load_dotenv

load_dotenv()

WSS_URL = os.getenv("WSS_URL")

# ============================================================
# CONFIGURATION
# ============================================================


TIMEOUT = 10


# ============================================================
# ÉTAT DU SERVEUR
# ============================================================

last_status = None
last_latency = None


# ============================================================
# TEST DU SERVEUR WSS
# ============================================================

async def check_wss():
    """
    Teste la connexion au serveur WebSocket.

    Retourne :
        {
            "online": True/False,
            "latency": nombre en ms ou None
        }
    """

    start = time.perf_counter()

    try:
        async with websockets.connect(
            WSS_URL,
            open_timeout=TIMEOUT,
            close_timeout=TIMEOUT
        ):
            latency = round(
                (time.perf_counter() - start) * 1000
            )

            return {
                "online": True,
                "latency": latency
            }

    except Exception as error:
        print(f"❌ WSS OFFLINE : {error}")

        return {
            "online": False,
            "latency": None
        }


# ============================================================
# VÉRIFICATION DU STATUT
# ============================================================

async def get_wss_status():
    """
    Vérifie le serveur et détecte si son statut a changé.
    """

    global last_status
    global last_latency

    result = await check_wss()

    current_status = result["online"]
    current_latency = result["latency"]

    changed = (
        last_status is not None
        and current_status != last_status
    )

    last_status = current_status
    last_latency = current_latency

    return {
        "online": current_status,
        "latency": current_latency,
        "changed": changed
    }


# ============================================================
# TEST MANUEL
# ============================================================

if __name__ == "__main__":

    async def main():

        print("🔍 Test du serveur WSS...")
        print(f"🌐 {WSS_URL}")

        result = await get_wss_status()

        if result["online"]:
            print(
                f"🟢 ONLINE - "
                f"{result['latency']} ms"
            )

        else:
            print("🔴 OFFLINE")

    asyncio.run(main())