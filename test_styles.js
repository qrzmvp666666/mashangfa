
const fs = require("fs");
let code = fs.readFileSync("app/admin/index.tsx", "utf8");

const styleCode = `    configSaveButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

    statusOption: {
      flex: 1,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: "#d1d5db",
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb"
    },
    statusOptionActive: {
      borderColor: "#ef4444",
      backgroundColor: "#fef2f2"
    },
    statusOptionText: {
      fontSize: 14,
      color: "#4b5563"
    },
    statusOptionTextActive: {
      color: "#ef4444",
      fontWeight: "700"
    },`;

// Fix missing comma or spacing issues using regex
code = code.replace(/    configSaveButtonText: \{ color: "\#fff", fontWeight: "600", fontSize: 14 \},?/, styleCode);

fs.writeFileSync("app/admin/index.tsx", code, "utf8");
console.log("Styles fixed with regex");

