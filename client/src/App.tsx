import { Route, Switch } from 'wouter';
import Home from './pages/Home.tsx';
import NotFound from './pages/NotFound.tsx';
import { Header } from './components/Header.tsx';
import ArticleAdmin from './pages/ArticleAdmin.tsx';
import { ThemeProvider } from './context/context.tsx';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Header />
        <Switch>
          <Route path="/">
            <Home />
          </Route>
          <Route path="/admin/articles">
            <ArticleAdmin />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </div>
    </ThemeProvider>
  );
}

export default App;
