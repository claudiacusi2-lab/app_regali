export default function TopBar({ children }) {
  return (
    <header className="topbar">
      <a className="brand" href="#/">★ wishlist</a>
      <div className="row">{children}</div>
    </header>
  );
}
