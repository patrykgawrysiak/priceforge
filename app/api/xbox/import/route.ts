import { NextResponse } from "next";
import { supabaseServer } from "@/lib/supabase/server";

const MARKET = "GB";
const LANGUAGE = "en-GB";

const LISTS = [
  "TopPaid",
  "TopFree",
  "New",
  "BestRated",
  "MostPlayed",
  "ComingSoon",
];

const PAGE_SIZE = 2000;

export async function POST() {
  try {
    const productIds = new Set<string>();

    // ---------------------------------------------------------
    // STEP 1
    // Collect Xbox game IDs from Microsoft's catalogue lists
    // ---------------------------------------------------------

    for (const list of LISTS) {
      let skipItems = 0;

      while (true) {
        const params = new URLSearchParams({
          Market: MARKET,
          Language: LANGUAGE,
          ItemTypes: "Game",
          deviceFamily: "Windows.Xbox",
          count: String(PAGE_SIZE),
          skipItems: String(skipItems),
        });

        const url =
          `https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/${list}?${params.toString()}`;

        console.log(
          `Fetching ${list} starting at ${skipItems}...`
        );

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          const text = await response.text();

          console.error(
            `Xbox ${list} list failed:`,
            response.status,
            text
          );

          break;
        }

        const data = await response.json();

        const items = data?.Items ?? [];

        console.log(
          `${list}: received ${items.length} items`
        );

        for (const item of items) {
          if (item?.Id) {
            productIds.add(item.Id);
          }
        }

        const totalItems =
          data?.PagingInfo?.TotalItems ?? 0;

        skipItems += items.length;

        if (
          items.length === 0 ||
          skipItems >= totalItems
        ) {
          break;
        }
      }
    }

    const ids = Array.from(productIds);

    console.log(
      `Collected ${ids.length} unique Xbox product IDs`
    );

    // ---------------------------------------------------------
    // STEP 2
    // Microsoft Display Catalog accepts multiple IDs at once.
    // Resolve them in small batches.
    // ---------------------------------------------------------

    const games = [];

    const BATCH_SIZE = 20;

    for (
      let index = 0;
      index < ids.length;
      index += BATCH_SIZE
    ) {
      const batch = ids.slice(
        index,
        index + BATCH_SIZE
      );

      const params = new URLSearchParams({
        market: MARKET,
        languages: LANGUAGE,
        bigIds: batch.join(","),
        fieldsTemplate: "details",
      });

      const url =
        `https://displaycatalog.mp.microsoft.com/v7.0/products?${params.toString()}`;

      console.log(
        `Fetching product details ${index + 1}-${Math.min(
          index + BATCH_SIZE,
          ids.length
        )} of ${ids.length}`
      );

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text();

        console.error(
          "Microsoft product details failed:",
          response.status,
          text
        );

        continue;
      }

      const data = await response.json();

      const products = data?.Products ?? [];

      for (const product of products) {
        const localized =
          product?.LocalizedProperties?.[0];

        const productId =
          product?.ProductId;

        if (!productId) {
          continue;
        }

        const title =
          localized?.ProductTitle ||
          product?.Properties?.ProductGroupName ||
          null;

        if (!title) {
          continue;
        }

        const images =
          localized?.Images ?? [];

        const boxArt =
          images.find(
            (image: any) =>
              image?.ImagePurpose === "BoxArt"
          )?.Uri ??
          images.find(
            (image: any) =>
              image?.ImagePurpose === "Poster"
          )?.Uri ??
          null;

        games.push({
          microsoft_product_id: productId,
          title,
          platform: "Xbox",
          image_url: boxArt
            ? `https:${boxArt}`
            : null,
        });
      }
    }

    console.log(
      `Resolved ${games.length} games`
    );

    // ---------------------------------------------------------
    // STEP 3
    // Upsert catalogue into Supabase
    // ---------------------------------------------------------

    const SUPABASE_BATCH_SIZE = 500;

    let saved = 0;

    for (
      let index = 0;
      index < games.length;
      index += SUPABASE_BATCH_SIZE
    ) {
      const batch = games.slice(
        index,
        index + SUPABASE_BATCH_SIZE
      );

      const { error } = await supabaseServer
        .from("games")
        .upsert(batch, {
          onConflict: "microsoft_product_id",
        });

      if (error) {
        console.error(
          "Supabase catalogue upsert failed:",
          error
        );

        return NextResponse.json(
          {
            error: "Failed to save catalogue",
            details: error.message,
            saved,
          },
          { status: 500 }
        );
      }

      saved += batch.length;

      console.log(
        `Saved ${saved}/${games.length} games`
      );
    }

    return NextResponse.json({
      success: true,
      discovered: ids.length,
      resolved: games.length,
      saved,
    });
    } catch (error) {
    console.error("Xbox catalogue importer failed:", error);

    throw error;
  }
}
