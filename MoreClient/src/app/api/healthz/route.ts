export async function GET() {
  return new Response(JSON.stringify({ status: "ok", service: "moreclient-web" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
