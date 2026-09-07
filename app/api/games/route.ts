import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      microsoft_product_id,
      title,
      platform,
      image_url,
    } = body;

    if (
      !microsoft_product_id ||
      !title ||
      !platform
    ) {
      return NextResponse.json(
        {
          error: "Missing required game information",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("games")
      .upsert(
        {
          microsoft_product_id,
          title,
          platform,
          image_url: image_url ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "microsoft_product_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase game upsert error:", error);

      return NextResponse.json(
        {
          error: "Failed to save game",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      game: data,
    });
  } catch (error) {
    console.error("Game API error:", error);

    return NextResponse.json(
      {
        error: "Invalid request",
      },
      { status: 400 }
    );
  }
}