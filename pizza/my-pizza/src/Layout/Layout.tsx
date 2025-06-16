import React, { ReactNode, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './layout.module.css';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/actions';
import { RootState } from '../store/types';
import axios from 'axios';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const userLogin = useSelector((state: RootState) => state.user.userLogin);
  const dispatch = useDispatch();

  const handleClick = () => {
    navigate('/');
  };

  const handleClick2 = (to: string) => {
    navigate(to);
  };

  const pathnames = location.pathname.split('/').filter((x) => x);

  useEffect(() => {
    const currentPath = location.pathname;

    setBreadcrumbs((prev) => {
      const existingIndex = prev.indexOf(currentPath);

      if (existingIndex !== -1) {
        return prev.slice(0, existingIndex + 1);
      }

      return [...prev, currentPath];
    });
  }, [location.pathname]);

  const getBreadcrumbLabel = (path: string): string => {
    if (path === '/') return 'Главная';
    if (path === '/orders') return 'Заказы';
    if (path === '/basket') return 'Корзина';
    if (path === '/auth') return 'Авторизация';
    if (path === '/registr') return 'Регистрация';
    if (path.startsWith('/pizza/')) return 'Подробнее';
    return decodeURIComponent(path.split('/').pop() || '');
  };

  const handleClickBreadcrumb = (to: string) => {
    navigate(to);
  };

const handleLogout = async () => {
  try {
    const csrfToken = localStorage.getItem('csrfToken');

    console.log('CSRF token при выходе:', csrfToken);
    await axios.post('http://localhost:8000/logout', {},
      {
        headers: {
          'X-CSRFToken': `${csrfToken}`,
        },
        withCredentials: true,
      }
    );
    dispatch(logoutUser());
    localStorage.removeItem('csrfToken');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

  return (
    <div className={styles.main}>
      <div className={styles.header}>
        <div className={styles.left_block}>
          <button className={styles.icon} onClick={handleClick}>
            <img src="http://192.168.0.170:9000/pizza/pizza/icon.png" alt="Пицца" />
          </button>
          <nav className={styles.breadcrumbs}>
            {breadcrumbs.map((path, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isFirst = index === 0;
              const label = getBreadcrumbLabel(path);

              return isLast ? (
                <span key={path}>
                  {isFirst ? '' : ' / '}
                  {label}
                </span>
              ) : (
                <span key={path}>
                  {isFirst ? '' : ' / '}
                  <span onClick={() => handleClickBreadcrumb(path)} style={{ cursor: 'pointer' }}>{label}</span>
                </span>
              );
            })}
          </nav>
        </div>
        <div className={styles.title}>
          Пиццерия
        </div>
        <div className={styles.button}>
          {userLogin && <span className={styles.login}>{userLogin}</span>}
          {userLogin && (
            <>
              <button onClick={() => handleClick2('/orders')}>Заказы</button>
            </>
          )}
          {userLogin ? (
            <button onClick={handleLogout}>Выйти</button>
          ) : (
            <button onClick={() => handleClick2('/auth')}>Войти</button>
          )}
        </div>
      </div>
      <main>
        {children}
      </main>
      {userLogin && (
        <>
          <button onClick={() => handleClick2('/basket')} className={styles.basket}>
            <img src="http://192.168.0.170:9000/pizza/pizza/basket4.svg" alt="Корзина" className={styles.icon} />
          </button>
        </>
      )}
      <div className={styles.footer}>
        <div className={styles.footer_title}>
          @ Сайт создан студенткой группы ИС-22 Сологубовой Владой
        </div>
      </div>
    </div>
  );
};

export default Layout;