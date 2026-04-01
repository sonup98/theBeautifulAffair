async function checkEndpoints() {
  try {
    const health = await fetch("http://localhost:3000/api/health").then(r => r.json());
    console.log("Health:", health);
    
    const storage = await fetch("http://localhost:3000/api/debug/storage").then(r => r.json());
    console.log("Storage Status:", JSON.stringify(storage, null, 2));
  } catch (error) {
    console.error("Error checking endpoints:", error.message);
  }
}

checkEndpoints();
