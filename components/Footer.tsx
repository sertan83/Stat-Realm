export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <p>&copy; {year} StatRealm</p>
    </footer>
  );
}
