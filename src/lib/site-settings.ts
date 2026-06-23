import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SITE_SETTING_KEYS = {
  heroImage: "hero_image_url",
  heroFit: "hero_image_fit",
  heroPosition: "hero_image_position",
} as const;

export type HeroFit = "cover" | "contain";
export const DEFAULT_HERO_FIT: HeroFit = "cover";
export const DEFAULT_HERO_POSITION = "50% 50%";

export async function fetchSiteSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("[site-settings] fetch:", error);
    return null;
  }
  return data?.value ?? null;
}

export function useSiteSetting(key: string) {
  return useQuery({
    queryKey: ["site_settings", key],
    queryFn: () => fetchSiteSetting(key),
    staleTime: 60_000,
  });
}
