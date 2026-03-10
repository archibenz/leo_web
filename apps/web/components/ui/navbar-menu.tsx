"use client";
import React from "react";
import { motion } from "framer-motion";
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
  const labelClass = `cursor-pointer text-[13px] leading-none font-display font-medium uppercase tracking-[0.12em] transition-colors duration-200 ${
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
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          {active === item && children && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
              <motion.div
                transition={transition}
                layoutId="active"
                className="rounded-2xl overflow-hidden border border-ink/8"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(30, 18, 13, 0.98), rgba(43, 23, 17, 0.97))",
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  boxShadow:
                    "0 0 0 1px rgba(212, 165, 116, 0.04), 0 40px 80px rgba(0, 0, 0, 0.55), 0 0 100px rgba(212, 165, 116, 0.04)",
                }}
              >
                <motion.div layout className="w-max h-full">
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
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
      className="block text-[15px] leading-relaxed text-ink/50 transition-colors duration-200 hover:text-accent"
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
      className="group flex flex-col gap-1.5 rounded-xl px-5 py-4 transition-colors duration-200 hover:bg-ink/[0.05]"
    >
      <span className="text-[16px] font-display font-semibold text-ink/80 transition-colors group-hover:text-accent">
        {label}
      </span>
      {description && (
        <span className="text-[13px] font-display text-ink/40 leading-snug">{description}</span>
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
    <div className="flex flex-col gap-5">
      <Link href={href} className="group relative overflow-hidden rounded-xl">
        <div className="aspect-[2/3] w-full bg-paperMuted">
          {imageSrc && (
            <img
              src={imageSrc}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-paper/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-[16px] font-display font-semibold uppercase tracking-[0.1em] text-ink/90 transition-colors group-hover:text-accent">
              {title}
            </p>
            {subtitle && (
              <p className="mt-1 text-[13px] text-ink/45">{subtitle}</p>
            )}
          </div>
        </div>
      </Link>
      <div className="flex flex-col gap-2.5 px-1">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-[15px] py-0.5 font-display text-ink/45 transition-colors duration-150 hover:text-accent"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};
