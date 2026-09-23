import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.json(
        { error: `Google OAuth error: ${error}` },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is missing" },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth credentials are not configured" },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("YouTube OAuth user error:", userError);

      return NextResponse.redirect(
        new URL("/login?error=youtube_auth_required", request.url)
      );
    }

    const redirectUri =
      "http://localhost:3000/api/youtube/callback";

    // Exchange Google authorization code for tokens
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", tokenData);

      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 500 }
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google did not return an access token" },
        { status: 500 }
      );
    }

    // Identify the YouTube channel belonging to the connected Google account
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const channelData = await channelResponse.json();

    if (!channelResponse.ok) {
      console.error(
        "YouTube channel lookup failed:",
        channelData
      );

      return NextResponse.json(
        { error: "Failed to identify the YouTube channel" },
        { status: 500 }
      );
    }

    const channelId = channelData.items?.[0]?.id;

    if (!channelId) {
      return NextResponse.json(
        {
          error:
            "No YouTube channel was found for this Google account",
        },
        { status: 400 }
      );
    }

    // Calculate access-token expiry time
    const expiresAt = new Date(
      Date.now() +
        Number(tokenData.expires_in || 3600) * 1000
    ).toISOString();

    // Save the YouTube connection securely through Supabase RPC
    const { error: saveError } = await supabase.rpc(
      "save_youtube_connection",
      {
        input_channel_id: channelId,
        input_access_token: accessToken,
        input_refresh_token: refreshToken,
        input_expires_at: expiresAt,
      }
    );

    if (saveError) {
      console.error(
        "Failed to save YouTube connection:",
        saveError
      );

      return NextResponse.json(
        { error: "Failed to save YouTube connection" },
        { status: 500 }
      );
    }

    console.log(
      `YouTube connection saved for user ${user.id}`
    );

    return NextResponse.redirect(
      new URL("/rewards?youtube=connected", request.url)
    );
  } catch (error) {
    console.error("YouTube OAuth callback error:", error);

    return NextResponse.json(
      { error: "YouTube authorization failed unexpectedly" },
      { status: 500 }
    );
  }
}