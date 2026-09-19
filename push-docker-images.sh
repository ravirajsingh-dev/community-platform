# Usage: ./push-docker-images.sh 1.0.0
echo "Build: $1"
echo "Starting pushing docker images..."

cd "$(dirname "$0")"

REGISTRY="${CONTAINER_REGISTRY:-registry.example.com/community-platform/}"
HOST="${DEPLOY_HOST:-user@your-server}"

echo "docker save -o ./community-server.tar ${REGISTRY}server:$1"
docker save -o ./community-server.tar "${REGISTRY}server:$1"

echo "docker save -o ./community-client.tar ${REGISTRY}client:$1"
docker save -o ./community-client.tar "${REGISTRY}client:$1"

echo "docker save -o ./community-admin.tar ${REGISTRY}admin:$1"
docker save -o ./community-admin.tar "${REGISTRY}admin:$1"

printf "\n\n"

echo "scp community-server.tar ${HOST}:~/"
scp community-server.tar "${HOST}:~/"

echo "scp community-client.tar ${HOST}:~/"
scp community-client.tar "${HOST}:~/"

echo "scp community-admin.tar ${HOST}:~/"
scp community-admin.tar "${HOST}:~/"

rm ./community-server.tar
rm ./community-client.tar
rm ./community-admin.tar
