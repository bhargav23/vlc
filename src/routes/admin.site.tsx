import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  SITE_SETTING_KEYS,
  useSiteSetting,
  DEFAULT_HERO_FIT,
  DEFAULT_HERO_POSITION,
  type HeroFit,
} from "@/lib/site-settings";
import { Upload, X, Crop, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/site")({ component: AdminSite });

function parsePosition(raw: string | null | undefined): { x: number; y: number } {
  const src = raw || DEFAULT_HERO_POSITION;
  const parts = src.split(/\s+/);
  const x = parseFloat(parts[0]);
  const y = parseFloat(parts[1] ?? parts[0]);
  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50,
  };
}

function AdminSite() {
  const qc = useQueryClient();
  const { data: heroUrl } = useSiteSetting(SITE_SETTING_KEYS.heroImage);
  const { data: savedFit } = useSiteSetting(SITE_SETTING_KEYS.heroFit);
  const { data: savedPos } = useSiteSetting(SITE_SETTING_KEYS.heroPosition);

  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fit, setFit] = useState<HeroFit>(DEFAULT_HERO_FIT);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state from saved settings whenever they change and there's nothing pending.
  useEffect(() => {
    setFit(savedFit === "contain" ? "contain" : DEFAULT_HERO_FIT);
    setPos(parsePosition(savedPos));
  }, [savedFit, savedPos]);

  const activeImage = previewUrl || heroUrl || null;

  const pathFromPublicUrl = (url: string | null | undefined) => {
    if (!url) return null;
    const marker = "/product-images/";
    const i = url.indexOf(marker);
    return i === -1 ? null : url.slice(i + marker.length);
  };

  const saveValue = async (key: string, value: string | null) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value }, { onConflict: "key" });
    if (error) {
      console.error("[admin.site] save:", error);
      toast.error("Could not save. Please try again.");
      return false;
    }
    qc.invalidateQueries({ queryKey: ["site_settings", key] });
    return true;
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please pick an image file");
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setPendingFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const clearPending = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Restore saved fit/position
    setFit(savedFit === "contain" ? "contain" : DEFAULT_HERO_FIT);
    setPos(parsePosition(savedPos));
  };

  const positionStr = useMemo(() => `${Math.round(pos.x)}% ${Math.round(pos.y)}%`, [pos]);

  const persistFitAndPosition = async () => {
    const okFit = await saveValue(SITE_SETTING_KEYS.heroFit, fit);
    const okPos = await saveValue(SITE_SETTING_KEYS.heroPosition, positionStr);
    return okFit && okPos;
  };

  const onSaveAdjustmentsOnly = async () => {
    const ok = await persistFitAndPosition();
    if (ok) toast.success("Hero adjustments saved");
  };

  const onUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    const ext = pendingFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `site/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, pendingFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: pendingFile.type,
    });
    if (error) {
      console.error("[admin.site] upload:", error);
      setUploading(false);
      return toast.error("Upload failed. Please try again.");
    }
    const prev = pathFromPublicUrl(heroUrl);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    const ok = await saveValue(SITE_SETTING_KEYS.heroImage, data.publicUrl);
    await persistFitAndPosition();
    if (ok && prev && prev.startsWith("site/")) {
      const { error: delErr } = await supabase.storage.from("product-images").remove([prev]);
      if (delErr) console.error("[admin.site] remove prev:", delErr);
    }
    setUploading(false);
    if (ok) {
      toast.success("Hero image updated");
      clearPending();
    }
  };

  const onRemoveHero = async () => {
    const prev = pathFromPublicUrl(heroUrl);
    const ok = await saveValue(SITE_SETTING_KEYS.heroImage, null);
    if (ok && prev && prev.startsWith("site/")) {
      await supabase.storage.from("product-images").remove([prev]);
    }
    if (ok) toast.success("Reverted to default hero image");
  };

  const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  };

  const hasAdjustmentChanges =
    !previewUrl &&
    heroUrl &&
    (fit !== (savedFit === "contain" ? "contain" : DEFAULT_HERO_FIT) ||
      positionStr !== (savedPos || DEFAULT_HERO_POSITION));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold mb-6">Site settings</h1>

      <div className="rounded-2xl border border-border bg-card p-5">
        <Label className="text-base font-semibold">Homepage hero image</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Upload, choose how it fits, and tap the preview to set the focal point.
        </p>

        {/* Fit controls */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Fit</p>
          <div className="inline-flex rounded-full border border-border p-1 bg-secondary/40">
            <button
              type="button"
              onClick={() => setFit("cover")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                fit === "cover" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Crop className="h-3.5 w-3.5" /> Fill (crop)
            </button>
            <button
              type="button"
              onClick={() => setFit("contain")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                fit === "contain" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" /> Fit (show all)
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {fit === "cover"
              ? "Fills the frame and crops the edges. Tap the preview to choose what stays in view."
              : "Shows the whole image with padding around it (no cropping)."}
          </p>
        </div>

        {/* Previews — mobile + desktop frames */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {previewUrl ? "Preview (not saved yet)" : "Current hero preview"}
          </p>

          {activeImage ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              {/* Desktop frame */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Desktop (5:4)</span>
                <div
                  onClick={fit === "cover" ? handleFocalClick : undefined}
                  className={cn(
                    "relative aspect-[5/4] rounded-2xl overflow-hidden bg-secondary/60 ring-1",
                    previewUrl ? "ring-primary/30" : "ring-border",
                    fit === "cover" && "cursor-crosshair",
                  )}
                >
                  <img
                    src={activeImage}
                    alt="Hero preview"
                    className="h-full w-full select-none pointer-events-none"
                    style={{ objectFit: fit, objectPosition: positionStr }}
                    draggable={false}
                  />
                  {fit === "cover" && (
                    <div
                      className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white shadow-md pointer-events-none"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>

              {/* Mobile frame */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Mobile (5:4)</span>
                <div
                  onClick={fit === "cover" ? handleFocalClick : undefined}
                  className={cn(
                    "relative aspect-[5/4] w-40 rounded-2xl overflow-hidden bg-secondary/60 ring-1",
                    previewUrl ? "ring-primary/30" : "ring-border",
                    fit === "cover" && "cursor-crosshair",
                  )}
                >
                  <img
                    src={activeImage}
                    alt="Hero preview (mobile)"
                    className="h-full w-full select-none pointer-events-none"
                    style={{ objectFit: fit, objectPosition: positionStr }}
                    draggable={false}
                  />
                  {fit === "cover" && (
                    <div
                      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white shadow-md pointer-events-none"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[5/4] max-w-md rounded-2xl bg-secondary/60 grid place-items-center ring-1 ring-border">
              <span className="text-sm text-muted-foreground">Using default image</span>
            </div>
          )}

          {/* Focal-point sliders (fine control) */}
          {activeImage && fit === "cover" && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3 max-w-md">
              <label className="flex items-center gap-2 text-xs">
                <span className="w-10 text-muted-foreground font-semibold">X {Math.round(pos.x)}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pos.x}
                  onChange={(e) => setPos((p) => ({ ...p, x: Number(e.target.value) }))}
                  className="flex-1"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <span className="w-10 text-muted-foreground font-semibold">Y {Math.round(pos.y)}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pos.y}
                  onChange={(e) => setPos((p) => ({ ...p, y: Number(e.target.value) }))}
                  className="flex-1"
                />
              </label>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {previewUrl && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void onUpload()} disabled={uploading} className="gap-2">
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Save as hero"}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearPending} disabled={uploading} className="gap-1">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        )}

        {hasAdjustmentChanges && (
          <div className="mt-5">
            <Button onClick={() => void onSaveAdjustmentsOnly()}>Save adjustments</Button>
          </div>
        )}

        {/* File input */}
        <div className="mt-6 flex flex-col gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={onFileChange}
          />
          {heroUrl && !previewUrl && (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => void onRemoveHero()}>
              Revert to default
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
