import { useEffect, useState } from 'react';
import ListPage from './pages/ListPage.jsx';
import DetailPage from './pages/DetailPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

// Navigazione con l'hash (#/regalo/123): funziona anche su GitHub Pages senza configurazioni.
function parseRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'regalo' && parts[1]) return { page: 'detail', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'admin') return { page: 'admin' };
  return { page: 'list' };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  if (route.page === 'detail') return <DetailPage id={route.id} />;
  if (route.page === 'admin') return <AdminPage />;
  return <ListPage />;
}
