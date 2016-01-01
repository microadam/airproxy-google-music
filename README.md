## Quickstart

    docker run -d -e "EMAIL=xxx" -e "PASSWORD=xxx" -e "AIRPROXY_HOST=xxx.xxx.xxx.xx" -e "AIRPROXY_PORT=5000" -p 7637:7637 --name airproxy-google-music --restart=always microadam/airproxy-google-music
