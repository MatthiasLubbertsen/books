# books

Tracks which of your books are at school vs. at home, so you can move them
between the two lists when they actually move.

Anyone can view the lists. Adding, moving, and deleting books requires the
6-digit PIN.

## Run

```
docker compose up -d
```

Set your own PIN before deploying anywhere real (`PIN` in `docker-compose.yml`,
must be exactly 6 digits). Data is stored as JSON in a Docker volume.

Runs on port `8312`.
