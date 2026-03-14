
import { supabase } from "./lib/supabase";

async function restore() {
    const { data: latest } = await supabase.from("tiandi_recommendations").select("title, description, issue_date").eq("issue_no", "074期").single();
    
    const payload = {
        issue_no: "073期",
        issue_date: latest?.issue_date || "2024-03-14",
        title: latest?.title || null,
        description: latest?.description || null,
        recommendation_content: null,
        is_visible: true
    };
    const { data, error } = await supabase.from("tiandi_recommendations").insert(payload);
    console.log("Restored 073", data, error);
}

restore();

