# Bascule des noms techniques `medisync` → `etepea`

Le dépôt nomme désormais la base `etepea`, le conteneur `etepea-postgres` et le réseau `etepea-internal`.
Une base existante n'est pas renommée par un déploiement : la renommer à la main, une fois.

## Production (Dokploy)

1. Arrêter `back` et `postgres-backup` (ils tiennent des connexions sur `medisync`).
2. Depuis le terminal du conteneur `postgres`, connecté à la base `postgres` (pas à `medisync`) :

   ```bash
   psql -U postgres -d postgres -c "SELECT pid, application_name FROM pg_stat_activity WHERE datname = 'medisync';"
   psql -U postgres -d postgres -c "ALTER DATABASE medisync RENAME TO etepea;"
   ```

   La première requête doit être vide, sinon `ALTER DATABASE` échoue.
3. Dans les variables d'environnement Dokploy :
   - `DATABASE_URL` : remplacer `/medisync?` par `/etepea?` (hôte et identifiants inchangés) ;
   - `POSTGRES_DB_NAME=etepea` (utilisé par le healthcheck et la sauvegarde quotidienne) ;
   - `APP_IMAGE_NAME=etepea` si on veut aussi renommer les images.
4. Redéployer, puis vérifier `GET /health` et une connexion dans l'application.

Retour arrière : `ALTER DATABASE etepea RENAME TO medisync;` et remettre les deux variables.

Les sauvegardes déjà prises restent sous l'ancien nom ; `restore-db-dump.sh` les restaure dans la base
désignée par `DB_NAME`, quel que soit le nom d'origine.

## Machine de développement

- `deploy/.env` local : `POSTGRES_DB_NAME=etepea`. Garder `COMPOSE_PROJECT_NAME='medisync'` : le volume
  de données s'appelle `medisync_postgres`, changer le nom de projet ferait démarrer sur un volume vide.
- Le conteneur garde le nom `medisync-postgres` tant que `APP_IMAGE_NAME=medisync` ; d'ici là, passer
  `CONTAINER=medisync-postgres` à `restore-db-dump.sh`.
- Bases renommées par `ALTER DATABASE … RENAME` : `etepea`, `etepea_test`, `etepea_demo`, et chaque
  base e2e de worktree en `etepea_test_<suffixe>` (le garde-fou de `back/src/test/e2e/setup/db.ts`
  refuse l'ancien nom). Mettre à jour `DATABASE_URL` dans `back/.env` et `back/.env.test.local`.
