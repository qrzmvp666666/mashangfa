
const fs = require("fs");
let code = fs.readFileSync("app/admin/index.tsx", "utf8");

let targetStr = "const availableIssues = items\n      .filter((item) => Boolean(item.description?.trim()))\n      .map((item) => item.issue_no.replace(\"期\", \"\"));";
let fallbackStr = "const availableIssues = items\n      .map((item) => item.issue_no.replace(\"期\", \"\"));";

if(code.indexOf("Boolean(item.description?.trim())") > -1) {
    code = code.replace(/const availableIssues = items\s*\.filter\(\(item\) => Boolean\(item\.description\?\.trim\(\)\)\)\s*\.map\(\(item\) => item\.issue_no\.replace\("期", ""\)\);/, fallbackStr);
    fs.writeFileSync("app/admin/index.tsx", code, "utf8");
    console.log("Filter removed!");
} else {
    console.log("Could not find filter string");
}


