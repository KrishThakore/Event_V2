"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Grid,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  LayoutGrid,
  List,
  ChevronDown,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Filter,
  Users,
  X,
  Settings,
  Ticket
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import PublicNavbar from "./PublicNavbar";
import { formatDateIST, getISTDateYYYYMMDD } from "@/lib/date";
import { formatINR, formatPrice as formatPriceCurrency } from "@/lib/currency";
import { parseEventImages } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | Date; // Allow Date since we are preserving it now
  start_time: string | Date;
  end_time: string | Date;
  location: string | null;
  price: number;
  is_paid: boolean;
  pricing_type?: 'free' | 'paid' | 'custom' | string;
  capacity: number;
  registered_count?: number;
  image_url?: string | null;
  is_registration_open?: boolean;
  show_capacity?: boolean;
  is_unlimited?: boolean;
  currency?: string;
}

interface EventsClientProps {
  initialEvents: Event[];
  totalEvents: number;
  currentPage: number;
  heroTitle?: React.ReactNode;
  heroSubtitle?: string;
  heroBadge?: string;
  heroImageUrl?: string;
}

export default function EventsClient({
  initialEvents,
  totalEvents,
  currentPage,
  heroTitle,
  heroSubtitle,
  heroBadge,
  heroImageUrl
}: EventsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const userRole = session?.user?.role ?? null;
  const [events, setEvents] = useState<Event[]>(initialEvents);

  // Sync state with URL
  const searchTerm = searchParams.get("search") ?? "";
  const activeTab = (searchParams.get("tab") as "upcoming" | "today" | "past") ?? "upcoming";
  const categoryFilter = searchParams.get("category") ?? "all";
  const monthFilter = searchParams.get("month") ?? "all";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const pageSize = 12;
  const [customPricingPrices, setCustomPricingPrices] = useState<Record<string, number[]>>({});

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === 'all' || value === '') params.delete(key);
      else params.set(key, value);
    });
    // Reset page to 1 on filter change, unless we are explicitly changing the page
    if (!updates.page) params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });

  // Auto-close registrations
  useEffect(() => {
    const autoClose = async () => {
      try {
        const resp = await fetch('/api/events/auto-close', { method: 'POST' });
        if (!resp.ok) return;
        const { closedIds } = await resp.json();
        if (closedIds?.length > 0) {
          setEvents(prev => prev.map(e => closedIds.includes(e.id) ? { ...e, is_registration_open: false } : e));
        }
      } catch { }
    };
    autoClose();
  }, []);

  // Fetch custom pricing
  useEffect(() => {
    const customEventIds = events.filter(e => e.pricing_type === 'custom').map(e => e.id).filter(Boolean);
    if (customEventIds.length === 0) return;

    (async () => {
      try {
        const resp = await fetch(`/api/events/pricing-options?ids=${customEventIds.join(',')}`);
        if (!resp.ok) return;
        const data: { event_id: string; price: number }[] = await resp.json();
        const grouped: Record<string, number[]> = {};
        data.forEach(row => {
          if (!grouped[row.event_id]) grouped[row.event_id] = [];
          grouped[row.event_id].push(Number(row.price));
        });
        setCustomPricingPrices(grouped);
      } catch { }
    })();
  }, [events]);

  const totalPages = Math.ceil(totalEvents / pageSize);
  const paginatedEvents = events;
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // GSAP Animations
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      // 1. Hero Parallax Zoom — smooth scrub
      gsap.to(".hero-bg-image", {
        scale: 1.15,
        scrollTrigger: {
          trigger: ".cinematic-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.5
        }
      });

      // 2. Rising Headlines — scrub-driven for buttery smoothness
      gsap.fromTo(".text-reveal-line",
        { y: 60, rotateX: -20, opacity: 0 },
        {
          y: 0, rotateX: 0, opacity: 1,
          duration: 2.5,
          ease: "expo.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: ".cinematic-hero",
            start: "top 85%",
            end: "center center",
            scrub: 1
          }
        }
      );

      // 3. Hero Sub-content (Badge, Description)
      gsap.fromTo(".guni-seal, .hero-content-cinema p",
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 2,
          ease: "power2.out",
          stagger: 0.25,
          scrollTrigger: {
            trigger: ".cinematic-hero",
            start: "top 75%",
            end: "center center",
            scrub: 1
          }
        }
      );

      // 4. Section Rise Effect — gentle lift
      gsap.to(".section-rise-wrapper", {
        y: -80,
        scrollTrigger: {
          trigger: ".section-rise-wrapper",
          start: "top bottom",
          end: "top 30%",
          scrub: 1.5
        }
      });
    });

    return () => ctx.revert();
  }, []);

  // Event Cards Staggered Reveal (Bidirectional)
  useEffect(() => {
    if (typeof window === "undefined" || paginatedEvents.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.to(".perspective-container", {
        y: 0,
        opacity: 1,
        duration: 2,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: ".events-grid",
          start: "top 90%",
          end: "center center",
          scrub: 0.8
        }
      });
    });

    return () => ctx.revert();
  }, [paginatedEvents]);

  const formatPrice = (event: Event) => {
    const numericPrice = Number(event.price);
    if (event.pricing_type === 'custom') {
      const prices = customPricingPrices[event.id] ?? [];
      if (prices.length === 0) return 'Custom';
      const sorted = Array.from(new Set(prices)).sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      return min === max ? formatPriceCurrency(min, event.currency || 'INR') : `${formatPriceCurrency(min, event.currency || 'INR')}–${formatPriceCurrency(max, event.currency || 'INR')}`;
    }
    return (event.is_paid && numericPrice > 0) ? formatPriceCurrency(numericPrice, event.currency || 'INR') : 'Free';
  };

  const getProgress = (registered = 0, capacity = 100) => Math.min(Math.round((registered / capacity) * 100), 100);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    card.style.setProperty('--rx', `${rotateX}deg`);
    card.style.setProperty('--ry', `${rotateY}deg`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      {/* Hero Section */}
      <section className="cinematic-hero bg-white">
        <div
          className="hero-bg-image"
          style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : {}}
        />

        {/* Cinematic dark overlay for photographic hero */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-[1]" />

        <div className="hero-content-cinema container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal-on-scroll">
            <Badge variant="outline" className="guni-seal mb-12 px-8 py-3 text-purple-300 border-purple-500/30 bg-white/10 backdrop-blur-md inline-flex items-center gap-3 rounded-full shadow-xl transition-all duration-1000 scale-90 opacity-0 [.reveal-visible_&]:scale-100 [.reveal-visible_&]:opacity-100">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-bold tracking-[0.2em] uppercase text-[11px]">{heroBadge || "Discover your unique journey"}</span>
            </Badge>
          </div>

          <h1 className="text-7xl sm:text-9xl font-black tracking-tighter mb-12 leading-[0.8] reveal-on-scroll text-white">
            {heroTitle ? (
              heroTitle
            ) : (
              <>
                <span className="text-reveal-mask mr-6">
                  <span className="text-reveal-line">Experience</span>
                </span>
                <span className="text-reveal-mask">
                  <span className="text-reveal-line">the</span>
                </span>
                <br />
                <span className="text-reveal-mask">
                  <span className="text-reveal-line text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-emerald-400" style={{ transitionDelay: '200ms' }}>Future of Events</span>
                </span>
              </>
            )}
          </h1>

          <div className="reveal-on-scroll">
            <p className="max-w-3xl mx-auto text-xl sm:text-2xl text-gray-200 font-semibold leading-relaxed mb-20 opacity-0 translate-y-10 transition-all duration-[1.5s] delay-500 [.reveal-visible_&]:opacity-100 [.reveal-visible_&]:translate-y-0">
              {heroSubtitle || `From tech launches to culture nights, ${BRAND_NAME} brings together ${BRAND_TAGLINE.toLowerCase()}.`}
            </p>
          </div>


        </div>

        {/* Cinematic Scroll Indicator */}
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 cursor-pointer group z-20"
          onClick={() => document.getElementById('events-main')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="w-[2px] h-24 bg-white/10 relative overflow-hidden rounded-full">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white animate-scroll-line" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40 group-hover:text-white transition-colors">Scroll to Discover</span>
        </div>
      </section>

      {/* Rising Content Section */}
      <div id="events-main" className="section-rise-wrapper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          {/* Filter Bar */}
          <div id="event-filters" className="relative z-20 reveal-on-scroll reveal-fade">
            <div className="bg-white/80 backdrop-blur-2xl border border-gray-200/50 p-3 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center gap-3">
              {/* Tabs */}
              <div className="flex bg-gray-100/80 p-1 rounded-2xl w-full md:w-auto">
                {(["upcoming", "today", "past"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => updateFilters({ tab, page: null })}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-[0.9rem] text-sm font-bold capitalize transition-all duration-300 ${activeTab === tab
                      ? "bg-white text-gray-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.02]"
                      : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    {tab === "today" ? "Today" : tab}
                  </button>
                ))}
              </div>

              <div className="h-10 w-px bg-gray-200 hidden md:block" />

              <div className="flex bg-gray-100/80 p-1 rounded-2xl w-full md:w-auto">
                {(["all", "free", "paid"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateFilters({ category: cat, page: null })}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-[0.9rem] text-sm font-bold capitalize transition-all duration-300 ${categoryFilter === cat
                      ? "bg-white text-gray-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.02]"
                      : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>

              <div className="h-10 w-px bg-gray-200 hidden md:block" />

              {/* Search */}
              <div className="relative flex-1 w-full flex items-center bg-gray-100/80 rounded-2xl px-4 group transition-all duration-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/20">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search event title or location..."
                  className="w-full bg-transparent border-none focus:ring-0 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-500"
                  value={searchTerm}
                  onChange={(e) => updateFilters({ search: e.target.value, page: null })}
                />
                {searchTerm && (
                  <button onClick={() => updateFilters({ search: null, page: null })} className="p-1 hover:bg-gray-200 rounded-full">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              {/* More Filters */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-40">
                  <select
                    className="w-full bg-gray-100/80 hover:bg-white border-none rounded-2xl py-3 pl-4 pr-10 text-sm font-bold text-gray-900 cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-purple-500/20"
                    value={monthFilter}
                    onChange={(e) => updateFilters({ month: e.target.value, page: null })}
                  >
                    <option value="all">All Time</option>
                    <option value={currentMonth}>This Month</option>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-2xl border-none transition-all duration-300 ${viewMode === 'grid' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-2xl border-none transition-all duration-300 ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>

                {isAuthenticated ? (
                  <Button asChild className="rounded-2xl bg-gray-900 hover:bg-black text-white px-6 font-bold shadow-lg shadow-gray-200 transition-all hover:scale-105 active:scale-95">
                    <Link href={
                      userRole === 'admin' ? '/admin-dashboard/events' :
                        userRole === 'organizer' ? '/organizer-dashboard/events' :
                          userRole === 'scanner' ? '/scanner-dashboard' :
                          '/dashboard'
                    }>
                      {userRole === 'admin' || userRole === 'organizer' || userRole === 'scanner' ? (
                        <>
                          <Settings className="w-4 h-4 mr-2" />
                          {userRole === 'scanner' ? 'Scan' : 'Manage'}
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4 mr-2" />
                          My Tickets
                        </>
                      )}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="rounded-2xl bg-gray-900 hover:bg-black text-white px-6 font-bold shadow-lg shadow-gray-200 transition-all hover:scale-105 active:scale-95">
                    <Link href="/login">
                      <Users className="w-4 h-4 mr-2" />
                      Join Now
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Events Grid */}
          <main className="pt-20 pb-24">
            {paginatedEvents.length > 0 ? (
              <div className={viewMode === 'grid' ? "events-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" : "events-grid space-y-6"}>
                {paginatedEvents.map((event) => {
                  const { coverUrl } = parseEventImages(event.image_url);
                  const progress = getProgress(event.registered_count, event.capacity);
                  const isFull = progress >= 100;
                  const isClosed = event.is_registration_open === false;

                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="group block relative perspective-container transition-all duration-700 opacity-0 translate-y-20"
                      data-event-id={event.id}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="tilt-card h-full">
                        <Card className="card-inner h-full border-none shadow-[0_4px_24px_rgba(0,0,0,0.03)] bg-white rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.12)]">
                          {/* Image Header */}
                          <div className="relative h-56 overflow-hidden">
                            {coverUrl ? (
                              <Image
                                src={coverUrl}
                                alt={event.title}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                          </div>

                          <CardContent className="p-6">
                            <div className="flex flex-col h-full">
                              {/* Status Badge */}
                              <div className="mb-3">
                                {isClosed ? (
                                  <Badge className="bg-red-50 text-red-600 border-red-100 px-2 py-0.5 text-[10px] font-bold shadow-none flex items-center gap-1 w-fit">
                                    <X className="w-2.5 h-2.5" />
                                    CLOSED
                                  </Badge>
                                ) : isFull ? (
                                  <Badge className="bg-orange-50 text-orange-600 border-orange-100 px-2 py-0.5 text-[10px] font-bold shadow-none flex items-center gap-1 w-fit">
                                    <Users className="w-2.5 h-2.5" />
                                    SOLD OUT
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-2 py-0.5 text-[10px] font-bold shadow-none flex items-center gap-1 w-fit">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    OPEN
                                  </Badge>
                                )}
                              </div>
                              {/* Title & Metadata */}
                              <div className="mb-2">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1 mb-3">
                                  {event.title}
                                </h3>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                                    {formatDateIST(event.event_date)}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                    <span className="truncate">{event.location || "Online"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Capacity Progress */}
                              <div className="mt-auto pt-6 border-t border-gray-50">
                                {event.show_capacity === true && !event.is_unlimited && (
                                  <>
                                    <div className="flex justify-between items-center mb-2.5">
                                      <span className={`text-[10px] font-black uppercase tracking-wider ${isFull ? 'text-red-500' : 'text-gray-400'}`}>
                                        {isFull ? 'Sold Out' : `${progress}% Capacity`}
                                      </span>
                                      <span className="text-xs font-bold text-gray-900">
                                        {event.registered_count || 0} <span className="text-gray-400 font-medium">/ {event.capacity}</span>
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-700 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                          }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </>
                                )}

                                <div className={`flex items-center justify-between ${event.show_capacity === true && !event.is_unlimited ? 'mt-6' : 'mt-2'}`}>
                                  <span className="text-sm font-black text-gray-900 flex items-center gap-1.5 group-hover:text-purple-600 transition-colors">
                                    {formatPrice(event)}
                                  </span>
                                  <div className={`p-2 rounded-xl bg-gray-50 group-hover:bg-purple-50 transition-colors`}>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No matching events</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  We couldn't find any events matching your selection. Try clearing your filters or checking back later.
                </p>
                <Button
                  variant="outline"
                  className="mt-8 rounded-2xl"
                  onClick={() => {
                    updateFilters({ 
                      search: null, 
                      tab: 'upcoming', 
                      category: 'all', 
                      month: 'all',
                      page: null 
                    });
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalEvents > 0 && (
              <div className="mt-20 flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="rounded-2xl border-gray-200 h-12 px-6 font-bold disabled:opacity-30 transition-all hover:bg-gray-100"
                    onClick={() => updateFilters({ page: Math.max(1, currentPage - 1).toString() })}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => updateFilters({ page: (i + 1).toString() })}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${currentPage === i + 1 ? "bg-purple-600 scale-125 shadow-lg" : "bg-gray-200 hover:bg-gray-300"
                          }`}
                      />
                    ))}
                  </div>

                  <Button
                    className="rounded-2xl bg-gray-900 hover:bg-black text-white h-12 px-6 font-bold disabled:opacity-30 shadow-lg shadow-gray-200 transition-all"
                    onClick={() => updateFilters({ page: Math.min(totalPages, currentPage + 1).toString() })}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
