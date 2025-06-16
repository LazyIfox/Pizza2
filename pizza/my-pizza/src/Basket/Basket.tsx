import React, { useEffect, useState } from 'react';
import styles from './basket.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Pizza {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface BasketItem {
  pizza: Pizza;
  quantity: number;
}

interface Product {
  id: number;
  product: Pizza;
  quantity: number;
}

interface Order {
  id: number;
  status: string;
  products: Product[];
}

interface CookTask {
  pizza_name: string;
  pizza_image: string | null;
  pizza_id: number;
  order_id: number;
  formation_datetime: string;
  remaining_to_cook: number;
}

const Basket: React.FC = () => {
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
  const [hasDraftOrder, setHasDraftOrder] = useState<boolean>(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const draftOrderId = useSelector((state: RootState) => state.user.draftOrderId);
  const csrfToken = localStorage.getItem('csrfToken');
  const isCook = useSelector((state: RootState) => state.user.is_cook);
  const [cookTasks, setCookTasks] = useState<CookTask[]>([]);

  useEffect(() => {
    console.log("токен в корзине ", csrfToken)
    const fetchDraftOrder = async () => {
      try {
        const response = await axios.get<Order[]>('http://localhost:8000/api/orders/', {
          withCredentials: true,
        });
        const draftOrder = response.data.find(order => order.status === 'DRAFT');

        if (draftOrder) {
          const items = draftOrder.products.map(product => ({
            pizza: product.product,
            quantity: product.quantity,
          }));
          setBasketItems(items);
          setHasDraftOrder(true);
        } else {
          setHasDraftOrder(false);
        }
      } catch (error) {
        console.error('Error fetching draft order:', error);
        setHasDraftOrder(false);
      }
    };

    if (csrfToken) {
      fetchDraftOrder();
    }
  }, [csrfToken]);

  useEffect(() => {
    const fetchCookTasks = async () => {
      try {
        const response = await axios.get<CookTask[]>('http://localhost:8000/api/cook/tasks/', {
          withCredentials: true,
        });
        console.log('Cook tasks:', response.data);
        setCookTasks(response.data);
      } catch (error) {
        console.error('Ошибка при получении задач повара:', error);
      }
    };

    if (isCook) {
      fetchCookTasks();
    }
  }, [isCook]);

  const handlePlaceOrder = async () => {
    if (!draftOrderId) return;

    try {
      await axios.put(
        `http://localhost:8000/api/orders/${draftOrderId}/form/`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || '',
          },
        }
      );

      dispatch({ type: 'CLEAR_DRAFT_ORDER_ID' });

      navigate('/orders');
    } catch (error) {
      console.error('Ошибка при оформлении заказа:', error);
      alert('Не удалось оформить заказ. Попробуйте снова.');
    }
  };

  useEffect(() => {
    console.log('Обновлённый draftOrderId:', draftOrderId);
  }, [draftOrderId]);

  const handleRemovePizza = async (productId: number) => {
    if (!draftOrderId) return;

    try {
      await axios.request({
        url: `http://localhost:8000/api/orders/${draftOrderId}/remove_pizza/`,
        method: 'DELETE',
        data: { product_id: productId },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
      });

      const response = await axios.get<Order[]>(`http://localhost:8000/api/orders/`, {
        withCredentials: true,
      });

      const draftOrder = response.data.find(order => order.status === 'DRAFT');

      if (draftOrder) {
        const items = draftOrder.products.map(product => ({
          pizza: product.product,
          quantity: product.quantity,
        }));
        setBasketItems(items);
      } else {
        setHasDraftOrder(false);
      }
    } catch (error) {
      console.error('Ошибка при удалении пиццы:', error);
      alert('Не удалось удалить пиццу. Попробуйте снова.');
    }
  };

  const handleCooked = async (orderId: number, pizzaId: number) => {
    try {
      await axios.post(
        'http://localhost:8000/api/product_in_order/increment-cooked/',
        {
          order_id: orderId,
          product_id: pizzaId,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || '',
          },
        }
      );

      const response = await axios.get<CookTask[]>('http://localhost:8000/api/cook/tasks/', {
        withCredentials: true,
      });
      setCookTasks(response.data);
    } catch (error) {
      console.error('Ошибка при отправке статуса "Приготовлена":', error);
      alert('Не удалось отметить как приготовленную. Попробуйте снова.');
    }
  };

  return (
    <div className={styles.main}>
      <h1 className={styles.title}>{isCook ? 'Ваши задачи' : 'Корзина'}</h1>

      {!csrfToken ? (
        <p className={styles.emptyMessage}>
          Авторизуйтесь, чтобы получить доступ. Чтобы вернуться на главную страницу, нажмите на пиццу в левом верхнем углу.
        </p>
      ) : isCook ? (
        cookTasks.length === 0 ? (
          <p className={styles.emptyMessage}>Нет задач на приготовление.</p>
        ) : (
          cookTasks.map((item, index) => (
            <div key={index} className={styles.container}>
              <img
                src={item.pizza_image || ''}
                alt={item.pizza_name}
                className={styles.image}
              />
              <div className={styles.columnsContainer}>
                <div className={styles.leftColumn}>
                  <div className={styles.name}>
                    <p>{item.pizza_name}</p>
                  </div>
                  <div className={styles.info}>
                    <div className={styles.infoBlock}>
                      <p>Заказ №{item.order_id}</p>
                    </div>
                    <div className={styles.infoBlock2}>
                      <p><strong>{item.remaining_to_cook} шт.</strong></p>
                    </div>
                  </div>
                </div>
                <div className={styles.rightColumn}>
                  <div className={styles.time}>
                    <p>Время заказа: <br /> {new Date(item.formation_datetime).toLocaleString()}</p>
                  </div>
                  <button
                    className={styles.button}
                    onClick={() => handleCooked(item.order_id, item.pizza_id)}>
                    Приготовлена
                  </button>
                </div>
              </div>
            </div>
          ))
        )
      ) : hasDraftOrder ? (
        <>
          {basketItems.map((item, index) => (
            <div key={index} className={styles.container}>
              <img src={item.pizza.image} alt={item.pizza.name} className={styles.image} />
              <div className={styles.column}>
                <div className={styles.name}>
                  <p>{item.pizza.name}</p>
                </div>
                <div className={styles.price}>
                  <p>{item.pizza.price} рублей</p>
                </div>
              </div>
              <div className={styles.minicolumn}>
                <div className={styles.quantity}>
                  <p>{item.quantity} шт.</p>
                </div>
                <button className={styles.delete} onClick={() => handleRemovePizza(item.pizza.id)}>Удалить</button>
              </div>
            </div>
          ))}
          <div className={styles.order_contr}>
            <button className={styles.order} onClick={handlePlaceOrder}>Оформить заказ</button>
          </div>
        </>
      ) : (
        <p className={styles.emptyMessage}>Ваша корзина сейчас пуста</p>
      )}
    </div>
  );
};

export default Basket;