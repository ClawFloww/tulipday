import { supabase } from "@/lib/supabase";
import { Location } from "@/lib/types";
import { LocationDetailClient } from "./LocationDetailClient";

export default async function LocationDetailPage({ params }: { params: { slug: string } }) {
  const { data } = await supabase
    .from("locations")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

<<<<<<<< HEAD:app/location/[slug]/page.tsx
  return <LocationDetailClient location={(data ?? null) as Location | null} />;
========
const CROWD_KEYS = ["crowd_very_quiet", "crowd_quiet", "crowd_moderate", "crowd_busy", "crowd_very_busy"];
const CROWD_COLORS = ["bg-forest-500", "bg-forest-400", "bg-yellow-400", "bg-orange-400", "bg-tulip-500"];

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-warm rounded-2xl p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-bold text-[#1A1A1A] leading-snug">{value}</p>
      {sub && <p className="text-xs text-gray-500 leading-snug">{sub}</p>}
    </div>
  );
}

export default function LocationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();
  const { t }    = useT();

  const [location, setLocation] = useState<Location | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [imgError, setImgError] = useState(false);

  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=1200";

  useEffect(() => {
    if (!slug) return;
    supabase.from("locations").select("*").eq("slug", slug).eq("is_active", true).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setLocation(data);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!location) return;
    const sessionId = getOrCreateSessionId();
    supabase.from("saved_items").select("id")
      .eq("session_id", sessionId).eq("item_type", "location").eq("item_id", location.id)
      .maybeSingle().then(({ data }) => setSaved(!!data));
  }, [location]);

  async function handleSave() {
    if (!location || saving) return;
    setSaving(true);
    const sessionId = getOrCreateSessionId();
    if (saved) {
      await supabase.from("saved_items").delete()
        .eq("session_id", sessionId).eq("item_type", "location").eq("item_id", location.id);
      setSaved(false);
    } else {
      await supabase.from("saved_items").insert({ session_id: sessionId, item_type: "location", item_id: location.id });
      setSaved(true);
    }
    setSaving(false);
  }

  function handleNavigate() {
    if (!location?.latitude || !location?.longitude) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`, "_blank");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-tulip-400 animate-spin" />
          <p className="text-sm text-gray-400">{t("location.loading")}</p>
        </div>
      </div>
    );
  }

  if (notFound || !location) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-5xl">🌷</span>
        <h2 className="text-xl font-bold text-[#1A1A1A]">{t("location.not_found_title")}</h2>
        <p className="text-sm text-gray-400">{t("location.not_found_desc")}</p>
        <button onClick={() => router.back()} className="px-5 py-2.5 bg-tulip-500 text-white rounded-xl text-sm font-bold">
          {t("common.go_back")}
        </button>
      </div>
    );
  }

  const catStyle = CATEGORY_STYLE[location.category];
  const crowdIdx = Math.min((location.crowd_score ?? 1) - 1, 4);

  const accessMap: Record<AccessType, { label: string; desc: string }> = {
    roadside_only:     { label: t("access.roadside"), desc: t("access.roadside_desc") },
    public_access:     { label: t("access.public"),   desc: t("access.public_desc")   },
    private_view_only: { label: t("access.private"),  desc: t("access.private_desc")  },
  };
  const access = location.access_type ? accessMap[location.access_type] : null;

  const etiquetteRules = [
    { emoji: "🌷", rule: t("location.etiquette_rule1") },
    { emoji: "🚷", rule: t("location.etiquette_rule2") },
    { emoji: "🚗", rule: t("location.etiquette_rule3") },
    { emoji: "📸", rule: t("location.etiquette_rule4") },
    { emoji: "🔇", rule: t("location.etiquette_rule5") },
    { emoji: "🗑️", rule: t("location.etiquette_rule6") },
  ];

  return (
    <div className="min-h-screen bg-white pb-32">

      <div className="relative h-72 sm:h-96 overflow-hidden bg-gray-200">
        <Image
          src={imgError ? fallback : (location.image_url ?? fallback)}
          alt={location.title}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
        <button onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        {location.bloom_status && (
          <div className="absolute bottom-4 left-4"><BloomBadge status={location.bloom_status} /></div>
        )}
        {location.photo_score != null && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {Array.from({ length: location.photo_score }).map((_, i) => (
              <Star key={i} size={11} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-6">

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${catStyle.bg} ${catStyle.color}`}>
              <Flower2 size={11} /> {t(`category.${location.category}`)}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] leading-tight mb-1">{location.title}</h1>
          {location.address && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin size={13} className="text-tulip-400 flex-shrink-0" /> {location.address}
            </p>
          )}
          {location.photo_score != null && (
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className={i < location.photo_score! ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
              ))}
              <span className="text-xs text-gray-400 ml-1 font-medium">{t("location.photo_score")}</span>
            </div>
          )}
        </div>

        {location.short_description && (
          <p className="text-gray-600 text-[15px] leading-relaxed">{location.short_description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {location.best_visit_time && (
            <InfoCard icon={<Clock size={15} />} label={t("location.best_time")} value={location.best_visit_time} />
          )}
          {location.parking_info && (
            <InfoCard
              icon={<ParkingCircle size={15} />}
              label={t("location.parking")}
              value={location.parking_info.split(".")[0]}
              sub={location.parking_info.includes(".") ? location.parking_info.slice(location.parking_info.indexOf(".") + 1).trim() : undefined}
            />
          )}
          {access && (
            <InfoCard icon={<Footprints size={15} />} label={t("location.access")} value={access.label} sub={access.desc} />
          )}
          {location.flower_type && (
            <InfoCard
              icon={<Flower2 size={15} />}
              label={t("location.flower_type")}
              value={location.flower_type.split(",").map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1)).join(", ")}
            />
          )}
        </div>

        {location.crowd_score != null && (
          <div className="bg-warm rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Users size={15} />
              <span className="text-xs font-semibold uppercase tracking-wide">{t("location.crowd_level")}</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${i < location.crowd_score! ? CROWD_COLORS[crowdIdx] : "bg-gray-200"}`} />
              ))}
            </div>
            <p className="text-sm font-bold text-[#1A1A1A]">{t(`location.${CROWD_KEYS[crowdIdx]}`)}</p>
          </div>
        )}

        {(location.category === "photo_spot" || (location.photo_score ?? 0) >= 4) && (
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={16} className="text-blue-600" />
              <h3 className="text-sm font-extrabold text-blue-900">{t("location.photography_tips")}</h3>
            </div>
            <ul className="space-y-2">
              {(["tip_golden_hour", "tip_wide_angle", "tip_overcast", "tip_low_angle"] as const).map((key) => (
                <li key={key} className="flex items-start gap-2 text-xs text-blue-800">
                  <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t(`location.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {location.full_description && (
          <div>
            <h2 className="text-base font-extrabold text-[#1A1A1A] mb-2">{t("location.about")}</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">{location.full_description}</p>
          </div>
        )}

        <div className="bg-tulip-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-tulip-600" />
            <h3 className="text-sm font-extrabold text-tulip-900">{t("location.etiquette_title")}</h3>
          </div>
          <ul className="space-y-3">
            {etiquetteRules.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{item.emoji}</span>
                <p className="text-xs text-tulip-800 leading-snug">{item.rule}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={handleNavigate}
            disabled={!location.latitude}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                       bg-tulip-500 text-white font-bold text-sm shadow-md shadow-tulip-200
                       hover:bg-tulip-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Navigation size={17} /> {t("common.navigate")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98]
                        ${saved ? "bg-tulip-500 border-tulip-500 text-white shadow-md shadow-tulip-200" : "bg-white border-tulip-200 text-tulip-500 hover:border-tulip-400"}`}
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Heart size={17} className={saved ? "fill-white" : ""} />}
            {saved ? t("common.saved") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
>>>>>>>> origin/main:app/[locale]/location/[slug]/LocationDetailClient.tsx
}
