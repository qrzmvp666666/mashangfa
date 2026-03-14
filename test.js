
const fs = require("fs");
const code = fs.readFileSync("app/admin/index.tsx", "utf8");
let result = code.indexOf("<View style={styles.modalFooter}>");
console.log("Index of modalFooter: " + result);
let slice = code.substring(result - 100, result + 50);
console.log("SURROUNDING:");
console.log(slice);

