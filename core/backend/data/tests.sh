# API-Call
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
echo

#User Anlegen:
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"geheim","email":"alice@example.com"}'


# Login Testen:
curl -i -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"geheim"}'


# User abrufen:
curl -i http://localhost:3000/api/users/1

# User mit ID 1 löschen
curl -i -X DELETE http://localhost:3000/api/users/1
# → HTTP/1.1 204 No Content

# Löschen eines nicht existierenden Users
curl -i -X DELETE http://localhost:3000/api/users/999
# → HTTP/1.1 404 Not Found
#    {"error":"User not found"}
