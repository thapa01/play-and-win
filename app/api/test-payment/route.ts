import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { tournamentId } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { error: "Tournament ID is required." },
        { status: 400 }
      );
    }

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: "Tournament not found." },
        { status: 404 }
      );
    }

    // Check existing registration
    const { data: existingRegistration } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournament.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingRegistration) {
      return NextResponse.json(
        { error: "You are already registered for this tournament." },
        { status: 400 }
      );
    }

    // Create test payment
    const testTransactionId = `TEST-${Date.now()}`;

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        tournament_id: tournament.id,
        amount: tournament.entry_fee,
        payment_method: "test",
        transaction_id: testTransactionId,
        status: "paid",
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error(paymentError);

      return NextResponse.json(
        { error: "Unable to create payment." },
        { status: 500 }
      );
    }

    // Create tournament registration
    const { error: registrationError } = await supabase
      .from("tournament_registrations")
      .insert({
        tournament_id: tournament.id,
        user_id: user.id,
        status: "registered",
      });

    if (registrationError) {
      console.error(registrationError);

      // Remove test payment if registration failed
      await supabase
        .from("payments")
        .delete()
        .eq("id", payment.id);

      return NextResponse.json(
        { error: "Payment succeeded but registration failed." },
        { status: 500 }
      );
    }

    // Increase registered player count
    await supabase
      .from("tournaments")
      .update({
        registered_players: tournament.registered_players + 1,
      })
      .eq("id", tournament.id);

    return NextResponse.json({
      success: true,
      transactionId: testTransactionId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}