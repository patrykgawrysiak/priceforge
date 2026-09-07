"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import playstationLogo from "../img/NicePng_ps4-logo-png_61508.png";
import playstationWordmark from "../img/priceforgeps.png";
import xboxLogo from "../img/NicePng_xbox-logo-png_9962.png";
import xboxWordmark from "../img/priceforgexbox.png";

const games = {
  xbox: [
    {
      id: 1,
      title: "Forza Horizon 5",
      platform: "Xbox",
      price: "£24.99",
      originalPrice: "£49.99",
      discount: "-50%",
      rating: "Excellent price",
      lowestPrice: "£19.99",
    },
    {
      id: 2,
      title: "Grand Theft Auto V",
      platform: "Xbox",
      price: "£19.99",
      originalPrice: "£39.99",
      discount: "-50%",
      rating: "Good price",
      lowestPrice: "£14.99",
    },
    {
      id: 3,
      title: "Minecraft",
      platform: "Xbox",
      price: "£14.99",
      originalPrice: "£19.99",
      discount: "-25%",
      rating: "Good price",
      lowestPrice: "£9.99",
    },
  ],

  playstation: [
    {
      id: 4,
      title: "EA Sports FC 26",
      platform: "PlayStation",
      price: "£49.99",
      originalPrice: "£69.99",
      discount: "-29%",
      rating: "High price",
      lowestPrice: "£34.99",
    },
    {
      id: 5,
      title: "Grand Theft Auto V",
      platform: "PlayStation",
      price: "£19.99",
      originalPrice: "£39.99",
      discount: "-50%",
      rating: "Good price",
      lowestPrice: "£14.99",
    },
    {
      id: 6,
      title: "God of War Ragnarök",
      platform: "PlayStation",
      price: "£39.99",
      originalPrice: "£69.99",
      discount: "-43%",
      rating: "Fair price",
      lowestPrice: "£29.99",
    },
  ],
};

const priceHistory = [
  { date: "Apr", price: 34.99 },
  { date: "May", price: 29.99 },
  { date: "Jun", price: 39.99 },
  { date: "Jul", price: 24.99 },
  { date: "Aug", price: 21.99 },
  { date: "Sep", price: 19.99 },
];

const buyVerdicts = [
  { verdict: "Based on recent price trends, this is the perfect time to buy", color: "text-green-400" },
];

type Game = (typeof games.xbox)[number];

export default function Home() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<"xbox" | "playstation">("xbox");
  const [selectedGame, setSelectedGame] = useState<any | null>(null);

  const [xboxGames, setXboxGames] = useState<any[]>([]);
  const [isSearchingXbox, setIsSearchingXbox] = useState(false);


 const platformGames = games[platform];

  const isXbox = platform === "xbox";
  const priceForgeLogo = isXbox ? xboxWordmark : playstationWordmark;

  const testSaveGame = async () => {
    console.log("TEST BUTTON CLICKED");

    const response = await fetch("/api/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        microsoft_product_id: "TEST-123",
        title: "Test Game",
        platform: "Xbox",
        image_url: null,
      }),
    });

    const data = await response.json();

    console.log("Save game result:", data);
  };

  const filteredGames =
    platform === "xbox" && search.trim()
      ? xboxGames.slice(0, 8)
      : platformGames
          .filter((game) =>
            game.title
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .slice(0, 8);

  useEffect(() => {
    if (platform !== "xbox" || !search.trim()) {
      setXboxGames([]);
      return;
    }

    const controller = new AbortController();

    const searchXbox = async () => {
      try {
        setIsSearchingXbox(true);

        // ─────────────────────────────
        // STEP 1
        // Get Microsoft's autosuggest results
        // ─────────────────────────────

        const suggestResponse = await fetch(
          `/api/xbox/suggest?q=${encodeURIComponent(search)}`,
          {
            signal: controller.signal,
          }
        );

        if (!suggestResponse.ok) {
          throw new Error("Xbox suggestion search failed");
        }

        const suggestData =
          await suggestResponse.json();

        const suggestions =
          suggestData.games ?? [];

        // ─────────────────────────────
        // STEP 2
        // Search the broader Xbox catalogue
        // ─────────────────────────────

        const catalogueResponse = await fetch(
          `/api/xbox/catalogue?q=${encodeURIComponent(search)}`,
          {
            signal: controller.signal,
          }
        );

        if (!catalogueResponse.ok) {
          throw new Error("Xbox catalogue search failed");
        }

        const catalogueData =
          await catalogueResponse.json();

        const catalogueGames =
          catalogueData.games ?? [];

        // ─────────────────────────────
        // STEP 3
        // Merge both result sets
        // ─────────────────────────────

        const merged = new Map();

        // Autosuggest gets priority.
        for (const game of suggestions) {
          if (game?.id) {
            merged.set(game.id, {
              ...game,
              source: "suggest",
            });
          }
        }

        // Add catalogue results that
        // autosuggest didn't return.
        for (const game of catalogueGames) {
          if (game?.id && !merged.has(game.id)) {
            merged.set(game.id, {
              ...game,
              source: "catalogue",
            });
          }
        }

        const candidates = Array.from(
          merged.values()
        );

        if (candidates.length === 0) {
          setXboxGames([]);
          return;
        }

        // ─────────────────────────────
        // STEP 4
        // Rank results
        // ─────────────────────────────

        const normalizedQuery =
          search
            .trim()
            .toLowerCase();

        const ranked = candidates
          .map((game: any, index: number) => {
            const title =
              game.title
                ?.toLowerCase() ?? "";

            const edition =
              game.edition
                ?.toLowerCase() ?? "";

            let score = 0;

            // Exact title match
            if (title === normalizedQuery) {
              score += 1000;
            }

            // Title starts with query
            if (
              title.startsWith(
                normalizedQuery
              )
            ) {
              score += 500;
            }

            // Query appears in title
            if (
              title.includes(
                normalizedQuery
              )
            ) {
              score += 250;
            }

            // Query appears in edition
            if (
              edition.includes(
                normalizedQuery
              )
            ) {
              score += 100;
            }

            // Preserve Microsoft's autosuggest
            // results above catalogue-only results.
            if (game.source === "suggest") {
              score += 50;
            }

            // Earlier Microsoft results get
            // a slight priority.
            score += Math.max(
              0,
              20 - index
            );

            return {
              ...game,
              score,
            };
          })
          .sort(
            (a: any, b: any) =>
              b.score - a.score
          );

        // ─────────────────────────────
        // STEP 5
        // Limit candidates
        // ─────────────────────────────

        const limited =
          ranked.slice(0, 15);

        // ─────────────────────────────
        // STEP 6
        // Get exact product details
        // ─────────────────────────────

        const ids = limited
          .map((game: any) => game.id)
          .filter(Boolean)
          .join(",");

        if (!ids) {
          setXboxGames([]);
          return;
        }

        const detailsResponse = await fetch(
          `/api/xbox/details?ids=${encodeURIComponent(ids)}`,
          {
            signal: controller.signal,
          }
        );

        if (!detailsResponse.ok) {
          throw new Error(
            "Xbox product details failed"
          );
        }

        const detailsData =
          await detailsResponse.json();

        const detailGames =
          detailsData.games ?? [];

        // ─────────────────────────────
        // STEP 7
        // Preserve our ranking
        // ─────────────────────────────

        const gamesById = new Map(
          detailGames.map(
            (game: any) => [
              game.id,
              game,
            ]
          )
        );

        const finalGames = limited
          .map((candidate: any) => {
            const detailed =
              gamesById.get(candidate.id);

            if (!detailed) {
              return null;
            }

            return {
              ...detailed,

              // Use Microsoft's autosuggest title.
              // This is the clean, user-facing name.
              title: candidate.title,

              // Keep the same title available as the
              // display/edition name for now.
              edition: candidate.title,

              searchScore:
                candidate.score,
            };
          })
          .filter(Boolean);

        setXboxGames(finalGames);

        setXboxGames(finalGames);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error(
            "Xbox search failed:",
            error
          );

          setXboxGames([]);
        }
      } finally {
        setIsSearchingXbox(false);
      }
    };

    const timeout = setTimeout(
      searchXbox,
      300
    );

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search, platform]);


  return (
    <main className={`min-h-screen overflow-hidden bg-[#090a0a] text-white ${isXbox ? "[--accent:#c8f56a] [--accent-rgb:200,245,106]" : "[--accent:#70a7ff] [--accent-rgb:112,167,255]"}`}>
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#090a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="#" className="flex items-center gap-3" aria-label="PriceForge home">
            <Image
              src={priceForgeLogo}
              alt="PriceForge"
              width={160}
              height={60}
              className="h-10 w-30 object-fill transition-opacity duration-500"
            />
          </a>
        </div>
      </header>

                <button onClick={testSaveGame}>
              Test Save Game
            </button>

      {/* Hero */}
      <section className="relative mx-auto flex max-w-7xl flex-col items-center px-5 pb-20 pt-10 text-center sm:px-8 sm:pb-24 sm:pt-16">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-[rgba(var(--accent-rgb),0.07)] blur-3xl transition-colors duration-500" />
        <div className="relative">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Advanced game shopping
          </p>
          <h2 className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-white sm:text-7xl">
            Stop overpaying
            <br />
            for games.
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            Track Xbox and PlayStation prices through historical data analysis,
            and know when it&apos;s the perfect time to buy.
          </p>
        </div>

        {/* Platform Selector */}
        <div className="relative mt-10 flex w-full max-w-md rounded-xl border border-[rgba(var(--accent-rgb),0.35)] bg-white/[0.035] p-1.5 shadow-[0_0_24px_rgba(var(--accent-rgb),0.08)] transition-colors duration-500">
          <button
            onClick={() => setPlatform("xbox")}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-4 text-sm font-semibold transition-all duration-300 ${
              platform === "xbox"
                ? "bg-[#c8f56a] text-[#10120d] shadow-[0_4px_18px_rgba(200,245,106,0.18)]"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center">
              <Image
                src={xboxLogo}
                alt=""
                aria-hidden="true"
                width={14}
                height={14}
                className="h-5 w-5 object-contain"
              />
            </span>
          </button>

          <button
            onClick={() => setPlatform("playstation")}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              platform === "playstation"
                ? "bg-[#70a7ff] text-[#08101d] shadow-[0_4px_18px_rgba(112,167,255,0.2)]"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center">
              <Image
                src={playstationLogo}
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-5 w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.045] shadow-xl shadow-black/10">
            <label htmlFor="game-search" className="sr-only">
              Search for a game
            </label>

            {/* Search Input */}
            <div className="relative h-[54px] overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.045] shadow-xl shadow-black/10">
              <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-zinc-500">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </div>

              <input
                id="game-search"
                type="text"
                placeholder="Search your next game..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-full w-full border-0 bg-transparent pl-12 pr-5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:bg-white/[0.07] focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.08)]"
              />
            </div>

          {/* Search Results */}
          {search.trim() && (
            <div className="border-t border-white/[0.08] bg-[#111313]">
          {isSearchingXbox && platform === "xbox" ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-zinc-500">
                Searching Xbox Store...
              </p>
            </div>
          ) : filteredGames.length > 0 ? (
            <div className="overflow-hidden">
              {filteredGames.map((game) => {
                const verdict =
                  game.discount >= 40
                    ? {
                        label: "Great time",
                        className:
                          "border-green-400/20 bg-green-400/[0.08] text-green-400",
                      }
                    : game.discount >= 20
                      ? {
                          label: "Good time",
                          className:
                            "border-green-400/20 bg-green-400/[0.06] text-green-400",
                        }
                      : game.discount > 0
                        ? {
                            label: "Worth waiting",
                            className:
                              "border-yellow-400/20 bg-yellow-400/[0.06] text-yellow-400",
                          }
                        : {
                            label: "Wait for sale",
                            className:
                              "border-red-400/20 bg-red-400/[0.06] text-red-400",
                          };

                return (
                  <button
                    key={game.id}
                    onClick={() => {
                      setSelectedGame(game);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-4 border-b border-white/[0.06] px-5 py-3.5 text-left transition last:border-b-0 hover:bg-white/[0.04]"
                  >
                    {/* Game artwork */}
                    {game.image ? (
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                        <Image
                          src={game.image}
                          alt=""
                          width={40}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-14 w-10 shrink-0 rounded-lg bg-zinc-900" />
                    )}

                    {/* Game name & edition */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {game.title}
                      </p>

                      {game.edition &&
                        game.edition !== game.title &&
                        game.edition.toLowerCase() !==
                          game.title.toLowerCase().split(" ").pop() && (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {game.edition}
                          </p>
                        )}
                    </div>

                    {/* Verdict */}
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${verdict.className}`}
                    >
                      {verdict.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-zinc-400">
                No games found
              </p>
            </div>
          )}
            </div>
          )}
        </div>
      </section>

      {/* Game Details */}
      {selectedGame && (
        <section className="mx-auto mt-0 max-w-4xl px-5 sm:px-8">
          <div className="rounded-3xl border border-[rgba(var(--accent-rgb),0.3)] bg-[#111313] p-6 shadow-[0_0_30px_rgba(var(--accent-rgb),0.07)] transition-colors duration-500 sm:p-8">
            <div className="grid gap-8 sm:grid-cols-[220px_1fr]">

              {/* Game Artwork */}
              <div className="relative aspect-[15/15] overflow-hidden rounded-2xl bg-zinc-900">
                {selectedGame.image ? (
                  <Image
                    src={selectedGame.image}
                    alt={selectedGame.title}
                    fill
                    className="object-cover"
                    sizes="220px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-zinc-600">
                      No artwork
                    </p>
                  </div>
                )}
              </div>

              {/* Game Information */}
              <div className="flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {selectedGame.platform}
                </p>

                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {selectedGame.title}
                </h2>

                <div className="mt-8">
                  <p className="text-4xl font-bold text-white">
                    £{selectedGame.price.toFixed(2)}
                  </p>

                  <div className="mt-1 flex items-center gap-3">
                    <p className="text-sm text-zinc-500 line-through">
                      £{selectedGame.originalPrice.toFixed(2)}
                    </p>

                    <p className="text-sm font-semibold text-green-400">
                      -{selectedGame.discount}%
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-zinc-900 px-5 py-4">
                  <p className="font-medium text-white">
                    🟢 {selectedGame.rating}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-600">
                      Lowest ever
                    </p>

                    <p className="mt-1 font-medium text-white">
                    {selectedGame.lowestPrice !== null
                      ? `£${selectedGame.lowestPrice.toFixed(2)}`
                      : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-600">
                      Current discount
                    </p>

                    <p className="mt-1 font-medium text-white">
                      {selectedGame.discount > 0
                        ? `${selectedGame.discount}% off`
                        : "No discount"}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Price History */}
      {selectedGame && (
        <section className="mx-auto mt-6 max-w-4xl px-5 sm:px-8">
        <div className="rounded-3xl border border-[rgba(var(--accent-rgb),0.3)] bg-[#111313] p-6 shadow-[0_0_30px_rgba(var(--accent-rgb),0.07)] transition-colors duration-500 sm:p-8">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Price History
              </p>

              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Price over time
              </h3>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-600">
                Current price
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                {selectedGame.price}
              </p>
            </div>
          </div>

            <div className="mt-8 h-72 rounded-2xl bg-zinc-900 p-4">
              <svg
                viewBox="0 0 600 240"
                className="h-full w-full"
                preserveAspectRatio="none"
              >
                {/* Horizontal guide lines */}
                {[0, 1, 2, 3, 4].map((line) => {
                  const y = 200 - line * 40;

                  return (
                    <line
                      key={line}
                      x1="40"
                      y1={y}
                      x2="580"
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Price line */}
                <polyline
                  points={priceHistory
                    .map((point, index) => {
                      const x = 40 + index * 108;
                      const y = 200 - (point.price / 40) * 160;

                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Price points */}
                {priceHistory.map((point, index) => {
                  const x = 40 + index * 108;
                  const y = 200 - (point.price / 40) * 160;

                  return (
                    <circle
                      key={point.date}
                      cx={x}
                      cy={y}
                      r="5"
                      fill="var(--accent)"
                    />
                  );
                })}

                {/* Date labels */}
                {priceHistory.map((point, index) => {
                  const x = 40 + index * 108;

                  return (
                    <text
                      key={point.date}
                      x={x}
                      y="225"
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.35)"
                      fontSize="11"
                    >
                      {point.date}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
      </section>
      )}

        {/* Buy Verdicts */}
        {selectedGame && (
          <section className="mx-auto mt-6 max-w-4xl px-5 pb-10 sm:px-8">
            <div className="rounded-3xl border border-white/[0.08] bg-[#111313] p-6 shadow-2xl sm:p-8">

              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Verdict / AI Analysis
              </p>

              <p className={`mt-3 text-sm font-medium ${buyVerdicts[0].color}`}>
                {buyVerdicts[0].verdict}
              </p>

            </div>
          </section>
        )}


    </main>
  );
}