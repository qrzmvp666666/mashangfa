
const fs = require("fs");
let code = fs.readFileSync("lib/adminService.ts", "utf8");

let startIdx = code.indexOf(`export async function deleteAdminRecommendation(id: number): Promise<ServiceResult<null>> {`);
let endIdx = code.indexOf(`if (error) {`, startIdx);

if (startIdx > -1 && endIdx > -1) {
    let before = code.substring(0, startIdx);
    let after = code.substring(endIdx);
    
    let newLogic = `export async function deleteAdminRecommendation(id: number): Promise<ServiceResult<null>> {
  try {
    const { data: item } = await supabase.from("tiandi_recommendations").select("issue_no").eq("id", id).single();
    if (item && item.issue_no) {
      await supabase.from("lottery_results").update({ special_animal: null, special_num: null }).eq("issue_no", item.issue_no);
    }
    const { error } = await supabase.from("tiandi_recommendations").update({ recommendation_content: null, is_correct_override: null }).eq("id", id);
    `;

    fs.writeFileSync("lib/adminService.ts", before + newLogic + after, "utf8");
    console.log("Success");
} else {
    console.log("Not found indexes");
}

