const fs = require("fs");
const path = "data/radar_status.json";
const status = { last_run: new Date().toISOString() };
fs.writeFileSync(path, JSON.stringify(status, null, 2));
