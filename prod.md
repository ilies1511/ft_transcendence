# Run Commands:
- make prod-up
- make prod-logs

## TEST
- curl -I http://localhost/
- curl -sk --http1.1 --resolve localhost:443:127.0.0.1 https://localhost/ | head
- curl -k  --http1.1 --resolve localhost:443:127.0.0.1 https://localhost/api/health
