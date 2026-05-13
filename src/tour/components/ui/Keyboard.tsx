"use client";

import { useEffect } from "react";
import { useAppStore } from "@tour/lib/store";

export function Keyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const s = useAppStore.getState();
      if (e.key === " " && s.mode === "tour") {
        e.preventDefault();
        s.togglePlay();
      } else if (e.key === "ArrowRight" && s.mode === "tour") {
        e.preventDefault();
        s.nextStop();
      } else if (e.key === "ArrowLeft" && s.mode === "tour") {
        e.preventDefault();
        s.prevStop();
      } else if (e.key === "Escape") {
        if (s.detailOpen) s.closeDetail();
      } else if (e.key.toLowerCase() === "f") {
        s.setMode(s.mode === "tour" ? "free" : "tour");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
