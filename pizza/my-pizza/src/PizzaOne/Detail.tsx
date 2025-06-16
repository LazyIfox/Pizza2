import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './detail.module.css';
import axios  from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../store/types';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

interface Pizza {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  cook: string;
}

interface AddToDraftResponse {
  message: string;
  order_id: number;
}

const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pizza, setPizza] = useState<Pizza | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const draftOrderId = useSelector((state: RootState) => state.user.draftOrderId);
  const navigate = useNavigate();
  const isCook = useSelector((state: RootState) => state.user.is_cook);

  useEffect(() => {
    if (!id) return;

    const fetchPizza = async () => {
      try {
        const response = await axios.get<Pizza>(`http://localhost:8000/api/pizzas/${id}/`);
        setPizza(response.data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    fetchPizza();
  }, [id]);

  const dispatch = useDispatch();

  const handleAddToCart = async () => {
    if (!pizza) return;

    const csrfToken = localStorage.getItem('csrfToken');
    if (!csrfToken) {
      navigate('/auth');
      return;
    }

    try {
      const response = await axios.post<AddToDraftResponse>(
        `http://localhost:8000/api/orders/add_to_draft/`,
        {
          product_id: pizza.id,
          quantity: 1,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || '',
          },
        }
      );
      const newOrderId = response.data?.order_id;

      if (draftOrderId === 0 && newOrderId) {
        dispatch({
          type: 'UPDATE_DRAFT_ORDER_ID',
          payload: newOrderId,
        });

      console.log('Обновлённый draftOrderId:', newOrderId);
    }

      navigate('/basket');
    } catch (err) {
      setError('Ошибка при добавлении пиццы в корзину');
    }
  };

  if (!pizza) return <p>Пицца не найдена</p>;

  return (
    <div>
      <p className={styles.title}>{pizza.name}</p>
      <div className={styles.container}>
        <div className={styles.image_pizza}>
          <img src={pizza.image} alt={pizza.name} className={styles.image} />
        </div>
        <div className={styles.info_box}>
          <h2 className={styles.text}>Описание</h2>
          <div className={styles.cook_info}>
            <p className={styles.description}>{pizza.description}</p>
            <p className={styles.price}>Цена: {pizza.price} руб.</p>
            {!isCook && (
              <p className={styles.cook_name}>Повар: {pizza.cook}</p>
            )}
          </div>
          {!isCook && (
            <div>
              <button className={styles.button} onClick={handleAddToCart}>Добавить в корзину</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Detail;