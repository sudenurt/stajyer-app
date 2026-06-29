import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eyfbafijwagtajezqmnq.supabase.co";
const supabaseKey = "sb_publishable_5RxYk-5tsbUD7H-v6w_hOw_UdPBdgW9";

export const supabase = createClient(supabaseUrl, supabaseKey);