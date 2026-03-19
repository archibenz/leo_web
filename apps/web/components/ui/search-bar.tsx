"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  suggestions?: string[]
}

const SearchBar = ({ placeholder = "Search...", onSearch, suggestions: externalSuggestions }: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)

  const allSuggestions = externalSuggestions || []

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value.trim()) {
      setSuggestions(allSuggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())))
    } else {
      setSuggestions([])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery)
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 600)
    }
  }

  useEffect(() => {
    if (isFocused && inputRef.current) inputRef.current.focus()
  }, [isFocused])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const searchIconVariants = {
    initial: { scale: 1 },
    animate: {
      rotate: isAnimating ? [0, -15, 15, -10, 10, 0] : 0,
      scale: isAnimating ? [1, 1.3, 1] : 1,
      transition: { duration: 0.6, ease: "easeInOut" as const },
    },
  }

  // Responsive widths
  const collapsedWidth = isMobile ? "36px" : "140px"
  const expandedWidth = isMobile ? "180px" : "220px"

  return (
    <div ref={containerRef} className="relative">
      <motion.form
        onSubmit={handleSubmit}
        className="relative flex items-center"
        initial={{ width: collapsedWidth }}
        animate={{ width: isFocused ? expandedWidth : collapsedWidth }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        <div
          className={cn(
            "flex items-center w-full rounded-full relative overflow-hidden transition-all duration-300",
            isFocused
              ? "bg-ink/[0.06] border border-ink/[0.08]"
              : isMobile
                ? "border-none"
                : "border border-ink/[0.06] bg-ink/[0.03]"
          )}
        >
          {/* Subtle shimmer on focus */}
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.04, 0.08, 0.04, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ background: "radial-gradient(circle at 50% 0%, rgba(212,165,116,0.25) 0%, transparent 70%)" }}
            />
          )}

          <motion.div
            className={cn("flex-shrink-0", isMobile && !isFocused ? "pl-2" : "pl-3")}
            variants={searchIconVariants}
            initial="initial"
            animate="animate"
            onClick={() => { if (isMobile && !isFocused) setIsFocused(true) }}
          >
            <Search
              size={isMobile && !isFocused ? 17 : 15}
              strokeWidth={isFocused ? 2 : 1.5}
              className={cn(
                "transition-all duration-300",
                isMobile && !isFocused
                  ? "text-ink/55 cursor-pointer"
                  : isAnimating ? "text-accent" : isFocused ? "text-accent/60" : "text-ink/25"
              )}
            />
          </motion.div>

          {/* On mobile collapsed: hide input. On mobile focused or desktop: show input */}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isFocused && suggestions.length > 0}
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => setIsFocused(true)}
            className={cn(
              "focus-bare w-full py-2 pr-3 bg-transparent border-none outline-none placeholder:text-ink/35 text-[13px] text-ink/70 tracking-wide caret-ink/40",
              isMobile && !isFocused ? "opacity-0 w-0 p-0" : "pl-2 opacity-100"
            )}
            tabIndex={isMobile && !isFocused ? -1 : 0}
          />
        </div>
      </motion.form>

      {/* Suggestions */}
      <AnimatePresence>
        {isFocused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 overflow-hidden rounded-xl border border-ink/8 right-0"
            style={{
              background: "linear-gradient(160deg, rgba(30,18,13,0.98), rgba(43,23,17,0.97))",
              backdropFilter: "blur(40px)",
              maxHeight: "240px",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              minWidth: "200px",
            }}
          >
            <div className="p-1.5" role="listbox">
              {suggestions.map((suggestion, i) => (
                <motion.div
                  key={suggestion}
                  role="option"
                  aria-selected={false}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: i * 0.05 }}
                  onClick={() => { setSearchQuery(suggestion); if (onSearch) onSearch(suggestion); setIsFocused(false) }}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg text-[13px] text-ink/50 transition-colors hover:bg-ink/[0.06] hover:text-accent"
                >
                  <Search size={12} className="text-ink/20 flex-shrink-0" />
                  <span>{suggestion}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { SearchBar }
