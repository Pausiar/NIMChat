"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Brush, MessageCircle, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppMode = "chat" | "design" | "code";

interface DockItem {
  id: AppMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  disabled?: boolean;
}

const dockItems: DockItem[] = [
  {
    id: "chat",
    name: "Chat",
    description: "Conversación NIM",
    icon: <MessageCircle className="h-5 w-5" />,
    color: "bg-gradient-to-br from-emerald-400 to-cyan-500",
  },
  {
    id: "design",
    name: "Design",
    description: "UI con preview",
    icon: <Brush className="h-5 w-5" />,
    color: "bg-gradient-to-br from-orange-400 to-rose-500",
  },
  {
    id: "code",
    name: "Code",
    description: "Próximamente",
    icon: <Terminal className="h-5 w-5" />,
    color: "bg-gradient-to-br from-zinc-500 to-zinc-800",
    disabled: true,
  },
];

interface ModeDockProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeDock({ activeMode, onModeChange }: ModeDockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <motion.div
        onMouseMove={(event) => mouseX.set(event.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="pointer-events-auto flex h-[76px] items-end gap-3 rounded-3xl border border-white/15 bg-zinc-950/70 px-3 pb-3 shadow-2xl shadow-black/40 backdrop-blur-xl"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {dockItems.map((item) => (
          <DockIcon
            key={item.id}
            item={item}
            active={item.id === activeMode}
            mouseX={mouseX}
            onSelect={() => onModeChange(item.id)}
          />
        ))}
      </motion.div>
    </div>
  );
}

function DockIcon({
  item,
  active,
  mouseX,
  onSelect,
}: {
  item: DockItem;
  active: boolean;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (value) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value - bounds.x - bounds.width / 2;
  });
  const widthSync = useTransform(distance, [-150, 0, 150], [48, 70, 48]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 160, damping: 15 });
  const heightSync = useTransform(distance, [-150, 0, 150], [48, 70, 48]);
  const height = useSpring(heightSync, { mass: 0.1, stiffness: 160, damping: 15 });

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width, height }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex aspect-square items-center justify-center rounded-2xl text-white outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-white/60",
        item.disabled && "opacity-75"
      )}
      whileTap={{ scale: item.disabled ? 1 : 0.95 }}
      aria-label={`Cambiar a modo ${item.name}`}
      aria-pressed={active}
    >
      <motion.span
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl shadow-lg",
          item.color,
          active && "ring-2 ring-white/70"
        )}
        animate={{ y: isHovered ? -7 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 20 }}
      >
        <motion.span animate={{ scale: isHovered ? 1.12 : 1 }}>
          {item.icon}
        </motion.span>
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent opacity-30" />
      </motion.span>

      <motion.span
        initial={{ opacity: 0, y: 8, scale: 0.88 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? -16 : 8, scale: isHovered ? 1 : 0.88 }}
        className="pointer-events-none absolute -top-12 left-1/2 min-w-max -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900/95 px-2.5 py-1.5 text-center text-xs shadow-xl backdrop-blur"
      >
        <span className="block font-medium">{item.name}</span>
        <span className="block text-[10px] text-white/50">{item.description}</span>
      </motion.span>

      {item.disabled && (
        <span className="absolute -right-2 -top-2 rounded-full border border-white/10 bg-black px-1.5 py-0.5 text-[9px] font-medium text-white/70">
          Soon
        </span>
      )}
      <span
        className={cn(
          "absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white transition-opacity",
          active ? "opacity-90" : "opacity-0"
        )}
      />
    </motion.button>
  );
}