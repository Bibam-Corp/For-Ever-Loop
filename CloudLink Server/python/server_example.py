"""
CloudLink/FEL server ready for TurboWarp.

Features enabled by loading the built-in CLPv4 protocol:
- handshake, ping, setid
- global/private messages: gmsg, pmsg
- global/private variables: gvar, pvar
- rooms: link, unlink, per-packet room selection
- direct messages
- user lists, client object, server version, optional MOTD

Run:
    python server_example.py
Then connect TurboWarp to:
    ws://127.0.0.1:3000
"""

import asyncio
import json
import logging
import os
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings(
    "ignore",
    message="pkg_resources is deprecated as an API.*",
    category=UserWarning,
)

VENDOR_DIR = Path(__file__).with_name("cloudlink_vendor")
if VENDOR_DIR.exists():
    sys.path.insert(0, str(VENDOR_DIR))

from cloudlink import server as CloudLinkServer
from cloudlink.server.protocols import clpv4, scratch


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "3000"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
# Packet-by-packet tracing is useful only while debugging.  Keep it opt-in on
# Render; otherwise a busy game produces thousands of low-value log lines.
LOG_PACKETS = os.environ.get("LOG_PACKETS", "0").lower() in {"1", "true", "yes"}
PRIMARY_LOBBY = os.environ.get("PRIMARY_LOBBY", "fel-main")
SYSTEM_ROOMS = {PRIMARY_LOBBY}
HEARTBEAT_ROOM = os.environ.get("HEARTBEAT_ROOM", PRIMARY_LOBBY)
IDLE_TIMEOUT_SECONDS = float(os.environ.get("IDLE_TIMEOUT_SECONDS", "30"))
EMPTY_LOBBY_TIMEOUT_SECONDS = float(os.environ.get("EMPTY_LOBBY_TIMEOUT_SECONDS", "30"))
STATS_INTERVAL_SECONDS = float(os.environ.get("STATS_INTERVAL_SECONDS", "30"))
CLEANUP_INTERVAL_SECONDS = float(os.environ.get("CLEANUP_INTERVAL_SECONDS", "5"))

# Set this to False if you want data packets to preserve object/list values.
# Keeping it True prevents old Scratch/TurboWarp projects from displaying
# objects as "[object Object]" when a JSON object is sent as message/variable data.
STRINGIFY_DATA_OBJECTS = True

# Optional server greeting shown after handshake.
ENABLE_MOTD = True
MOTD_MESSAGE = "Bienvenue sur le serveur FEL CloudLink."


DATA_COMMANDS = {"gmsg", "pmsg", "gvar", "pvar", "direct"}
NOISY_KEYS = {"val", "details"}


def log(message, level="INFO"):
    print(f"[{level}] {message}", flush=True)


def short(value, max_len=180):
    text = repr(value)
    if len(text) > max_len:
        return f"{text[:max_len]}..."
    return text


def packet_summary(message):
    if not isinstance(message, dict):
        return short(message)

    parts = [f"cmd={message.get('cmd') or message.get('method')!r}"]
    for key in ("listener", "name", "id", "rooms", "mode", "code", "code_id"):
        if key in message:
            parts.append(f"{key}={short(message[key], 80)}")
    for key in NOISY_KEYS:
        if key in message:
            parts.append(f"{key}={short(message[key])}")
    return " ".join(parts)


def client_label(client):
    snowflake = getattr(client, "snowflake", "?")
    username = getattr(client, "username", "")
    protocol = getattr(getattr(client, "protocol", None), "__qualname__", "unknown")
    rooms = sorted(getattr(client, "rooms", []))
    if username:
        return f"{snowflake}/{username} protocol={protocol} rooms={rooms}"
    return f"{snowflake} protocol={protocol} rooms={rooms}"


def room_members(room):
    """Count clients in a room, regardless of the CloudLink protocol used."""
    return sum(len(group["all"]) for group in room["clients"].values())


def log_dashboard(app):
    """Emit a small, readable Render dashboard with the current server state."""
    clients = list(app.clients_manager.clients)
    rooms = app.rooms_manager.rooms
    open_lobbies = {
        room_id: room_members(room)
        for room_id, room in rooms.items()
        if room_id not in SYSTEM_ROOMS and room_members(room) > 0
    }
    primary_members = room_members(rooms[PRIMARY_LOBBY]) if PRIMARY_LOBBY in rooms else 0
    players_in_game = sum(
        any(room_id != PRIMARY_LOBBY for room_id in client.rooms)
        for client in clients
    )
    log("┌──────────────────────────┬───────┐")
    log(f"│ Joueurs connectés        │ {len(clients):>5} │")
    log(f"│ Joueurs dans {PRIMARY_LOBBY:<12} │ {primary_members:>5} │")
    log(f"│ Joueurs en partie        │ {players_in_game:>5} │")
    log(f"│ Lobbies ouverts          │ {len(open_lobbies):>5} │")
    log("└──────────────────────────┴───────┘")


def make_json_safe(value):
    """Convert Python-only containers into JSON-compatible values."""
    if isinstance(value, set):
        return [make_json_safe(item) for item in value]
    if isinstance(value, list):
        return [make_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [make_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {str(key): make_json_safe(item) for key, item in value.items()}
    return value


def stringify_if_object(value):
    """Return objects/lists as compact JSON text for Scratch-safe reporters."""
    value = make_json_safe(value)
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return value


def is_heartbeat_packet(client, message):
    """FEL uses a global variable in the main room as its player heartbeat."""
    if message.get("cmd") != "gvar":
        return False

    selected_rooms = message.get("rooms")
    if selected_rooms is None:
        return HEARTBEAT_ROOM in client.rooms
    if isinstance(selected_rooms, str):
        return selected_rooms == HEARTBEAT_ROOM
    return isinstance(selected_rooms, list) and HEARTBEAT_ROOM in selected_rooms


def patch_outgoing_packets(app):
    """Normalize outgoing packets and optionally fix object-valued data packets."""
    original_execute_unicast = app.execute_unicast

    async def execute_unicast_compat(client, message):
        if isinstance(message, dict):
            message = make_json_safe(message)

            if STRINGIFY_DATA_OBJECTS and message.get("cmd") in DATA_COMMANDS:
                if "val" in message:
                    message["val"] = stringify_if_object(message["val"])

        if LOG_PACKETS:
            log(f"TX -> {client_label(client)} {packet_summary(message)}")

        await original_execute_unicast(client, message)

    app.execute_unicast = execute_unicast_compat


def patch_incoming_packets(app):
    """Validate and normalize packets before CloudLink command handlers use them."""
    original_message_processor = app.message_processor

    async def message_processor_compat(client, message):
        try:
            parsed = app.ujson.loads(message)
            if not isinstance(parsed, dict):
                raise ValueError("le paquet JSON doit être un objet")

            command = parsed.get("cmd")
            if is_heartbeat_packet(client, parsed):
                client.last_heartbeat_at = time.monotonic()
            if command in DATA_COMMANDS and isinstance(parsed.get("val"), (dict, list)):
                # Scratch reporters expect text.  Serializing structured values here
                # prevents JavaScript from later coercing them to "[object Object]".
                parsed["val"] = stringify_if_object(parsed["val"])

            if "name" in parsed and not isinstance(parsed["name"], str):
                parsed["name"] = stringify_if_object(parsed["name"])

            if "rooms" in parsed:
                rooms = parsed["rooms"]
                if isinstance(rooms, list):
                    if not all(isinstance(room, str) for room in rooms):
                        raise ValueError("chaque room doit être une chaîne de caractères")
                elif not isinstance(rooms, str):
                    parsed["rooms"] = str(rooms)

            if command in {"link", "unlink"}:
                room_value = parsed.get("val")
                if isinstance(room_value, list):
                    if not all(isinstance(room, str) for room in room_value):
                        raise ValueError("chaque room doit être une chaîne de caractères")
                elif not isinstance(room_value, str):
                    raise ValueError("la room doit être une chaîne ou une liste de chaînes")

            message = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
        except Exception as error:
            log(f"REJET {client_label(client)} paquet invalide: {error}", "WARNING")
            await app.execute_unicast(client, {
                "cmd": "statuscode",
                "code": "E:102 | Datatype",
                "code_id": 102,
                "details": "Le paquet doit être un objet JSON valide avec des rooms texte.",
            })
            return

        if LOG_PACKETS:
            log(f"RX <- {client_label(client)} {packet_summary(parsed)}")

        await original_message_processor(client, message)

    app.message_processor = message_processor_compat


def patch_room_events(app):
    """Log successful joins/leaves without logging every game data packet."""
    original_subscribe = app.rooms_manager.subscribe
    original_unsubscribe = app.rooms_manager.unsubscribe

    def subscribe_compat(client, room_id):
        already_joined = room_id in client.rooms
        original_subscribe(client, room_id)
        if not already_joined and room_id != PRIMARY_LOBBY:
            log(f"ROOM_JOIN {client_label(client)} room={room_id!r}")

    def unsubscribe_compat(client, room_id):
        was_joined = room_id in client.rooms
        original_unsubscribe(client, room_id)
        if was_joined and room_id != PRIMARY_LOBBY:
            log(f"ROOM_LEAVE {client_label(client)} room={room_id!r}")

    app.rooms_manager.subscribe = subscribe_compat
    app.rooms_manager.unsubscribe = unsubscribe_compat


def patch_maintenance(app):
    """Periodically print stats, expire empty lobbies, and close idle clients."""
    original_delete = app.rooms_manager.delete
    empty_lobbies_since = {}

    def delete_compat(room_id):
        # CloudLink normally removes an empty room immediately. Keep game lobbies
        # for a short reconnect grace period, but never keep system rooms around.
        if room_id not in SYSTEM_ROOMS:
            empty_lobbies_since.setdefault(room_id, time.monotonic())
            return
        original_delete(room_id)

    app.rooms_manager.delete = delete_compat

    async def maintenance_loop():
        next_stats_at = time.monotonic() + STATS_INTERVAL_SECONDS
        while True:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            now = time.monotonic()

            for room_id, empty_since in list(empty_lobbies_since.items()):
                room = app.rooms_manager.rooms.get(room_id)
                if room is None or room_members(room) > 0:
                    empty_lobbies_since.pop(room_id, None)
                    continue
                if now - empty_since >= EMPTY_LOBBY_TIMEOUT_SECONDS:
                    original_delete(room_id)
                    empty_lobbies_since.pop(room_id, None)
                    log(f"ROOM_EXPIRED room={room_id!r} empty_for={EMPTY_LOBBY_TIMEOUT_SECONDS:.0f}s")

            for client in list(app.clients_manager.clients):
                last_heartbeat_at = getattr(client, "last_heartbeat_at", client.birth_time)
                idle_for = now - last_heartbeat_at
                if idle_for >= IDLE_TIMEOUT_SECONDS and not getattr(client, "idle_timeout_started", False):
                    client.idle_timeout_started = True
                    log(f"IDLE_TIMEOUT {client_label(client)} no_heartbeat_for={idle_for:.0f}s", "WARNING")
                    app.close_connection(client, code=1001, reason="Heartbeat timeout")

            if now >= next_stats_at:
                log_dashboard(app)
                next_stats_at = now + STATS_INTERVAL_SECONDS

    original_run = app.__run__

    async def run_compat(ip, port):
        maintenance_task = asyncio.create_task(maintenance_loop())
        try:
            await original_run(ip, port)
        finally:
            maintenance_task.cancel()
            try:
                await maintenance_task
            except asyncio.CancelledError:
                pass

    app.__run__ = run_compat


def patch_user_object_lookup(app):
    """Allow private recipients to be passed as CloudLink user objects."""
    original_room_find_obj = app.rooms_manager.find_obj
    original_client_find_obj = app.clients_manager.find_obj

    def identity_candidates(query):
        if isinstance(query, dict):
            for key in ("id", "uuid", "username"):
                value = query.get(key)
                if value is not None and str(value):
                    yield str(value)
        else:
            yield query

    def room_find_obj_compat(query, room):
        last_error = None
        for candidate in identity_candidates(query):
            try:
                return original_room_find_obj(candidate, room)
            except Exception as error:
                last_error = error
        if last_error:
            raise last_error
        raise app.rooms_manager.exceptions.NoResultsFound

    def client_find_obj_compat(query):
        last_error = None
        for candidate in identity_candidates(query):
            try:
                return original_client_find_obj(candidate)
            except Exception as error:
                last_error = error
        if last_error:
            raise last_error
        raise app.clients_manager.exceptions.NoResultsFound

    app.rooms_manager.find_obj = room_find_obj_compat
    app.clients_manager.find_obj = client_find_obj_compat


class ServerEvents:
    async def on_connect(self, client):
        peer = getattr(client, "remote_address", "?")
        headers = getattr(client, "request_headers", {})
        origin = headers.get("origin", "?") if hasattr(headers, "get") else "?"
        client.last_heartbeat_at = time.monotonic()
        log(f"CONNECT {client.snowflake} peer={peer} origin={origin}")

    async def on_disconnect(self, client):
        log(f"DISCONNECT {client_label(client)}")

    async def on_error(self, client, error):
        log(f"ERROR {client_label(client)} {error}", "ERROR")


if __name__ == "__main__":
    app = CloudLinkServer()

    app.logging.basicConfig(
        level=LOG_LEVEL,
        format="[%(levelname)s] %(message)s",
        force=True
    )

    # Load full CloudLink v4 and Scratch cloud-variable support.
    cl4 = clpv4(app)
    cl4.default_room = PRIMARY_LOBBY
    scratch(app)

    cl4.enable_motd = ENABLE_MOTD
    cl4.motd_message = MOTD_MESSAGE

    patch_outgoing_packets(app)
    patch_incoming_packets(app)
    patch_user_object_lookup(app)
    patch_room_events(app)
    patch_maintenance(app)

    events = ServerEvents()
    app.bind_event(app.on_connect, events.on_connect)
    app.bind_event(app.on_disconnect, events.on_disconnect)
    app.bind_event(app.on_error, events.on_error)

    log(f"FEL CloudLink server listening on {HOST}:{PORT}")
    log("Local TurboWarp URL: ws://127.0.0.1:3000")
    log("Render URL: wss://<your-render-service>.onrender.com")
    log(f"Packet logs: {'enabled (debug only)' if LOG_PACKETS else 'disabled'}")
    log(f"Primary lobby: {PRIMARY_LOBBY}")
    log(f"Heartbeat variable room: {HEARTBEAT_ROOM}")
    log(
        f"Maintenance: stats/{STATS_INTERVAL_SECONDS:.0f}s, "
        f"heartbeat timeout/{IDLE_TIMEOUT_SECONDS:.0f}s, empty lobby expiry/{EMPTY_LOBBY_TIMEOUT_SECONDS:.0f}s"
    )
    app.run(ip=HOST, port=PORT)
