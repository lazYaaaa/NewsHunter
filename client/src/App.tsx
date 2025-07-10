import { Route, Switch } from 'wouter';



import Home from './pages/Home.tsx';
import NotFound from './pages/NotFound.tsx';
import { Header } from './components/Header.tsx';
import ArticleAdmin from './pages/ArticleAdmin.tsx';
import Login from './pages/Login.tsx'; 
import Register from './pages/Register.tsx'; 
import Profile from './pages/Profile.tsx';
import { ThemeProvider } from './context/context.tsx';
import { UserProvider } from './context/UserContext.tsx';

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Header />
        <Switch>
          <Route path="/">
            <Home />
          </Route>
          <Route path="/admin/articles">
            <ArticleAdmin />
          </Route>
          {/* Новые маршруты */}
          <Route path="/login">
            <Login />
          </Route>
          <Route path="/register">
            <Register />
          </Route>
          <Route path = '/profile'>
            <Profile />
          </Route>
          {/* Обработка 404 */}
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </div>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
