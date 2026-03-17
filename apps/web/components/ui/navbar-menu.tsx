"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const transition = {
  type: "spring" as const,
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  href,
  children,
}: {
  setActive: (item: string) => void;
  active: string | null;
  item: string;
  href?: string;
  children?: React.ReactNode;
}) => {
  const labelClass = `cursor-pointer text-[15px] leading-none font-display font-medium uppercase tracking-[0.12em] transition-colors duration-200 ${
    active === item ? "text-accent" : "text-ink/70 hover:text-ink"
  }`;

  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      {href ? (
        <Link href={href} className={labelClass}>
          {item}
        </Link>
      ) : (
        <motion.p transition={{ duration: 0.3 }} className={labelClass}>
          {item}
        </motion.p>
      )}
      <AnimatePresence>
        {active === item && children && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={transition}
          >
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-5">
              <motion.div
                transition={transition}
                layoutId="active"
                className="rounded-2xl overflow-hidden border border-[#D4A574]/[0.08]"
                style={{
                  background:
                    "linear-gradient(165deg, rgba(26, 16, 12, 0.98) 0%, rgba(36, 21, 16, 0.97) 50%, rgba(30, 18, 13, 0.98) 100%)",
                  backdropFilter: "blur(40px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.2)",
                  boxShadow:
                    "0 0 0 1px rgba(212, 165, 116, 0.05), 0 25px 60px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(242, 230, 216, 0.04)",
                }}
              >
                <motion.div layout className="w-max h-full">
                  {children}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative flex items-baseline justify-center space-x-8 lg:space-x-10"
    >
      {children}
    </nav>
  );
};

export const HoveredLink = ({
  children,
  ...rest
}: React.ComponentProps<typeof Link>) => {
  return (
    <Link
      {...rest}
      className="block text-[17px] leading-relaxed text-ink/50 transition-colors duration-200 hover:text-accent"
    >
      {children}
    </Link>
  );
};

export const CategoryCard = ({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description?: string;
}) => {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-1 rounded-xl px-5 py-4 transition-all duration-300 hover:bg-[#D4A574]/[0.06]"
    >
      {/* Hover accent line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0 w-[2px] rounded-full bg-[#D4A574]/40 transition-all duration-300 group-hover:h-[60%]" />

      <span className="font-display text-[18px] font-semibold tracking-[0.02em] text-ink/80 transition-colors duration-200 group-hover:text-[#D4A574]">
        {label}
      </span>
      {description && (
        <span className="font-accent text-[16px] text-ink/35 leading-snug transition-colors duration-200 group-hover:text-ink/50">
          {description}
        </span>
      )}
    </Link>
  );
};

export const CollectionCard = ({
  href,
  title,
  subtitle,
  imageSrc,
  items,
}: {
  href: string;
  title: string;
  subtitle?: string;
  imageSrc?: string;
  items: { label: string; href: string }[];
}) => {
  return (
    <div className="flex flex-col gap-4">
      <Link href={href} className="group relative overflow-hidden rounded-xl">
        <div className="aspect-[2/3] w-full bg-paperMuted">
          {imageSrc && (
            <img
              src={imageSrc}
              alt={title}
              className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
            />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#110a07]/90 via-[#110a07]/20 to-transparent transition-opacity duration-500" />

          {/* Accent border glow on hover */}
          <div className="absolute inset-0 rounded-xl border border-transparent transition-all duration-500 group-hover:border-[#D4A574]/20 group-hover:shadow-[inset_0_0_20px_rgba(212,165,116,0.06)]" />

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="font-display text-[19px] font-semibold uppercase tracking-[0.08em] text-ink/90 transition-colors duration-300 group-hover:text-[#D4A574]">
              {title}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[15px] uppercase tracking-[0.08em] text-ink/40">{subtitle}</p>
            )}
          </div>
        </div>
      </Link>
      <div className="flex flex-col gap-1.5 px-0.5">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group/item flex items-center gap-2 py-1 text-[17px] font-display text-ink/40 transition-colors duration-200 hover:text-[#D4A574]"
          >
            <span className="inline-block h-px w-0 bg-[#D4A574]/50 transition-all duration-300 group-hover/item:w-3" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};
