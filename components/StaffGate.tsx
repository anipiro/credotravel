export function StaffGate() {
  return (
    <div className="wrap narrow gate">
      <h1>Staff order book</h1>
      <p className="lede">
        This is the part of the demo that agency staff would use: every booking request, its price build-up, and the
        buttons that confirm it.
      </p>
      <p className="notice">
        Demo only. There is no real sign-in here; the button sets a cookie so you can look around. A real panel would
        check an account and a staff role.
      </p>
      <form method="post" action="/api/staff/session">
        <button type="submit" className="button button-primary">Enter as staff (demo)</button>
      </form>
    </div>
  );
}

export function StaffBar() {
  return (
    <div className="staff-bar">
      <div className="wrap staff-bar-inner">
        <p>Staff view (demo, no real sign-in)</p>
        <form method="post" action="/api/staff/session">
          <input type="hidden" name="intent" value="leave" />
          <button type="submit" className="link-button">Leave staff view</button>
        </form>
      </div>
    </div>
  );
}
