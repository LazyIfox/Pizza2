import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './user.module.css';
import { useNavigate } from 'react-router-dom';

const Registration: React.FC = () => {
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false); 
  const navigate = useNavigate();
    
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleClick = (to: string) => {
    navigate(to);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/register/', {
        username: login,
        password: password,
      });
      if (response.status === 201) {
        navigate('/auth');
      }
    } catch (err) {
      setError('Такой пользователь уже существует');
    }
  };

  return (
    <div className={styles.main}>
        <span className={styles.title} >Регистрация</span>
        <form  onSubmit={handleSubmit}>
            <div className={styles.input}>
              <span className={styles.text} >Логин</span>
              <input type="text" id="login" name="login" value={login} onChange={(e) => setLogin(e.target.value)}/>
            </div>
              <div className={styles.input}>
                <span className={styles.text} >Пароль</span>
              <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            </div>
             {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.register_button}>
              Зарегистрироваться
            </button>
        </form>
        <p className={styles.login_link} onClick={() => handleClick('/auth')}>
            Или нажмите здесь, чтобы авторизоваться
        </p>
    </div>
  );
};

export default Registration;