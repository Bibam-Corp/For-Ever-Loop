import requests


# ============================================================
# CONFIGURATION
# ============================================================

GITHUB_API = "https://api.github.com"

# Repositories à surveiller
# Format : "propriétaire/repository"
REPOSITORIES = [
    "Bibam-Corp/For-Ever-Loop"
]


# Nombre maximum de commits récupérés à chaque vérification
MAX_COMMITS = 10

import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_REPOS = os.getenv(
    "GITHUB_REPOS",
    "Bibam-Corp/For-Ever-Loop"
)

REPOSITORIES = [
    repo.strip()
    for repo in GITHUB_REPOS.split(",")
    if repo.strip()
]

# ============================================================
# ÉTAT DES COMMITS
# ============================================================

last_commits = {}


# ============================================================
# RÉCUPÉRER LES COMMITS
# ============================================================

def get_commits(repository):
    """
    Récupère les derniers commits d'un repository GitHub.
    """

    url = f"{GITHUB_API}/repos/{repository}/commits"

    try:
        response = requests.get(
            url,
            params={
                "per_page": MAX_COMMITS
            },
            timeout=10
        )

        if response.status_code != 200:
            print(
                f"❌ GitHub : erreur {response.status_code} "
                f"pour {repository}"
            )

            return []

        return response.json()

    except requests.RequestException as error:
        print(
            f"❌ Impossible de contacter GitHub "
            f"pour {repository} : {error}"
        )

        return []


# ============================================================
# DÉTECTER LES NOUVEAUX COMMITS
# ============================================================

def check_repository(repository):
    """
    Vérifie un repository et retourne les nouveaux commits.
    """

    commits = get_commits(repository)

    if not commits:
        return []

    current_commit_ids = [
        commit["sha"]
        for commit in commits
    ]

    # Première vérification
    if repository not in last_commits:

        # On mémorise le dernier commit sans
        # envoyer toute l'historique comme notification.
        last_commits[repository] = current_commit_ids[0]

        print(
            f"📌 Initialisation de {repository} : "
            f"{current_commit_ids[0][:7]}"
        )

        return []

    last_commit = last_commits[repository]

    new_commits = []

    for commit in commits:

        sha = commit["sha"]

        if sha == last_commit:
            break

        new_commits.append(commit)

    # Le commit le plus récent devient notre référence
    last_commits[repository] = current_commit_ids[0]

    return new_commits


# ============================================================
# VÉRIFIER TOUS LES REPOSITORIES
# ============================================================

def check_all_repositories():
    """
    Vérifie tous les repositories configurés.

    Retourne une liste contenant les nouveaux commits.
    """

    all_new_commits = []

    for repository in REPOSITORIES:

        print(f"🔍 Vérification de {repository}...")

        new_commits = check_repository(repository)

        for commit in new_commits:

            all_new_commits.append({
                "repository": repository,
                "commit": commit
            })

    return all_new_commits


# ============================================================
# FORMATER UN COMMIT
# ============================================================

def format_commit(commit_data):
    """
    Transforme les informations GitHub en texte utilisable
    par Discord.
    """

    repository = commit_data["repository"]
    commit = commit_data["commit"]

    sha = commit["sha"]

    message = commit["commit"]["message"]
    message = message.split("\n")[0]

    author = commit["commit"]["author"]["name"]

    url = (
        f"https://github.com/"
        f"{repository}/commit/{sha}"
    )

    return {
        "repository": repository,
        "sha": sha,
        "short_sha": sha[:7],
        "message": message,
        "author": author,
        "url": url
    }


# ============================================================
# TEST MANUEL
# ============================================================

if __name__ == "__main__":

    print("🔍 Vérification GitHub...")

    commits = check_all_repositories()

    if not commits:

        print("ℹ️ Aucun nouveau commit.")

    else:

        for commit in commits:

            data = format_commit(commit)

            print()
            print("📦 Nouveau commit !")
            print(f"Repository : {data['repository']}")
            print(f"Auteur     : {data['author']}")
            print(f"Message    : {data['message']}")
            print(f"Commit     : {data['short_sha']}")
            print(f"URL        : {data['url']}")