import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux'
import styles from './user.module.css';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../store/actions';

interface LoginResponse {
  message: string;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_cook: boolean;
  csrf_token: string;
  draft_order_id: number;
}

const Authorization: React.FC = () => {
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string>('');

  const handleClick = (to: string) => {
    navigate(to);
  };

  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  }

const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  try {
    const response = await axios.post<LoginResponse>('http://localhost:8000/login', {
      username: login,
      password: password,
    }, { withCredentials: true });

    if (response.status === 200) {
      const csrfToken = getCookie('csrftoken');
      console.log('CSRF token после логина:', csrfToken);

      const { username, is_staff, is_superuser, is_cook, draft_order_id } = response.data;

      localStorage.setItem('csrfToken', csrfToken ?? '');
      dispatch(loginUser(username, is_staff, is_superuser, is_cook, draft_order_id));

      navigate('/');
    }
  } catch (err) {
    setError('Некорректный логин или пароль!');
  }
};

  return (
    <div className={styles.main}>
      <span className={styles.title}>Авторизация</span>
      <form onSubmit={handleSubmit}>
        <div className={styles.input}>
          <span className={styles.text}>Логин</span>
          <input
            type="text"
            id="login"
            name="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </div>
        <div className={styles.input}>
          <span className={styles.text}>Пароль</span>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.register_button}>
          Войти
        </button>
      </form>
      <p className={styles.login_link} onClick={() => handleClick('/registr')}>
        Или нажмите здесь, чтобы зарегистрироваться
      </p>
    </div>
  );
};

export default Authorization;