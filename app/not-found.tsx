import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap narrow">
      <h1>Nothing on the chart here</h1>
      <p className="lede">This page, resort or booking reference does not exist in the demo. Bookings are cleared when the server restarts.</p>
      <Link href="/" className="button button-primary">Back to all resorts</Link>
    </div>
  );
}
