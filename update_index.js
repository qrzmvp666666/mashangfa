
const fs = require("fs");
let code = fs.readFileSync("app/admin/index.tsx", "utf8");

const uiCode = `              <View style={{ marginBottom: 24 }}>
                <Text style={styles.configLabel}>是否中奖 (覆盖计算)</Text>
                <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.statusOption, isCorrectOverride === null && styles.statusOptionActive]}
                    onPress={() => setIsCorrectOverride(null)}
                  >
                    <Text style={[styles.statusOptionText, isCorrectOverride === null && styles.statusOptionTextActive]}>自动判断</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusOption, isCorrectOverride === true && styles.statusOptionActive]}
                    onPress={() => setIsCorrectOverride(true)}
                  >
                    <Text style={[styles.statusOptionText, isCorrectOverride === true && styles.statusOptionTextActive]}>已中奖</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusOption, isCorrectOverride === false && styles.statusOptionActive]}
                    onPress={() => setIsCorrectOverride(false)}
                  >
                    <Text style={[styles.statusOptionText, isCorrectOverride === false && styles.statusOptionTextActive]}>未中奖</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalFooter}>`;

code = code.replace("              <View style={styles.modalFooter}>", uiCode);

const styleCode = `    configSaveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    statusOption: {
      flex: 1,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: "#d1d5db",
      borderRadius: 8,
      alignItems: "center",
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
      fontWeight: "600"
    },`;

code = code.replace(`    configSaveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },`, styleCode);

fs.writeFileSync("app/admin/index.tsx", code, "utf8");

