import os
import json

from dotenv import load_dotenv

load_dotenv()
import discord
from discord.ext import commands, tasks


# ============================================================
# CONFIGURATION
# ============================================================

TOKEN = os.getenv("DISCORD_TOKEN")

CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL"))  # minutes

CONFIG_FILE = "config.json"

TOKEN = os.getenv("DISCORD_TOKEN")
CHANNEL_ID = int(os.getenv("DISCORD_CHANNEL_ID", "0"))
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", "600"))

# ============================================================
# CONFIGURATION DU SALON
# ============================================================

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {}

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as file:
            return json.load(file)

    except Exception:
        return {}


def save_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as file:
        json.dump(config, file, indent=4)


config = load_config()


def get_notification_channel_id():
    return config.get("notification_channel")


def set_notification_channel(channel_id):
    config["notification_channel"] = channel_id
    save_config(config)


# ============================================================
# BOT
# ============================================================

intents = discord.Intents.default()

bot = commands.Bot(
    command_prefix="!",
    intents=intents
)


# ============================================================
# BOT PRÊT
# ============================================================

@bot.event
async def on_ready():
    print(f"🤖 Connecté en tant que {bot.user}")
    print(f"ID : {bot.user.id}")

    try:
        synced = await bot.tree.sync()
        print(f"✅ {len(synced)} commande(s) synchronisée(s).")

    except Exception as error:
        print(f"❌ Erreur synchronisation : {error}")

    if not monitor.is_running():
        monitor.start()


# ============================================================
# /PING
# ============================================================

@bot.tree.command(
    name="ping",
    description="Vérifie si le bot fonctionne."
)
async def ping(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)

    await interaction.response.send_message(
        f"🏓 Pong ! `{latency} ms`"
    )


# ============================================================
# /SET
# ============================================================

@bot.tree.command(
    name="set",
    description="Définit ce salon comme salon des notifications."
)
async def set_channel(interaction: discord.Interaction):
    channel = interaction.channel

    if channel is None:
        await interaction.response.send_message(
            "❌ Impossible de déterminer le salon.",
            ephemeral=True
        )
        return

    set_notification_channel(channel.id)

    await interaction.response.send_message(
        f"✅ Ce salon est maintenant le **seul salon de notifications**.\n"
        f"📢 Les notifications seront envoyées ici : {channel.mention}"
    )


# ============================================================
# /STATUS
# ============================================================

@bot.tree.command(
    name="status",
    description="Affiche le salon actuellement configuré."
)
async def status(interaction: discord.Interaction):
    channel_id = get_notification_channel_id()

    if not channel_id:
        await interaction.response.send_message(
            "⚠️ Aucun salon de notification n'est configuré.",
            ephemeral=True
        )
        return

    channel = bot.get_channel(channel_id)

    if channel is None:
        await interaction.response.send_message(
            "⚠️ Le salon configuré est introuvable.",
            ephemeral=True
        )
        return

    await interaction.response.send_message(
        f"📢 Salon de notifications actuel : {channel.mention}",
        ephemeral=True
    )


# ============================================================
# MONITORING
# ============================================================

@tasks.loop(minutes=CHECK_INTERVAL)
async def monitor():
    print("🔍 Vérification des services...")

    channel_id = get_notification_channel_id()

    if not channel_id:
        print("⚠️ Aucun salon de notification configuré.")
        return

    channel = bot.get_channel(channel_id)

    if channel is None:
        print("❌ Salon de notification introuvable.")
        return

    print(f"✅ Salon de notification : #{channel.name}")

    # ========================================================
    # PLUS TARD :
    #
    # - Vérification GitHub
    # - Vérification WSS Render
    # - Envoi des notifications
    # ========================================================


@monitor.before_loop
async def before_monitor():
    await bot.wait_until_ready()


# ============================================================
# DÉMARRAGE
# ============================================================

if not TOKEN:
    raise RuntimeError(
        "❌ La variable d'environnement DISCORD_TOKEN est absente."
    )


bot.run(TOKEN)