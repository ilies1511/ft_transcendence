const { warn } = require("console");

fetch("http://localhost:3000/api/data")
  .then(res => res.json())
  .then(data => {
    document.getElementById("data").textContent = data.message;
  })
  .catch(err => {
    console.error("Error fetching data:", err);
  });
